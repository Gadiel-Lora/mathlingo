"""Academic routes: curriculum, exercises, and AI tutor support."""
from __future__ import annotations

import logging
import re
from typing import Any

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.core.config import settings
from backend.core.database import get_db
from backend.core.security import get_current_user, require_admin
from backend.models.attempt import Attempt
from backend.models.exercise import Exercise
from backend.models.topic import Topic
from backend.models.user_mastery import UserMastery
from backend.schemas.academic import (
    BranchCollectionResponse,
    BranchSingleResponse,
    CurriculumCollectionResponse,
    CurriculumGradeResponse,
    CurriculumGradeWrite,
    CurriculumSingleResponse,
)
from backend.schemas.user import UserOut
from backend.services.academic_service import (
    create_curriculum_grade,
    delete_curriculum_grade,
    get_curriculum_branch,
    get_curriculum_grade,
    list_curriculum_branches,
    list_curriculum_grades,
    update_curriculum_grade,
)
from backend.services.exercise_service import ExerciseService, normalize_app_difficulty
from backend.services.mastery_engine import update_mastery

logger = logging.getLogger(__name__)
AI_TUTOR_BASE_URL = settings.AI_TUTOR_URL.rstrip("/")

router = APIRouter(prefix="/api/academic", tags=["Academic"])


def _normalize_answer(value: str) -> str:
    return re.sub(r"\s+", "", str(value or "").strip().lower()).replace(",", ".")


def _numeric_value(value: str) -> float | None:
    normalized = _normalize_answer(value)
    if re.fullmatch(r"-?\d+(\.\d+)?", normalized):
        return float(normalized)

    fraction = re.fullmatch(r"(-?\d+)/(-?\d+)", normalized)
    if not fraction:
        return None

    numerator = int(fraction.group(1))
    denominator = int(fraction.group(2))
    if denominator == 0:
        return None
    return numerator / denominator


def _answers_match(expected: str, received: str) -> bool:
    if _normalize_answer(expected) == _normalize_answer(received):
        return True

    expected_number = _numeric_value(expected)
    received_number = _numeric_value(received)
    if expected_number is None or received_number is None:
        return False
    return abs(expected_number - received_number) <= 1e-6


def _mastery_for_topic(db: Session, user_id: int, topic_id: int | None) -> float:
    if topic_id is None:
        return 0.5

    mastery = db.scalars(
        select(UserMastery).where(
            UserMastery.user_id == user_id,
            UserMastery.topic_id == topic_id,
        ),
    ).first()
    return float(mastery.mastery_score) if mastery else 0.5


def _mastery_percent(score: float) -> int:
    return max(0, min(100, round(float(score) * 100 if score <= 1 else float(score))))


def _topic_label(exercise: Exercise) -> str:
    if exercise.topic is not None:
        return exercise.topic.name
    return f"Topic {exercise.topic_id}"


def _skill_payload(exercise: Exercise) -> dict[str, Any]:
    topic_name = _topic_label(exercise)
    return {
        "id": f"topic_{exercise.topic_id}",
        "name": topic_name,
        "description": f"Practica de {topic_name}",
        "domain": "math",
        "difficulty": max(1, min(10, round(float(exercise.difficulty) * 5))),
        "prerequisites": [],
    }


def _steps_to_strings(raw_steps: Any) -> list[str]:
    if not isinstance(raw_steps, list):
        return []

    steps: list[str] = []
    for item in raw_steps:
        if isinstance(item, str):
            if item.strip():
                steps.append(item.strip())
            continue

        if isinstance(item, dict):
            parts = [
                str(item.get("operation") or "").strip(),
                str(item.get("reasoning") or "").strip(),
                str(item.get("result") or "").strip(),
            ]
            text = " - ".join(part for part in parts if part)
            if text:
                steps.append(text)
    return steps


async def _post_ai_tutor(path: str, payload: dict[str, Any], user_id: int | str, timeout: float = 15.0) -> dict[str, Any] | None:
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(
                f"{AI_TUTOR_BASE_URL}{path}",
                json=payload,
                headers={"x-user-id": str(user_id)},
            )

        if response.status_code == 200:
            return response.json()

        logger.warning("AI Tutor %s returned HTTP %s: %s", path, response.status_code, response.text[:300])
    except Exception as exc:
        logger.warning("AI Tutor %s failed: %s", path, exc)
    return None


def _default_chat_context(
    *,
    current_user: UserOut,
    exercise: Exercise | None,
    student_answer: str,
    message: str,
    history: list["ChatMessage"],
    mastery_score: float,
) -> dict[str, Any]:
    problem = (
        ExerciseService.to_ai_problem_payload(exercise)
        if exercise is not None
        else {
            "id": "general",
            "skillId": "general_math",
            "difficulty": 5,
            "statement": message,
            "correctAnswer": "",
            "solutionSteps": [],
        }
    )
    skill_id = problem["skillId"]
    skill_name = _topic_label(exercise) if exercise is not None else "Matematica"

    return {
        "studentId": str(current_user.id),
        "skillId": skill_id,
        "skillName": skill_name,
        "problem": problem,
        "studentAnswer": student_answer,
        "mastery": {
            "mu": mastery_score,
            "sigma": 0.2,
            "estimatedMastery": _mastery_percent(mastery_score),
            "confidence": 75,
            "attemptCount": 0,
        },
        "signals": {
            "accuracy": _mastery_percent(mastery_score),
            "consistency": 60,
            "retentionRisk": max(0, 100 - _mastery_percent(mastery_score)),
            "predictedFailure": max(0, 100 - _mastery_percent(mastery_score)),
            "learningVelocity": "normal",
            "masteryConfidence": 75,
        },
        "conversationHistory": [
            {
                "role": "tutor" if item.role in {"assistant", "ai", "tutor"} else "student",
                "content": item.content,
                "timestamp": item.timestamp or "",
                "skillId": skill_id,
            }
            for item in history[-8:]
            if item.content
        ],
        "attemptNumber": 1,
        "previousHints": [],
    }


# Curriculum endpoints


@router.get("/curriculum", response_model=CurriculumCollectionResponse | CurriculumSingleResponse)
def get_curriculum(grade: str | None = None, db: Session = Depends(get_db)):
    if grade:
        return {"grade": get_curriculum_grade(db, grade)}

    grades = list_curriculum_grades(db)
    return {"grades": grades, "totalGrades": len(grades)}


@router.get("/grades/{grade_id}", response_model=CurriculumGradeResponse)
def get_grade(grade_id: str, db: Session = Depends(get_db)):
    return get_curriculum_grade(db, grade_id)


@router.get("/branches", response_model=BranchCollectionResponse)
def get_branches(db: Session = Depends(get_db)):
    branches = list_curriculum_branches(db)
    return {"branches": branches, "totalBranches": len(branches)}


@router.get("/branches/{branch_id}", response_model=BranchSingleResponse)
def get_branch(branch_id: str, db: Session = Depends(get_db)):
    return {"branch": get_curriculum_branch(db, branch_id)}


@router.post("/grades", response_model=CurriculumGradeResponse)
def create_grade(
    payload: CurriculumGradeWrite,
    db: Session = Depends(get_db),
    _admin_user: UserOut = Depends(require_admin),
):
    return create_curriculum_grade(db, payload)


@router.put("/grades/{grade_id}", response_model=CurriculumGradeResponse)
def update_grade(
    grade_id: str,
    payload: CurriculumGradeWrite,
    db: Session = Depends(get_db),
    _admin_user: UserOut = Depends(require_admin),
):
    return update_curriculum_grade(db, grade_id, payload)


@router.delete("/grades/{grade_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_grade(
    grade_id: str,
    db: Session = Depends(get_db),
    _admin_user: UserOut = Depends(require_admin),
):
    delete_curriculum_grade(db, grade_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# Exercise endpoints


class ExerciseResponse(BaseModel):
    id: int
    topic_id: int
    question: str
    answer: str
    difficulty: float

    model_config = ConfigDict(from_attributes=True)


class GeneratedExerciseResponse(BaseModel):
    id: str
    exercise_id: int | None = Field(default=None, alias="exerciseId")
    statement: str
    correctAnswer: str
    solutionSteps: list[str] = Field(default_factory=list)
    type: str
    source: str
    difficulty: float
    keyConceptsTested: list[str]

    model_config = ConfigDict(populate_by_name=True)


@router.get("/exercises/topic/{topic_id}", response_model=list[ExerciseResponse])
def get_exercises_by_topic(
    topic_id: int,
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
):
    exercises = db.scalars(select(Exercise).where(Exercise.topic_id == topic_id).limit(limit)).all()
    if not exercises:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No exercises found for this topic")
    return exercises


@router.get("/exercises/{exercise_id}", response_model=ExerciseResponse)
def get_exercise(exercise_id: int, db: Session = Depends(get_db)):
    exercise = db.get(Exercise, exercise_id)
    if exercise is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exercise not found")
    return exercise


@router.get("/next-exercise", response_model=ExerciseResponse)
async def get_next_exercise(
    user_id: int = Query(..., description="User ID"),
    topic_id: int = Query(..., description="Topic ID"),
    db: Session = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    if current_user.id != user_id and current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot access other user exercises")

    if db.get(Topic, topic_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Topic not found")

    recent_attempts = db.scalars(
        select(Attempt.exercise_id)
        .where(Attempt.user_id == user_id)
        .order_by(Attempt.created_at.desc())
        .limit(5),
    ).all()

    exercise = await ExerciseService.get_adaptive_exercise(db, user_id, topic_id, list(recent_attempts))
    if exercise is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No suitable exercises available")
    return exercise


class GenerateQuestionRequest(BaseModel):
    topic_id: int | None = Field(default=None, alias="topicId")
    skill_name: str | None = Field(default=None, alias="skillName")
    topic: str | None = None
    difficulty: float = 0.5
    error_type: str | None = Field(default=None, alias="errorType")
    persist: bool = True

    model_config = ConfigDict(populate_by_name=True)


@router.post("/question/generate", response_model=GeneratedExerciseResponse)
async def generate_question(
    request: GenerateQuestionRequest,
    db: Session = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    topic = db.get(Topic, request.topic_id) if request.topic_id is not None else None
    if request.topic_id is not None and topic is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Topic not found")

    skill_name = request.skill_name or (topic.name if topic else None) or request.topic or "Matematica"
    app_difficulty = normalize_app_difficulty(request.difficulty)
    mastery_level = _mastery_for_topic(db, current_user.id, topic.id if topic else None)

    previous = (
        [
            ExerciseService.to_ai_problem_payload(item)
            for item in await ExerciseService.get_exercises_by_topic(db, topic.id, limit=3)
        ]
        if topic is not None
        else []
    )

    generated = await ExerciseService.generate_exercise_with_ai(
        skill_name=skill_name,
        difficulty=app_difficulty,
        mastery_level=mastery_level,
        error_type=request.error_type,
        user_id=current_user.id,
        previous_exercises=previous,
    )

    if request.persist and topic is not None:
        saved = Exercise(
            topic_id=topic.id,
            difficulty=float(generated["difficulty"]),
            question=generated["statement"],
            answer=generated["correctAnswer"],
        )
        try:
            db.add(saved)
            db.commit()
            db.refresh(saved)
        except Exception as exc:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Generated question could not be saved",
            ) from exc
        generated["exerciseId"] = saved.id

    return generated


class SubmitAnswerRequest(BaseModel):
    exercise_id: int | None = Field(default=None, alias="exerciseId")
    user_answer: str | None = Field(default=None, alias="userAnswer")
    answer: str | None = None
    time_spent_seconds: int | None = Field(default=None, alias="timeSpentSeconds")
    elapsed_time_ms: int | None = Field(default=None, alias="elapsedTimeMs")

    model_config = ConfigDict(populate_by_name=True)


@router.post("/question/submit")
async def submit_answer(
    request: SubmitAnswerRequest,
    db: Session = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    if request.exercise_id is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="exerciseId is required")

    submitted_answer = request.user_answer if request.user_answer is not None else request.answer
    if submitted_answer is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="answer is required")

    exercise = db.get(Exercise, request.exercise_id)
    if exercise is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exercise not found")

    is_correct = _answers_match(exercise.answer, submitted_answer)
    attempt = Attempt(user_id=current_user.id, exercise_id=exercise.id, is_correct=is_correct)
    db.add(attempt)

    mastery_score: float | None = None
    try:
        if exercise.topic_id is not None:
            mastery = update_mastery(
                db=db,
                user_id=current_user.id,
                topic_id=int(exercise.topic_id),
                is_correct=is_correct,
                difficulty=float(exercise.difficulty),
                criticality_level=int(exercise.topic.criticality_level if exercise.topic else 1),
            )
            mastery_score = float(mastery.mastery_score)
        else:
            db.commit()
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Answer could not be saved") from exc

    score = 1.0 if is_correct else 0.0
    xp_awarded = 100 if is_correct else 0
    next_difficulty = normalize_app_difficulty(float(exercise.difficulty) + (0.1 if is_correct else -0.1))

    return {
        "correct": is_correct,
        "is_correct": is_correct,
        "isCorrect": is_correct,
        "score": score,
        "message": "Correcto." if is_correct else "Incorrecto. Revisa tus pasos.",
        "explanation": "Correcto." if is_correct else f"La respuesta correcta es: {exercise.answer}",
        "correctAnswer": exercise.answer,
        "xpAwarded": xp_awarded,
        "next_difficulty": next_difficulty,
        "nextDifficulty": next_difficulty,
        "masteryScore": mastery_score,
    }


# AI Tutor endpoints


class HintRequest(BaseModel):
    exercise_id: int | None = Field(default=None, alias="exerciseId")
    user_answer: str | None = Field(default=None, alias="userAnswer")
    hint_level: int = Field(default=1, alias="hintLevel")
    previous_hints: list[str] = Field(default_factory=list, alias="previousHints")

    model_config = ConfigDict(populate_by_name=True)


async def _hint_for_exercise(
    *,
    db: Session,
    current_user: UserOut,
    exercise: Exercise,
    hint_level: int,
    previous_hints: list[str],
) -> dict[str, Any]:
    safe_level = max(1, min(3, int(hint_level)))
    mastery = _mastery_for_topic(db, current_user.id, exercise.topic_id)
    payload = {
        "problem": ExerciseService.to_ai_problem_payload(exercise),
        "currentStep": 0,
        "previousHints": previous_hints,
        "masteryLevel": _mastery_percent(mastery),
        "hintLevel": safe_level,
    }

    data = await _post_ai_tutor("/api/ai-tutor/hint", payload, current_user.id)
    hint_data = data.get("hint") if data else None
    if isinstance(hint_data, dict) and hint_data.get("hint"):
        return {
            "hint": hint_data["hint"],
            "hintLevel": hint_data.get("hintLevel", safe_level),
            "source": "ai-tutor",
            "followUpGuidance": hint_data.get("followUpGuidance"),
        }

    return {
        "hint": f"Identifica los datos importantes y decide que operacion conecta el enunciado con la respuesta.",
        "hintLevel": safe_level,
        "source": "fallback",
        "followUpGuidance": "Intenta escribir el primer paso antes de pedir otra pista.",
    }


@router.post("/question/hint")
async def get_hint(
    request: HintRequest,
    db: Session = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    if request.exercise_id is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="exerciseId is required")

    exercise = db.get(Exercise, request.exercise_id)
    if exercise is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exercise not found")

    return await _hint_for_exercise(
        db=db,
        current_user=current_user,
        exercise=exercise,
        hint_level=request.hint_level,
        previous_hints=request.previous_hints,
    )


class ExplanationRequest(BaseModel):
    exercise_id: int | None = Field(default=None, alias="exerciseId")
    user_answer: str | None = Field(default=None, alias="userAnswer")
    error_type: str = Field(default="PROCEDURAL", alias="errorType")

    model_config = ConfigDict(populate_by_name=True)


async def _explanation_for_exercise(
    *,
    db: Session,
    current_user: UserOut,
    exercise: Exercise,
    user_answer: str | None,
    error_type: str,
) -> dict[str, Any]:
    mastery = _mastery_for_topic(db, current_user.id, exercise.topic_id)
    payload = {
        "problem": ExerciseService.to_ai_problem_payload(exercise),
        "studentAnswer": user_answer or "sin respuesta",
        "errorType": error_type.strip().upper() if error_type else "PROCEDURAL",
        "masteryLevel": _mastery_percent(mastery),
        "skill": _skill_payload(exercise),
    }

    data = await _post_ai_tutor("/api/ai-tutor/explain", payload, current_user.id, timeout=20.0)
    explanation_data = data.get("explanation") if data else None
    if isinstance(explanation_data, dict):
        explanation = explanation_data.get("mainExplanation") or explanation_data.get("explanation")
        steps = _steps_to_strings(explanation_data.get("stepByStep") or explanation_data.get("steps"))
        if explanation:
            return {
                "explanation": explanation,
                "steps": steps,
                "keyConcepts": [_topic_label(exercise)],
                "source": "ai-tutor",
            }

    return {
        "explanation": f"La respuesta correcta es: {exercise.answer}",
        "steps": [
            "Lee el enunciado y separa los datos.",
            "Aplica la operacion o regla principal.",
            f"Verifica que el resultado sea {exercise.answer}.",
        ],
        "keyConcepts": [_topic_label(exercise)],
        "source": "fallback",
    }


@router.post("/question/explanation")
async def get_explanation(
    request: ExplanationRequest,
    db: Session = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    if request.exercise_id is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="exerciseId is required")

    exercise = db.get(Exercise, request.exercise_id)
    if exercise is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exercise not found")

    return await _explanation_for_exercise(
        db=db,
        current_user=current_user,
        exercise=exercise,
        user_answer=request.user_answer,
        error_type=request.error_type,
    )


class HelpRequest(HintRequest):
    mode: str = "hint"
    last_student_answer: str | None = Field(default=None, alias="lastStudentAnswer")


@router.post("/question/help")
async def get_question_help(
    request: HelpRequest,
    db: Session = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    if request.exercise_id is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="exerciseId is required")

    exercise = db.get(Exercise, request.exercise_id)
    if exercise is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exercise not found")

    if request.mode.lower() == "full":
        explanation = await _explanation_for_exercise(
            db=db,
            current_user=current_user,
            exercise=exercise,
            user_answer=request.last_student_answer or request.user_answer,
            error_type="PROCEDURAL",
        )
        return {
            "mode": "full",
            "answer": explanation["explanation"],
            "steps": explanation["steps"],
            "source": explanation["source"],
            "xpAwarded": 0,
            "correctAnswer": exercise.answer,
        }

    hint = await _hint_for_exercise(
        db=db,
        current_user=current_user,
        exercise=exercise,
        hint_level=request.hint_level,
        previous_hints=request.previous_hints,
    )
    return {
        "mode": "hint",
        "answer": hint["hint"],
        "source": hint["source"],
        "xpAwarded": 0,
        "hintLevel": hint["hintLevel"],
    }


class ChatMessage(BaseModel):
    role: str
    content: str
    timestamp: str | None = None


class ChatRequest(BaseModel):
    message: str
    exercise_id: int | None = Field(default=None, alias="exerciseId")
    user_answer: str | None = Field(default=None, alias="userAnswer")
    history: list[ChatMessage] = Field(default_factory=list)

    model_config = ConfigDict(populate_by_name=True)


@router.post("/chat")
@router.post("/question/chat")
async def chat(
    request: ChatRequest,
    db: Session = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    exercise = db.get(Exercise, request.exercise_id) if request.exercise_id is not None else None
    if request.exercise_id is not None and exercise is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exercise not found")

    mastery = _mastery_for_topic(db, current_user.id, exercise.topic_id if exercise else None)
    payload = {
        "studentMessage": request.message,
        "context": _default_chat_context(
            current_user=current_user,
            exercise=exercise,
            student_answer=request.user_answer or "",
            message=request.message,
            history=request.history,
            mastery_score=mastery,
        ),
    }

    data = await _post_ai_tutor("/api/ai-tutor/chat", payload, current_user.id, timeout=20.0)
    response_data = data.get("response") if data else None
    if isinstance(response_data, dict) and response_data.get("content"):
        return {
            "response": response_data["content"],
            "answer": response_data["content"],
            "nextAction": response_data.get("nextAction", "try_again"),
            "source": "ai-tutor",
        }

    fallback = "Vamos paso a paso. Dime que dato identificaste primero y revisamos el siguiente movimiento."
    return {"response": fallback, "answer": fallback, "nextAction": "try_again", "source": "fallback"}


# Learning progress


@router.get("/learning/progress")
async def get_learning_progress(
    db: Session = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    attempts = db.scalars(select(Attempt).where(Attempt.user_id == current_user.id)).all()
    total = len(attempts)
    correct = sum(1 for attempt in attempts if attempt.is_correct)
    accuracy = (correct / total) if total else 0.0
    return {
        "userId": current_user.id,
        "totalExercises": total,
        "correctAnswers": correct,
        "accuracy": accuracy,
        "currentLevel": int(accuracy * 3) + 1,
    }


@router.get("/learning/recommendations")
async def get_learning_recommendations(
    db: Session = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    topics = db.scalars(select(Topic).limit(5)).all()
    recommendations = []
    for topic in topics:
        mastery = _mastery_for_topic(db, current_user.id, topic.id)
        recommendations.append(
            {
                "topicId": topic.id,
                "topicName": topic.name,
                "masteryLevel": mastery,
                "recommendationReason": "Recomendado para fortalecer conceptos.",
            },
        )
    return recommendations
