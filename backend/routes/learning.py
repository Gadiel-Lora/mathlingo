"""Learning routes used by the Mathlingo frontend dashboard."""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Body, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.core.database import get_db
from backend.core.security import get_current_user
from backend.models.attempt import Attempt
from backend.models.exercise import Exercise
from backend.models.topic import Topic
from backend.models.user_mastery import UserMastery
from backend.schemas.user import UserOut
from backend.services.academic_service import list_curriculum_grades
from backend.services.mastery_engine import update_mastery

router = APIRouter(prefix="/api/learning", tags=["Learning"])


def _normalize_path_type(value: Any) -> str:
    normalized = str(value or "").strip().upper()
    if normalized in {"AUTONOMO", "AUTONOMOUS", "AUTO"}:
        return "AUTONOMOUS"
    if normalized in {"HYBRID", "HIBRIDO"}:
        return "HYBRID"
    return "GRADE"


def _mastery_percent(value: float | None) -> int:
    raw = float(value or 0.0)
    return max(0, min(100, round(raw * 100 if raw <= 1 else raw)))


def _first_grade(db: Session) -> dict[str, Any] | None:
    grades = list_curriculum_grades(db)
    return grades[0] if grades else None


def _decorate_grade_map(grade: dict[str, Any] | None, mastery_by_topic: dict[str, int]) -> dict[str, Any] | None:
    if not grade:
        return None

    decorated = {**grade, "areas": []}
    first_active = False
    for area in grade.get("areas", []):
        next_area = {**area, "topics": []}
        for topic in area.get("topics", []):
            next_topic = {**topic, "lessons": []}
            topic_mastery = mastery_by_topic.get(str(topic.get("id")), 0)
            for lesson in topic.get("lessons", []):
                status_value = "COMPLETED" if topic_mastery >= 85 else "ACTIVE" if not first_active else "LOCKED"
                if status_value == "ACTIVE":
                    first_active = True
                next_topic["lessons"].append(
                    {
                        **lesson,
                        "mastery": topic_mastery,
                        "status": status_value,
                    },
                )
            next_area["topics"].append(next_topic)
        decorated["areas"].append(next_area)
    return decorated


def _build_constellation(db: Session, mastery_by_topic_id: dict[int, float]) -> dict[str, Any]:
    topics = db.scalars(select(Topic).limit(80)).all()
    nodes = []
    for topic in topics:
        mastery = _mastery_percent(mastery_by_topic_id.get(topic.id, 0.0))
        nodes.append(
            {
                "id": f"topic_{topic.id}",
                "name": topic.name,
                "mastery": mastery,
                "state": "mastered" if mastery >= 85 else "unlocked" if mastery > 0 else "available",
                "difficulty": max(1, min(10, round(float(topic.difficulty_level or 0.5) * 5))),
            },
        )

    branch_progress = [
        {"id": node["id"], "mastery": node["mastery"]}
        for node in nodes[:12]
    ]
    recommendation = next((node for node in nodes if node["mastery"] < 85), nodes[0] if nodes else None)
    return {
        "nodes": nodes,
        "links": [],
        "recommendation": recommendation,
        "ancestorRecommendation": None,
        "branchProgress": branch_progress,
    }


@router.get("/overview")
async def get_learning_overview(
    db: Session = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    mastery_rows = db.scalars(
        select(UserMastery).where(UserMastery.user_id == current_user.id),
    ).all()
    mastery_by_topic_id = {row.topic_id: float(row.mastery_score) for row in mastery_rows}
    mastery_by_topic = {str(row.topic_id): _mastery_percent(row.mastery_score) for row in mastery_rows}

    grade = _first_grade(db)
    grade_map = _decorate_grade_map(grade, mastery_by_topic)
    constellation = _build_constellation(db, mastery_by_topic_id)
    overview = {
        "profile": {
            "id": current_user.id,
            "email": current_user.email,
            "role": current_user.role.upper(),
            "grade": grade,
        },
        "gradeMap": grade_map,
        "constellation": constellation,
        "skillProgress": [
            {
                "skillId": f"topic_{row.topic_id}",
                "topicId": row.topic_id,
                "skillName": row.topic.name if row.topic is not None else f"Topic {row.topic_id}",
                "mastery": _mastery_percent(row.mastery_score),
            }
            for row in mastery_rows
        ],
    }
    return {"success": True, "overview": overview, "data": {"overview": overview}}


@router.post("/path")
async def update_learning_path(
    payload: dict[str, Any] = Body(default_factory=dict),
    db: Session = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    _ = db
    selected_path_type = _normalize_path_type(payload.get("selectedPathType"))
    return {
        "success": True,
        "ok": True,
        "userId": current_user.id,
        "selectedPathType": selected_path_type,
        "learningPathId": payload.get("learningPathId"),
        "data": {"selectedPathType": selected_path_type, "learningPathId": payload.get("learningPathId")},
    }


@router.post("/events/answer")
async def record_answer_event(
    payload: dict[str, Any] = Body(default_factory=dict),
    db: Session = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    exercise_id = payload.get("exerciseId") or payload.get("exercise_id") or payload.get("problemId")
    parsed_exercise_id = int(exercise_id) if str(exercise_id or "").isdigit() else None
    is_correct = bool(payload.get("isCorrect") if "isCorrect" in payload else payload.get("correct"))

    attempt_id = None
    mastery_payload = None
    if parsed_exercise_id is not None:
        exercise = db.get(Exercise, parsed_exercise_id)
        if exercise is not None:
            attempt = Attempt(user_id=current_user.id, exercise_id=exercise.id, is_correct=is_correct)
            db.add(attempt)
            try:
                mastery = update_mastery(
                    db,
                    current_user.id,
                    exercise.topic_id,
                    is_correct=is_correct,
                    difficulty=float(exercise.difficulty),
                    criticality_level=int(exercise.topic.criticality_level if exercise.topic else 1),
                )
                attempt_id = attempt.id
                mastery_payload = {
                    "topicId": mastery.topic_id,
                    "mastery": _mastery_percent(mastery.mastery_score),
                }
            except Exception as exc:
                db.rollback()
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Answer event could not be saved",
                ) from exc

    event = {
        "type": "ANSWER_SUBMITTED",
        "attemptId": attempt_id,
        "skillId": payload.get("skillId"),
        "lessonId": payload.get("lessonId"),
        "isCorrect": is_correct,
        "xpGained": int(payload.get("xpGained") or 0),
        "mastery": mastery_payload,
    }
    return {"success": True, "ok": True, "event": event, "data": event}


@router.post("/events/hint")
async def record_hint_event(
    payload: dict[str, Any] = Body(default_factory=dict),
    db: Session = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    _ = db
    event = {
        "type": "HINT_REQUESTED",
        "userId": current_user.id,
        "skillId": payload.get("skillId"),
        "lessonId": payload.get("lessonId"),
        "context": payload.get("context") if isinstance(payload.get("context"), dict) else {},
    }
    return {"success": True, "ok": True, "response": event, "data": event}


@router.post("/events/lesson-completed")
async def record_lesson_completed(
    payload: dict[str, Any] = Body(default_factory=dict),
    db: Session = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    _ = db
    lesson_id = str(payload.get("lessonId") or "").strip()
    if not lesson_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="lessonId is required")

    event = {
        "type": "LESSON_COMPLETED",
        "userId": current_user.id,
        "lessonId": lesson_id,
        "skillId": payload.get("skillId"),
        "masteryPercentage": int(payload.get("masteryPercentage") or 100),
    }
    return {"success": True, "ok": True, "response": event, "data": event}
