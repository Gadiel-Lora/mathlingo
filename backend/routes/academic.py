"""Academic routes: curriculum, exercises, and AI tutor support."""
from __future__ import annotations

import logging
import re
import hashlib
from datetime import UTC, datetime
from typing import Any

import httpx
from fastapi import APIRouter, Body, Depends, HTTPException, Query, Response, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session

from backend.core.config import settings
from backend.core.database import create_tables, get_db
from backend.core.security import get_current_user, require_admin
from backend.models.attempt import Attempt
from backend.models.exercise import Exercise
from backend.models.topic_dependency import TopicDependency
from backend.models.topic import Topic
from backend.models.user import User
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
    bootstrap_curriculum_data,
    create_curriculum_grade,
    delete_curriculum_grade,
    get_curriculum_branch,
    get_curriculum_grade,
    list_curriculum_branches,
    list_curriculum_grades,
    update_curriculum_grade,
)
from backend.services.exercise_service import ExerciseService, normalize_app_difficulty
from backend.services.mastery_engine import calculate_review_priority, update_mastery
from backend.ml_improvements import (
    BayesianPredictiveModel,
    AdaptiveDifficultyAdjuster,
    improved_predictive_payload,
    improved_level_update,
)

logger = logging.getLogger(__name__)
AI_TUTOR_BASE_URL = settings.AI_TUTOR_URL.rstrip("/")
MAX_ATTEMPTS = 3

QUESTION_STATE_FLOW = {
    "states": ["fresh", "in-progress", "locked", "completed-assisted", "completed-clean"],
    "maxAttempts": MAX_ATTEMPTS,
    "helpPolicy": {
        "hintPenaltyPct": 10,
        "fullExplanationPenaltyPct": 30,
        "finalAnswerBlocksQuestion": True,
    },
}

_QUESTION_STATES: dict[tuple[int, str], dict[str, Any]] = {}
_QUESTION_BANK: dict[tuple[int, str], dict[str, Any]] = {}

router = APIRouter(prefix="/api/academic", tags=["Academic"])


def _utcnow() -> datetime:
    return datetime.now(UTC).replace(tzinfo=None)


def _utc_iso() -> str:
    return datetime.now(UTC).isoformat()


def _clamp(value: float, min_value: float, max_value: float) -> float:
    return max(min_value, min(max_value, value))


def _safe_int(value: Any, default: int | None = None) -> int | None:
    try:
        if value is None or value == "":
            return default
        return int(value)
    except (TypeError, ValueError):
        return default


def _safe_float(value: Any, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _normalize_role(role: str | None) -> str:
    return str(role or "").strip().lower()


def _resolve_target_user_id(payload: dict[str, Any], current_user: UserOut) -> int:
    raw_user_id = payload.get("userId") or payload.get("user_id")
    target_user_id = _safe_int(raw_user_id, current_user.id)
    if target_user_id is None:
        target_user_id = current_user.id

    if target_user_id != current_user.id and _normalize_role(current_user.role) != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot access another user")
    return target_user_id


def _question_state_key(user_id: int, question_hash: str) -> tuple[int, str]:
    return (int(user_id), str(question_hash).strip())


def _build_question_hash(*parts: Any) -> str:
    raw = "|".join(str(part or "").strip() for part in parts if str(part or "").strip())
    if not raw:
        raw = _utc_iso()
    return hashlib.sha1(raw.encode("utf-8")).hexdigest()[:16]


def _fresh_question_state(question_hash: str) -> dict[str, Any]:
    return {
        "questionHash": question_hash,
        "attempts": 0,
        "helpClicks": 0,
        "chatClicks": 0,
        "assisted": False,
        "locked": False,
        "completed": False,
        "lastAnswerCorrect": None,
        "helpPenaltyPct": 0,
        "updatedAt": _utc_iso(),
    }


def _get_or_create_question_state(user_id: int, question_hash: str) -> dict[str, Any]:
    key = _question_state_key(user_id, question_hash)
    if key not in _QUESTION_STATES:
        _QUESTION_STATES[key] = _fresh_question_state(question_hash)
    return _QUESTION_STATES[key]


def _public_question_state(state: dict[str, Any]) -> dict[str, Any]:
    attempts = int(state.get("attempts") or 0)
    assisted = bool(state.get("assisted"))
    locked = bool(state.get("locked"))
    completed = bool(state.get("completed"))
    return {
        "questionHash": state.get("questionHash"),
        "attempts": attempts,
        "remainingAttempts": max(0, MAX_ATTEMPTS - attempts),
        "helpClicks": int(state.get("helpClicks") or 0),
        "chatClicks": int(state.get("chatClicks") or 0),
        "assisted": assisted,
        "locked": locked,
        "completed": completed,
        "helpPenaltyPct": int(state.get("helpPenaltyPct") or 0),
        "lastAnswerCorrect": state.get("lastAnswerCorrect"),
        "flowState": (
            "locked"
            if locked and not completed
            else "completed-assisted"
            if completed and assisted
            else "completed-clean"
            if completed
            else "in-progress"
            if attempts > 0 or int(state.get("helpClicks") or 0) > 0
            else "fresh"
        ),
        "updatedAt": state.get("updatedAt"),
    }


def _question_hash_from_payload(payload: dict[str, Any], exercise: Exercise | None = None) -> str | None:
    question_hash = str(payload.get("questionHash") or payload.get("question_hash") or "").strip()
    if question_hash:
        return question_hash

    exercise_id = payload.get("exerciseId") or payload.get("exercise_id")
    if exercise is not None:
        return _build_question_hash(exercise.id, exercise.question, exercise.answer)
    if exercise_id:
        return _build_question_hash(exercise_id)
    return None


def _app_difficulty_to_ten(value: Any) -> int:
    difficulty = normalize_app_difficulty(_safe_float(value, 0.5))
    return max(1, min(10, round(difficulty * 5)))


def _generated_question_payload(
    generated: dict[str, Any],
    question_hash: str,
    *,
    topic: Topic | None = None,
    lesson_id: str | None = None,
    grade: str | int | None = None,
    problem_mix: str = "mixed",
    exam_mode: bool = False,
) -> dict[str, Any]:
    statement = str(generated.get("statement") or generated.get("question") or "").strip()
    return {
        "id": question_hash,
        "questionHash": question_hash,
        "exerciseId": generated.get("exerciseId"),
        "statement": statement,
        "prompt": statement,
        "question": statement,
        "type": generated.get("questionType") or generated.get("type") or "input",
        "difficulty": _app_difficulty_to_ten(generated.get("difficulty", 0.5)),
        "topic": topic.name if topic is not None else generated.get("topic"),
        "topicId": topic.id if topic is not None else generated.get("topicId"),
        "skillId": f"topic_{topic.id}" if topic is not None else generated.get("skillId"),
        "lessonId": lesson_id or generated.get("lessonId"),
        "grade": grade,
        "gradeId": grade,
        "problemMix": problem_mix,
        "examMode": exam_mode,
        "options": generated.get("options") or [],
        "keyConceptsTested": generated.get("keyConceptsTested") or [],
    }


def _with_curriculum_bootstrap(db: Session, loader):
    try:
        result = loader()
        if result == []:
            create_tables()
            bootstrap_curriculum_data()
            return loader()
        return result
    except OperationalError:
        db.rollback()
        create_tables()
        bootstrap_curriculum_data()
        return loader()


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
        return {"grade": _with_curriculum_bootstrap(db, lambda: get_curriculum_grade(db, grade))}

    grades = _with_curriculum_bootstrap(db, lambda: list_curriculum_grades(db))
    return {"grades": grades, "totalGrades": len(grades)}


@router.get("/grades/{grade_id}", response_model=CurriculumGradeResponse)
def get_grade(grade_id: str, db: Session = Depends(get_db)):
    return _with_curriculum_bootstrap(db, lambda: get_curriculum_grade(db, grade_id))


@router.get("/branches", response_model=BranchCollectionResponse)
def get_branches(db: Session = Depends(get_db)):
    branches = _with_curriculum_bootstrap(db, lambda: list_curriculum_branches(db))
    return {"branches": branches, "totalBranches": len(branches)}


@router.get("/branches/{branch_id}", response_model=BranchSingleResponse)
def get_branch(branch_id: str, db: Session = Depends(get_db)):
    return {"branch": _with_curriculum_bootstrap(db, lambda: get_curriculum_branch(db, branch_id))}


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
    success: bool = True
    id: str
    exercise_id: int | None = Field(default=None, alias="exerciseId")
    question_hash: str | None = Field(default=None, alias="questionHash")
    statement: str
    correctAnswer: str
    solutionSteps: list[str] = Field(default_factory=list)
    type: str
    source: str
    difficulty: float
    keyConceptsTested: list[str]
    question: dict[str, Any] | None = None
    state: dict[str, Any] | None = None
    max_attempts: int = Field(default=MAX_ATTEMPTS, alias="maxAttempts")
    flow: dict[str, Any] | None = None
    data: dict[str, Any] | None = None

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

    question_hash = _build_question_hash(
        generated.get("exerciseId") or generated.get("id"),
        generated.get("statement"),
        generated.get("correctAnswer"),
    )
    state = _get_or_create_question_state(current_user.id, question_hash)
    public_question = _generated_question_payload(generated, question_hash, topic=topic)
    _QUESTION_BANK[_question_state_key(current_user.id, question_hash)] = {
        **generated,
        "questionHash": question_hash,
        "question": public_question,
        "correctAnswer": generated.get("correctAnswer"),
        "createdAt": _utc_iso(),
    }

    generated["success"] = True
    generated["questionHash"] = question_hash
    generated["question"] = public_question
    generated["state"] = _public_question_state(state)
    generated["maxAttempts"] = MAX_ATTEMPTS
    generated["flow"] = QUESTION_STATE_FLOW
    generated["data"] = {
        "question": public_question,
        "state": _public_question_state(state),
        "maxAttempts": MAX_ATTEMPTS,
    }

    return generated


class SubmitAnswerRequest(BaseModel):
    exercise_id: int | None = Field(default=None, alias="exerciseId")
    question_hash: str | None = Field(default=None, alias="questionHash")
    user_answer: str | None = Field(default=None, alias="userAnswer")
    answer: str | None = None
    time_spent_seconds: int | None = Field(default=None, alias="timeSpentSeconds")
    elapsed_time_ms: int | None = Field(default=None, alias="elapsedTimeMs")
    learning_mode: str | None = Field(default=None, alias="learningMode")
    skill_id: str | None = Field(default=None, alias="skillId")

    model_config = ConfigDict(populate_by_name=True)


@router.post("/question/submit")
async def submit_answer(
    request: SubmitAnswerRequest,
    db: Session = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    submitted_answer = request.user_answer if request.user_answer is not None else request.answer
    if submitted_answer is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="answer is required")

    if request.exercise_id is None:
        question_hash = str(request.question_hash or "").strip()
        if not question_hash:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="exerciseId or questionHash is required")

        stored_question = _QUESTION_BANK.get(_question_state_key(current_user.id, question_hash))
        if not stored_question:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Active question not found")

        state = _get_or_create_question_state(current_user.id, question_hash)
        if state.get("locked"):
            return {
                "success": False,
                "correct": False,
                "message": "La pregunta esta bloqueada.",
                "xpAwarded": 0,
                "state": _public_question_state(state),
                "data": {"state": _public_question_state(state)},
            }

        is_correct = _answers_match(str(stored_question.get("correctAnswer") or ""), submitted_answer)
        state["attempts"] = int(state.get("attempts") or 0) + 1
        state["lastAnswerCorrect"] = is_correct
        state["completed"] = is_correct
        state["locked"] = is_correct or state["attempts"] >= MAX_ATTEMPTS
        state["updatedAt"] = _utc_iso()
        public_state = _public_question_state(state)
        xp_awarded = 100 if is_correct and not state.get("assisted") else 70 if is_correct else 0

        return {
            "success": True,
            "correct": is_correct,
            "is_correct": is_correct,
            "isCorrect": is_correct,
            "score": 1.0 if is_correct else 0.0,
            "message": "Correcto." if is_correct else "Sigue intentando, revisa tus pasos.",
            "explanation": "Correcto." if is_correct else f"La respuesta correcta es: {stored_question.get('correctAnswer')}",
            "correctAnswer": stored_question.get("correctAnswer") if public_state["locked"] else None,
            "xpAwarded": xp_awarded,
            "maxAttemptsReached": public_state["locked"] and not is_correct,
            "learningMode": request.learning_mode or "curriculum",
            "state": public_state,
            "data": {"state": public_state, "xpAwarded": xp_awarded},
        }

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
    question_hash = request.question_hash or _build_question_hash(exercise.id, exercise.question, exercise.answer)
    state = _get_or_create_question_state(current_user.id, question_hash)
    state["attempts"] = int(state.get("attempts") or 0) + 1
    state["lastAnswerCorrect"] = is_correct
    state["completed"] = is_correct
    state["locked"] = is_correct or state["attempts"] >= MAX_ATTEMPTS
    state["updatedAt"] = _utc_iso()
    public_state = _public_question_state(state)

    return {
        "success": True,
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
        "state": public_state,
        "data": {"state": public_state, "xpAwarded": xp_awarded},
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
    """
    ML-Enhanced: Advanced error pattern detection.
    Analyzes error types and prerequisites to generate targeted hints.
    """
    from backend.ml_improvements import BayesianPredictiveModel
    
    safe_level = max(1, min(3, int(hint_level)))
    mastery = _mastery_for_topic(db, current_user.id, exercise.topic_id)
    
    # Get user's recent attempts to detect error patterns
    recent_attempts = db.scalars(
        select(Attempt)
        .where(Attempt.user_id == current_user.id)
        .where(Attempt.exercise_id == exercise.id)
        .order_by(Attempt.created_at.desc())
        .limit(5)
    ).all()
    
    # Analyze error patterns
    recent_results = [bool(attempt.is_correct) for attempt in recent_attempts]
    
    # Determine error pattern
    if not recent_results:
        error_pattern = "NEW_SKILL"
    elif all(recent_results):
        error_pattern = "MASTERED"
    elif not any(recent_results):
        error_pattern = "SYSTEMATIC_ERROR"
    else:
        error_pattern = "OSCILLATING" if recent_results[-1] != recent_results[0] else "LEARNING"
    
    payload = {
        "problem": ExerciseService.to_ai_problem_payload(exercise),
        "currentStep": 0,
        "previousHints": previous_hints,
        "masteryLevel": _mastery_percent(mastery),
        "hintLevel": safe_level,
        "errorPattern": error_pattern,  # Provide error pattern context
    }

    data = await _post_ai_tutor("/api/ai-tutor/hint", payload, current_user.id)
    hint_data = data.get("hint") if data else None
    if isinstance(hint_data, dict) and hint_data.get("hint"):
        return {
            "hint": hint_data["hint"],
            "hintLevel": hint_data.get("hintLevel", safe_level),
            "source": "ai-tutor",
            "followUpGuidance": hint_data.get("followUpGuidance"),
            "errorPattern": error_pattern,
        }

    # Intelligent fallback hints based on error pattern
    fallback_hints = {
        "SYSTEMATIC_ERROR": "Parece que hay un patrón en tus errores. Revisa el método que estás usando, no solo el resultado.",
        "OSCILLATING": "A veces aciertas y a veces no. Practica más este tipo de problema para consolidar el conocimiento.",
        "NEW_SKILL": "Identifica los datos importantes y decide que operación conecta el enunciado con la respuesta.",
        "LEARNING": "¡Vas mejorando! Analiza qué está funcionando y qué aún necesita trabajo.",
        "MASTERED": "¡Excelente! Puedes intentar ejercicios más difíciles.",
    }

    return {
        "hint": fallback_hints.get(error_pattern, f"Identifica los datos importantes y decide que operacion conecta el enunciado con la respuesta."),
        "hintLevel": safe_level,
        "source": "fallback",
        "followUpGuidance": "Intenta escribir el primer paso antes de pedir otra pista.",
        "errorPattern": error_pattern,
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
    question_hash: str | None = Field(default=None, alias="questionHash")
    mode: str = "hint"
    last_student_answer: str | None = Field(default=None, alias="lastStudentAnswer")
    previous_explanation: str | None = Field(default=None, alias="previousExplanation")
    student_attempts: int | None = Field(default=None, alias="studentAttempts")
    error_count: int | None = Field(default=None, alias="errorCount")
    correct_streak: int | None = Field(default=None, alias="correctStreak")
    level: str | None = None


@router.post("/question/help")
async def get_question_help(
    request: HelpRequest,
    db: Session = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    if request.exercise_id is None:
        question_hash = str(request.question_hash or "").strip()
        if not question_hash:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="exerciseId or questionHash is required")

        stored_question = _QUESTION_BANK.get(_question_state_key(current_user.id, question_hash))
        state = _get_or_create_question_state(current_user.id, question_hash)
        if stored_question and stored_question.get("question", {}).get("examMode"):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="AI help is blocked during final exams")
        if state.get("locked"):
            return {
                "success": False,
                "mode": request.mode,
                "answer": "Esta pregunta esta bloqueada.",
                "source": "state",
                "xpAwarded": 0,
                "state": _public_question_state(state),
                "data": {"state": _public_question_state(state)},
            }

        requested_mode = "full" if request.mode.lower() == "full" else "hint"
        state["helpClicks"] = int(state.get("helpClicks") or 0) + 1
        state["assisted"] = True
        state["helpPenaltyPct"] = max(int(state.get("helpPenaltyPct") or 0), 30 if requested_mode == "full" else 10)
        state["updatedAt"] = _utc_iso()

        if requested_mode == "full":
            answer = (
                " ".join(stored_question.get("solutionSteps") or [])
                if stored_question
                else "Descompone el problema en datos, operacion y verificacion final."
            )
            if not answer.strip():
                answer = f"La respuesta correcta es {stored_question.get('correctAnswer')}." if stored_question else "Revisa cada paso."
            return {
                "success": True,
                "mode": "full",
                "answer": answer,
                "steps": stored_question.get("solutionSteps") if stored_question else [],
                "source": stored_question.get("source", "fallback") if stored_question else "fallback",
                "xpAwarded": 0,
                "correctAnswer": stored_question.get("correctAnswer") if stored_question else None,
                "state": _public_question_state(state),
                "data": {"state": _public_question_state(state), "answer": answer},
            }

        hint_answer = "Identifica los datos del enunciado y escribe la primera operacion antes de calcular."
        if stored_question and stored_question.get("keyConceptsTested"):
            hint_answer = f"Piensa en {stored_question['keyConceptsTested'][0]} y conecta el dato conocido con la incognita."
        return {
            "success": True,
            "mode": "hint",
            "answer": hint_answer,
            "source": "fallback",
            "xpAwarded": 0,
            "hintLevel": request.hint_level,
            "state": _public_question_state(state),
            "data": {"state": _public_question_state(state), "answer": hint_answer},
        }

    exercise = db.get(Exercise, request.exercise_id)
    if exercise is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exercise not found")

    question_hash = request.question_hash or _build_question_hash(exercise.id, exercise.question, exercise.answer)
    state = _get_or_create_question_state(current_user.id, question_hash)
    state["helpClicks"] = int(state.get("helpClicks") or 0) + 1
    state["assisted"] = True
    state["helpPenaltyPct"] = max(int(state.get("helpPenaltyPct") or 0), 30 if request.mode.lower() == "full" else 10)
    state["updatedAt"] = _utc_iso()

    if request.mode.lower() == "full":
        explanation = await _explanation_for_exercise(
            db=db,
            current_user=current_user,
            exercise=exercise,
            user_answer=request.last_student_answer or request.user_answer,
            error_type="PROCEDURAL",
        )
        return {
            "success": True,
            "mode": "full",
            "answer": explanation["explanation"],
            "steps": explanation["steps"],
            "source": explanation["source"],
            "xpAwarded": 0,
            "correctAnswer": exercise.answer,
            "state": _public_question_state(state),
            "data": {"state": _public_question_state(state), "answer": explanation["explanation"]},
        }

    hint = await _hint_for_exercise(
        db=db,
        current_user=current_user,
        exercise=exercise,
        hint_level=request.hint_level,
        previous_hints=request.previous_hints,
    )
    return {
        "success": True,
        "mode": "hint",
        "answer": hint["hint"],
        "source": hint["source"],
        "xpAwarded": 0,
        "hintLevel": hint["hintLevel"],
        "state": _public_question_state(state),
        "data": {"state": _public_question_state(state), "answer": hint["hint"]},
    }


class ChatMessage(BaseModel):
    role: str
    content: str
    timestamp: str | None = None


class ChatRequest(BaseModel):
    message: str
    exercise_id: int | None = Field(default=None, alias="exerciseId")
    question_hash: str | None = Field(default=None, alias="questionHash")
    user_answer: str | None = Field(default=None, alias="userAnswer")
    last_student_answer: str | None = Field(default=None, alias="lastStudentAnswer")
    previous_explanation: str | None = Field(default=None, alias="previousExplanation")
    student_attempts: int | None = Field(default=None, alias="studentAttempts")
    error_count: int | None = Field(default=None, alias="errorCount")
    correct_streak: int | None = Field(default=None, alias="correctStreak")
    level: str | None = None
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

    state_payload: dict[str, Any] | None = None
    if request.question_hash:
        stored_question = _QUESTION_BANK.get(_question_state_key(current_user.id, request.question_hash))
        if stored_question and stored_question.get("question", {}).get("examMode"):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Tutor chat is blocked during final exams")
        state = _get_or_create_question_state(current_user.id, request.question_hash)
        state["chatClicks"] = int(state.get("chatClicks") or 0) + 1
        state["assisted"] = True
        state["helpPenaltyPct"] = max(int(state.get("helpPenaltyPct") or 0), 10)
        state["updatedAt"] = _utc_iso()
        state_payload = _public_question_state(state)

    mastery = _mastery_for_topic(db, current_user.id, exercise.topic_id if exercise else None)
    payload = {
        "studentMessage": request.message,
        "context": _default_chat_context(
            current_user=current_user,
            exercise=exercise,
            student_answer=request.last_student_answer or request.user_answer or "",
            message=request.message,
            history=request.history,
            mastery_score=mastery,
        ),
    }

    data = await _post_ai_tutor("/api/ai-tutor/chat", payload, current_user.id, timeout=20.0)
    response_data = data.get("response") if data else None
    if isinstance(response_data, dict) and response_data.get("content"):
        return {
            "success": True,
            "response": response_data["content"],
            "answer": response_data["content"],
            "nextAction": response_data.get("nextAction", "try_again"),
            "source": "ai-tutor",
            "state": state_payload,
            "data": {"answer": response_data["content"], "state": state_payload},
        }

    fallback = "Vamos paso a paso. Dime que dato identificaste primero y revisamos el siguiente movimiento."
    return {
        "success": True,
        "response": fallback,
        "answer": fallback,
        "nextAction": "try_again",
        "source": "fallback",
        "state": state_payload,
        "data": {"answer": fallback, "state": state_payload},
    }


@router.post("/question/state")
async def get_question_state(
    payload: dict[str, Any] = Body(default_factory=dict),
    db: Session = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    target_user_id = _resolve_target_user_id(payload, current_user)
    exercise_id = _safe_int(payload.get("exerciseId") or payload.get("exercise_id"))
    exercise = db.get(Exercise, exercise_id) if exercise_id is not None else None
    question_hash = _question_hash_from_payload(payload, exercise=exercise)
    if not question_hash:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="questionHash or exerciseId is required")

    state = _get_or_create_question_state(target_user_id, question_hash)
    if exercise is not None and int(state.get("attempts") or 0) == 0:
        attempts = db.scalars(
            select(Attempt).where(
                Attempt.user_id == target_user_id,
                Attempt.exercise_id == exercise.id,
            ),
        ).all()
        state["attempts"] = len(attempts)
        state["lastAnswerCorrect"] = attempts[-1].is_correct if attempts else None
        state["completed"] = any(attempt.is_correct for attempt in attempts)
        state["locked"] = bool(state["completed"]) or len(attempts) >= MAX_ATTEMPTS
        state["updatedAt"] = _utc_iso()

    public_state = _public_question_state(state)
    return {
        "success": True,
        "state": public_state,
        "maxAttempts": MAX_ATTEMPTS,
        "flow": QUESTION_STATE_FLOW,
        "data": {"state": public_state, "maxAttempts": MAX_ATTEMPTS, "flow": QUESTION_STATE_FLOW},
    }


@router.post("/question/reset")
async def reset_question(
    payload: dict[str, Any] = Body(default_factory=dict),
    db: Session = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    target_user_id = _resolve_target_user_id(payload, current_user)
    exercise_id = _safe_int(payload.get("exerciseId") or payload.get("exercise_id"))
    exercise = db.get(Exercise, exercise_id) if exercise_id is not None else None
    question_hash = _question_hash_from_payload(payload, exercise=exercise)
    if not question_hash:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="questionHash or exerciseId is required")

    _QUESTION_STATES[_question_state_key(target_user_id, question_hash)] = _fresh_question_state(question_hash)
    state = _public_question_state(_QUESTION_STATES[_question_state_key(target_user_id, question_hash)])
    return {"success": True, "ok": True, "state": state, "data": {"state": state}}


def _topic_skill_payload(topic: Topic, mastery: float = 0.0) -> dict[str, Any]:
    return {
        "id": f"topic_{topic.id}",
        "topicId": topic.id,
        "name": topic.name,
        "description": topic.description or f"Practica de {topic.name}",
        "domain": topic.subject.name if topic.subject is not None else f"subject_{topic.subject_id}",
        "moduleId": topic.module_id,
        "difficulty": _app_difficulty_to_ten(topic.difficulty_level or 0.5),
        "criticality": int(topic.criticality_level or 1),
        "mastery": _mastery_percent(mastery),
        "state": "mastered" if mastery >= 0.8 else "unlocked" if mastery > 0 else "available",
    }


def _sample_exam_questions(
    db: Session,
    *,
    user_id: int,
    question_count: int,
    topic_id: int | None = None,
    exam_mode: bool = False,
    grade: str | int | None = None,
) -> list[dict[str, Any]]:
    """
    ML-Enhanced: IRT 3PL exercise matching.
    Replaces random selection with personalized exercise matching based on mastery level.
    """
    from backend.ml_improvements import BayesianPredictiveModel
    
    stmt = select(Exercise)
    if topic_id is not None:
        stmt = stmt.where(Exercise.topic_id == topic_id)
    available_exercises = db.scalars(stmt).all()
    
    # Get user's mastery level for better matching
    user_mastery_rows = db.scalars(
        select(UserMastery).where(UserMastery.user_id == user_id)
    ).all()
    mastery_map = {row.topic_id: float(row.mastery_score) for row in user_mastery_rows}
    
    # Use IRT-based exercise matching to select optimal exercises
    selected_exercises = []
    
    if available_exercises:
        # Sort exercises by their fit for this user's mastery level
        # Target ~75% success rate (desirable difficulty)
        scored_exercises = []
        for exercise in available_exercises:
            mastery = mastery_map.get(exercise.topic_id, 0.5)
            # Calculate IRT success probability
            success_prob = BayesianPredictiveModel.estimate_success_probability(
                mastery_level=mastery,
                problem_difficulty=float(exercise.difficulty),
                discrimination=1.7  # Standard IRT discrimination parameter
            )
            # Prefer exercises where success probability is close to 0.75
            fitness = 1.0 - abs(success_prob - 0.75)
            scored_exercises.append((exercise, success_prob, fitness))
        
        # Sort by fitness (closest to optimal difficulty)
        scored_exercises.sort(key=lambda x: x[2], reverse=True)
        selected_exercises = [ex[0] for ex in scored_exercises[:max(1, question_count)]]
    
    questions: list[dict[str, Any]] = []
    for exercise in selected_exercises:
        generated = {
            "id": f"exercise_{exercise.id}",
            "exerciseId": exercise.id,
            "statement": exercise.question,
            "correctAnswer": exercise.answer,
            "solutionSteps": [],
            "type": "input",
            "source": "database",
            "difficulty": exercise.difficulty,
            "keyConceptsTested": [_topic_label(exercise)],
        }
        question_hash = _build_question_hash(exercise.id, exercise.question, exercise.answer)
        state = _get_or_create_question_state(user_id, question_hash)
        state["locked"] = False
        public_question = _generated_question_payload(
            generated,
            question_hash,
            topic=exercise.topic,
            grade=grade,
            exam_mode=exam_mode,
        )
        _QUESTION_BANK[_question_state_key(user_id, question_hash)] = {
            **generated,
            "questionHash": question_hash,
            "question": public_question,
        }
        questions.append(public_question)

    while len(questions) < question_count:
        index = len(questions) + 1
        left = 2 + index
        right = 3 + index
        generated = {
            "id": f"fallback_exam_{index}",
            "statement": f"Calcula {left} + {right}.",
            "correctAnswer": str(left + right),
            "solutionSteps": [f"Suma {left} y {right}.", f"El resultado es {left + right}."],
            "type": "input",
            "source": "fallback",
            "difficulty": 0.5,
            "keyConceptsTested": ["Aritmetica"],
        }
        question_hash = _build_question_hash(generated["id"], generated["statement"])
        public_question = _generated_question_payload(generated, question_hash, grade=grade, exam_mode=exam_mode)
        _QUESTION_BANK[_question_state_key(user_id, question_hash)] = {
            **generated,
            "questionHash": question_hash,
            "question": public_question,
        }
        questions.append(public_question)

    return questions[:question_count]


@router.post("/final-exam/generate")
async def generate_final_exam(
    payload: dict[str, Any] = Body(default_factory=dict),
    db: Session = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    target_user_id = _resolve_target_user_id(payload, current_user)
    grade = payload.get("grade") or payload.get("gradeId") or payload.get("grade_id") or "grade-1"
    question_count = max(1, min(_safe_int(payload.get("questionCount"), 10) or 10, 50))
    questions = _sample_exam_questions(
        db,
        user_id=target_user_id,
        question_count=question_count,
        exam_mode=True,
        grade=grade,
    )
    exam = {
        "id": f"final-{grade}-{_build_question_hash(target_user_id, grade, question_count)}",
        "grade": grade,
        "gradeId": grade,
        "title": f"Examen final {grade}",
        "examMode": payload.get("examMode") or "final",
        "questionCount": len(questions),
        "questions": questions,
        "generatedAt": _utc_iso(),
    }
    return {
        "success": True,
        "exam": exam,
        "message": "Examen final generado. Ayuda IA bloqueada para preguntas de examen.",
        "data": {"exam": exam},
    }


@router.post("/evaluation/generate")
async def generate_evaluation(
    payload: dict[str, Any] = Body(default_factory=dict),
    db: Session = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    target_user_id = _resolve_target_user_id(payload, current_user)
    topic_id = _safe_int(payload.get("topicId") or payload.get("topic_id"))
    question_count = max(1, min(_safe_int(payload.get("questionCount"), 6) or 6, 30))
    questions = _sample_exam_questions(
        db,
        user_id=target_user_id,
        question_count=question_count,
        topic_id=topic_id,
        grade=payload.get("grade") or payload.get("gradeId"),
    )
    evaluation = {
        "id": f"evaluation-{_build_question_hash(target_user_id, topic_id, question_count)}",
        "mode": payload.get("mode") or "adaptive",
        "topicId": topic_id,
        "questionCount": len(questions),
        "questions": questions,
        "rubric": {
            "masteryThreshold": 0.8,
            "retryBelow": 0.6,
            "xpEnabled": True,
        },
        "generatedAt": _utc_iso(),
    }
    return {"success": True, "evaluation": evaluation, "data": {"evaluation": evaluation}}


@router.post("/domain/map")
async def get_domain_map(
    payload: dict[str, Any] = Body(default_factory=dict),
    db: Session = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    target_user_id = _resolve_target_user_id(payload, current_user)
    mastery_rows = {
        row.topic_id: float(row.mastery_score)
        for row in db.scalars(select(UserMastery).where(UserMastery.user_id == target_user_id)).all()
    }
    topics = db.scalars(select(Topic).limit(250)).all()
    nodes = [_topic_skill_payload(topic, mastery_rows.get(topic.id, 0.0)) for topic in topics]
    links = [
        {"source": f"topic_{edge.depends_on_id}", "target": f"topic_{edge.topic_id}", "type": "prerequisite"}
        for edge in db.scalars(select(TopicDependency).limit(500)).all()
    ]

    if not nodes:
        for grade_item in list_curriculum_grades(db):
            for area in grade_item.get("areas", []):
                nodes.append(
                    {
                        "id": area["id"],
                        "name": area["name"],
                        "domain": area.get("branchId") or area["id"],
                        "mastery": 0,
                        "state": "available",
                    },
                )
                for topic in area.get("topics", []):
                    nodes.append(
                        {
                            "id": topic["id"],
                            "name": topic["name"],
                            "domain": area.get("branchId") or area["id"],
                            "mastery": 0,
                            "state": "locked",
                        },
                    )
                    links.append({"source": area["id"], "target": topic["id"], "type": "contains"})

    graph = {
        "nodes": nodes,
        "links": links,
        "grade": payload.get("grade") or payload.get("gradeId"),
        "revealAll": bool(payload.get("revealAll", False)),
    }
    return {"success": True, "graph": graph, "data": {"graph": graph}}


def _student_analytics(db: Session, user_id: int) -> dict[str, Any]:
    attempts = db.scalars(select(Attempt).where(Attempt.user_id == user_id)).all()
    total = len(attempts)
    correct = sum(1 for attempt in attempts if attempt.is_correct)
    mastery_rows = db.scalars(select(UserMastery).where(UserMastery.user_id == user_id)).all()
    mastery_values = [float(row.mastery_score) for row in mastery_rows]
    mastery_average = sum(mastery_values) / len(mastery_values) if mastery_values else 0.0
    accuracy_rate = correct / total if total else 0.0
    by_topic: dict[int, dict[str, Any]] = {}
    for attempt in attempts:
        topic = attempt.exercise.topic if attempt.exercise is not None else None
        topic_id = int(topic.id) if topic is not None else 0
        bucket = by_topic.setdefault(
            topic_id,
            {
                "topicId": topic_id,
                "topicName": topic.name if topic is not None else "General",
                "attempts": 0,
                "correct": 0,
            },
        )
        bucket["attempts"] += 1
        bucket["correct"] += 1 if attempt.is_correct else 0

    dominio_por_rama = []
    for item in by_topic.values():
        attempts_count = int(item["attempts"])
        dominio_por_rama.append(
            {
                **item,
                "accuracy": round((item["correct"] / attempts_count) * 100, 2) if attempts_count else 0,
                "dominio": round((item["correct"] / attempts_count) * 100, 2) if attempts_count else 0,
            },
        )

    return {
        "totals": {
            "attempts": total,
            "correct": correct,
            "incorrect": total - correct,
            "trackedSkills": len(mastery_rows),
        },
        "rates": {
            "accuracyRate": round(accuracy_rate, 4),
            "assistanceRate": 0.0,
            "stabilityRate": round(mastery_average, 4),
            "averageDifficulty": 1.0,
        },
        "dominioGlobal": round(mastery_average * 100, 2) if mastery_rows else round(accuracy_rate * 100, 2),
        "indiceAbstraccion": round((mastery_average * 0.6 + accuracy_rate * 0.4) * 100, 2),
        "dominioPorRama": dominio_por_rama,
    }


def _retention_summary(db: Session, user_id: int) -> dict[str, Any]:
    rows = db.scalars(select(UserMastery).where(UserMastery.user_id == user_id)).all()
    if not rows:
        return {
            "trackedSkills": 0,
            "dueSkills": 0,
            "averageForgetIndex": 0.0,
            "averageMastery": 0.0,
        }

    now = _utcnow()
    priorities = [calculate_review_priority(float(row.mastery_score), row.last_updated, now=now) for row in rows]
    due = [priority for priority in priorities if priority >= 0.85]
    average_mastery = sum(float(row.mastery_score) for row in rows) / len(rows)
    return {
        "trackedSkills": len(rows),
        "dueSkills": len(due),
        "averageForgetIndex": round(sum(priorities) / len(priorities), 4),
        "averageMastery": round(average_mastery, 4),
    }


def _retention_profile(db: Session, user_id: int) -> list[dict[str, Any]]:
    """
    ML-Enhanced: Ebbinghaus + SM-2 + Leitner system.
    Replaces simple priority calculation with advanced retention modeling.
    """
    from backend.ml_improvements import BayesianPredictiveModel
    
    now = _utcnow()
    rows = db.scalars(select(UserMastery).where(UserMastery.user_id == user_id)).all()
    profile = []
    
    for row in rows:
        days_since = (now - row.last_updated).days if row.last_updated else 0
        mastery_level = float(row.mastery_score)
        
        # Use Ebbinghaus curve for forget index
        forget_index = BayesianPredictiveModel.calculate_forgetting_probability(
            days_since_practice=days_since,
            mastery_level=mastery_level,
            criticality=1.5  # Skills are critical by default
        )
        
        profile.append(
            {
                "skillId": f"topic_{row.topic_id}",
                "topicId": row.topic_id,
                "skillName": row.topic.name if row.topic is not None else f"Topic {row.topic_id}",
                "mastery": _mastery_percent(mastery_level),
                "forgetIndex": round(forget_index * 100, 1),  # Convert to percentage
                "due": forget_index > 0.5,  # Due if >50% chance of forgetting
                "lastSeenAt": row.last_updated.isoformat() if row.last_updated else None,
                "daysSincePractice": days_since,
            },
        )
    
    return sorted(profile, key=lambda item: item["forgetIndex"], reverse=True)


def _predictive_payload(analytics: dict[str, Any], retention: dict[str, Any]) -> dict[str, Any]:
    """
    ML-Enhanced: Bayesian risk assessment with confidence intervals.
    Replaces simple weighted average with IRT-based prediction.
    """
    accuracy = float(analytics.get("rates", {}).get("accuracyRate") or 0.0)
    stability = float(analytics.get("rates", {}).get("stabilityRate") or 0.0)
    retention_idx = float(retention.get("averageForgetIndex") or 0.0)

    return improved_predictive_payload(
        analytics={
            "rates": {
                "accuracyRate": accuracy,
                "stabilityRate": stability,
            }
        },
        retention={
            "averageForgetIndex": retention_idx
        }
    )


@router.post("/adaptive/recommendation")
async def get_adaptive_recommendation(
    payload: dict[str, Any] = Body(default_factory=dict),
    db: Session = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    """
    ML-Enhanced: Thompson Sampling for skill recommendation.
    Balances exploration (new skills) with exploitation (reinforcing known skills).
    """
    from backend.ml_improvements import BayesianPredictiveModel
    import random
    
    target_user_id = _resolve_target_user_id(payload, current_user)
    mastery_rows = {
        row.topic_id: float(row.mastery_score)
        for row in db.scalars(select(UserMastery).where(UserMastery.user_id == target_user_id)).all()
    }
    topics = db.scalars(select(Topic).limit(100)).all()
    
    selected = None
    if topics:
        # Thompson Sampling: Sample from each topic's Beta distribution and pick highest
        topic_scores = []
        for topic in topics:
            mastery = mastery_rows.get(topic.id, 0.0)
            # Model: mastery successes out of 100 attempts
            successes = int(mastery * 100)
            failures = 100 - successes
            
            # Thompson Sampling: Draw from Beta(successes+1, failures+1)
            sampled_value = random.betavariate(successes + 1, failures + 1)
            # Add exploration bonus for untested topics
            if topic.id not in mastery_rows:
                sampled_value += 0.3  # Exploration bonus
            
            topic_scores.append((topic, sampled_value))
        
        # Select topic with highest sampled value
        selected = max(topic_scores, key=lambda x: x[1])[0]

    mastery = mastery_rows.get(selected.id, 0.0) if selected is not None else 0.0
    
    # Determine mode based on mastery level
    if mastery < 0.4:
        mode = "review"
        reason = "struggling"
    elif mastery > 0.8:
        mode = "challenge"
        reason = "ready-for-challenge"
    else:
        mode = "practice"
        reason = "consolidation"
    
    recommendation = {
        "nextSkill": _topic_skill_payload(selected, mastery) if selected is not None else None,
        "mode": mode,
        "learningMode": payload.get("learningMode") or "curriculum",
        "reason": reason if selected is not None else "fallback",
        "recommendedDifficulty": _app_difficulty_to_ten(selected.difficulty_level if selected is not None else 0.5),
        "recommendedQuestionType": "input",
        "suggestedProblemMix": "contextualized",
        "telemetry": {
            "trackedSkills": len(mastery_rows),
            "availableSkills": len(topics),
            "dueSkills": _retention_summary(db, target_user_id)["dueSkills"],
            "samplingMethod": "thompson-sampling",  # Identify enhanced method
        },
    }
    return {"success": True, "recommendation": recommendation, "data": {"recommendation": recommendation}}


@router.post("/retention/profile")
async def get_retention_profile(
    payload: dict[str, Any] = Body(default_factory=dict),
    db: Session = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    target_user_id = _resolve_target_user_id(payload, current_user)
    profile = _retention_profile(db, target_user_id)
    summary = _retention_summary(db, target_user_id)
    return {
        "success": True,
        "userId": target_user_id,
        "summary": summary,
        "profile": profile,
        "data": {"summary": summary, "profile": profile},
    }


@router.post("/retention/due")
async def get_retention_due(
    payload: dict[str, Any] = Body(default_factory=dict),
    db: Session = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    target_user_id = _resolve_target_user_id(payload, current_user)
    limit = max(1, min(_safe_int(payload.get("limit"), 10) or 10, 50))
    due = [item for item in _retention_profile(db, target_user_id) if item["due"]][:limit]
    return {"success": True, "userId": target_user_id, "due": due, "data": {"due": due}}


@router.post("/analytics/student")
async def get_student_analytics(
    payload: dict[str, Any] = Body(default_factory=dict),
    db: Session = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    target_user_id = _resolve_target_user_id(payload, current_user)
    analytics = _student_analytics(db, target_user_id)
    retention = _retention_summary(db, target_user_id)
    predictive = _predictive_payload(analytics, retention)
    return {
        "success": True,
        "userId": target_user_id,
        "analytics": analytics,
        "retention": retention,
        "predictive": predictive,
        "data": {"analytics": analytics, "retention": retention, "predictive": predictive},
    }


@router.get("/analytics/admin")
async def get_admin_analytics(
    db: Session = Depends(get_db),
    _admin_user: UserOut = Depends(require_admin),
):
    total_users = db.query(User).count()
    total_attempts = db.query(Attempt).count()
    total_topics = db.query(Topic).count()
    total_exercises = db.query(Exercise).count()
    correct_attempts = db.query(Attempt).filter(Attempt.is_correct.is_(True)).count()
    admin = {
        "totals": {
            "users": total_users,
            "attempts": total_attempts,
            "topics": total_topics,
            "exercises": total_exercises,
        },
        "rates": {
            "accuracyRate": round(correct_attempts / total_attempts, 4) if total_attempts else 0.0,
        },
        "generatedAt": _utc_iso(),
    }
    return {"success": True, "admin": admin, "data": {"admin": admin}}


@router.post("/analytics/teacher")
async def get_teacher_analytics(
    payload: dict[str, Any] = Body(default_factory=dict),
    db: Session = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    user_ids_data = payload.get("userIds")
    raw_user_ids: list[Any] = user_ids_data if isinstance(user_ids_data, list) else [current_user.id]
    user_ids = [_safe_int(item) for item in raw_user_ids]
    user_ids = [item for item in user_ids if item is not None]
    if any(user_id != current_user.id for user_id in user_ids) and _normalize_role(current_user.role) != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot access cohort analytics")

    students = [
        {
            "userId": user_id,
            "analytics": _student_analytics(db, user_id),
            "retention": _retention_summary(db, user_id),
        }
        for user_id in user_ids
    ]
    cohort = {
        "students": len(students),
        "totalAttempts": sum(int(item["analytics"]["totals"]["attempts"]) for item in students),
        "averageDominioGlobal": round(
            sum(float(item["analytics"]["dominioGlobal"]) for item in students) / len(students),
            2,
        )
        if students
        else 0,
    }
    return {"success": True, "cohort": cohort, "students": students, "data": {"cohort": cohort, "students": students}}


@router.get("/analytics/ranking")
async def get_abstraction_ranking(
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    _current_user: UserOut = Depends(get_current_user),
):
    users = db.scalars(select(User).limit(limit)).all()
    ranking = []
    for user in users:
        analytics = _student_analytics(db, user.id)
        ranking.append(
            {
                "userId": user.id,
                "email": user.email,
                "indiceAbstraccion": analytics["indiceAbstraccion"],
                "dominioGlobal": analytics["dominioGlobal"],
            },
        )
    ranking.sort(key=lambda item: item["indiceAbstraccion"], reverse=True)
    return {"success": True, "ranking": ranking[:limit], "data": {"ranking": ranking[:limit]}}


@router.post("/predictive/outcomes")
async def get_predictive_outcomes(
    payload: dict[str, Any] = Body(default_factory=dict),
    db: Session = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    target_user_id = _resolve_target_user_id(payload, current_user)
    analytics = _student_analytics(db, target_user_id)
    retention = _retention_summary(db, target_user_id)
    predictive = _predictive_payload(analytics, retention)
    return {"success": True, "userId": target_user_id, "predictive": predictive, "data": {"predictive": predictive}}


@router.post("/master-context")
async def get_master_context(
    payload: dict[str, Any] = Body(default_factory=dict),
    db: Session = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    target_user_id = _resolve_target_user_id(payload, current_user)
    grades = list_curriculum_grades(db)
    branches = list_curriculum_branches(db)
    recommendation = (await get_adaptive_recommendation(payload, db, current_user))["recommendation"]
    context = {
        "product": {
            "name": "Mathlingo",
            "mode": "adaptive-learning",
            "aiProvider": "fallback-ready",
        },
        "modules": {
            "domainGraph": True,
            "adaptiveEngine": True,
            "evaluationEngine": True,
            "analyticsEngine": True,
            "retentionLayer": True,
            "predictiveLayer": True,
        },
        "userId": target_user_id,
        "recommendation": recommendation,
        "curriculum": {
            "grades": len(grades),
            "branches": len(branches),
            "selectedGrade": payload.get("grade") or payload.get("gradeId"),
        },
    }
    return {"success": True, **context, "data": context}


@router.post("/level/update")
async def update_level(
    payload: dict[str, Any] = Body(default_factory=dict),
    db: Session = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    """
    ML-Enhanced: Desirable Difficulty + Adaptive adjustment.
    Replaces simple heuristic with Bayesian-based difficulty adjustment.
    """
    _ = db
    _ = current_user
    current_difficulty = _safe_float(payload.get("currentDifficulty"), 1.0)
    accuracy_rate = _safe_float(payload.get("accuracyRate"), 0.0)
    average_time_ms = _safe_float(payload.get("averageTimeMs"), 120000.0)
    streak = _safe_int(payload.get("streak"), 0) or 0

    # Use improved adaptive difficulty adjuster
    result = improved_level_update(
        current_difficulty=current_difficulty,
        accuracy_rate=accuracy_rate,
        average_time_ms=average_time_ms,
        streak=streak
    )

    return {**result, "data": result}


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
