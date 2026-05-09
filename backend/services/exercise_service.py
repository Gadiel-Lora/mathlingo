"""Exercise management and AI-powered generation."""
from __future__ import annotations

import hashlib
import json
import logging
import re
from pathlib import Path
from typing import Any

import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.core.config import settings
from backend.models.exercise import Exercise
from backend.models.topic import Topic
from backend.models.user_mastery import UserMastery

logger = logging.getLogger(__name__)

AI_TUTOR_BASE_URL = settings.AI_TUTOR_URL.rstrip("/")
MIN_APP_DIFFICULTY = 0.1
MAX_APP_DIFFICULTY = 2.0
ERROR_CATEGORIES = {"ARITHMETIC", "CONCEPTUAL", "PROCEDURAL", "NOTATIONAL", "READING"}


def _clamp(value: float, min_value: float, max_value: float) -> float:
    return max(min_value, min(max_value, value))


def normalize_app_difficulty(value: float) -> float:
    """Accept backend [0.1, 2.0] or legacy/frontend [1, 10] difficulty scales."""
    raw = float(value)
    if raw > MAX_APP_DIFFICULTY:
        raw = raw / 5
    return _clamp(raw, MIN_APP_DIFFICULTY, MAX_APP_DIFFICULTY)


def _slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "_", value.strip().lower())
    return slug.strip("_") or "math_skill"


def _app_to_ai_difficulty(difficulty: float) -> int:
    """Map backend difficulty [0.1, 2.0] to AI Tutor prompt difficulty [1, 10]."""
    app_difficulty = normalize_app_difficulty(difficulty)
    return int(_clamp(round(app_difficulty * 5), 1, 10))


def _mastery_to_ai_percent(mastery_level: float) -> int:
    """AI Tutor prompts expect mastery as a percentage, while backend stores 0.0-1.0."""
    raw = float(mastery_level)
    percent = raw * 100 if raw <= 1.0 else raw
    return int(_clamp(round(percent), 0, 100))


def _normalize_error_type(error_type: str | None) -> str | None:
    if not error_type:
        return None
    normalized = str(error_type).strip().upper()
    return normalized if normalized in ERROR_CATEGORIES else None


def _extract_generated_exercise(payload: dict[str, Any]) -> dict[str, Any] | None:
    exercise = payload.get("exercise")
    if not isinstance(exercise, dict):
        return None

    statement = str(exercise.get("statement") or "").strip()
    correct_answer = str(exercise.get("correctAnswer") or "").strip()
    if not statement or not correct_answer:
        return None
    return exercise


def _string_list(value: Any, fallback: list[str]) -> list[str]:
    if isinstance(value, list):
        return [str(item) for item in value if str(item).strip()]
    if isinstance(value, str) and value.strip():
        return [value.strip()]
    return fallback


def _fallback_numbers(skill_name: str, difficulty: float) -> tuple[str, str, list[str]]:
    """Generate a deterministic local exercise when the AI service is offline."""
    seed = int(hashlib.sha256(f"{skill_name}:{difficulty:.2f}".encode()).hexdigest()[:8], 16)
    app_difficulty = normalize_app_difficulty(difficulty)

    if app_difficulty < 0.7:
        left = seed % 9 + 2
        right = (seed // 10) % 9 + 2
        answer = left + right
        return (
            f"Calcula {left} + {right}.",
            str(answer),
            [f"Suma {left} y {right}.", f"El resultado es {answer}."],
        )

    if app_difficulty < 1.3:
        x = seed % 8 + 2
        addend = (seed // 10) % 9 + 3
        total = x + addend
        return (
            f"Resuelve la ecuacion x + {addend} = {total}.",
            str(x),
            [f"Resta {addend} a ambos lados.", f"x = {total} - {addend} = {x}."],
        )

    x = seed % 7 + 2
    coefficient = (seed // 10) % 4 + 2
    addend = (seed // 100) % 9 + 2
    total = coefficient * x + addend
    return (
        f"Resuelve la ecuacion {coefficient}x + {addend} = {total}.",
        str(x),
        [
            f"Resta {addend} a ambos lados.",
            f"{coefficient}x = {total - addend}.",
            f"Divide entre {coefficient}: x = {x}.",
        ],
    )


class ExerciseService:
    """Service for managing and generating exercises with AI support."""

    @staticmethod
    async def get_exercise_by_id(db: Session, exercise_id: int) -> Exercise | None:
        stmt = select(Exercise).where(Exercise.id == exercise_id)
        return db.scalars(stmt).first()

    @staticmethod
    async def get_exercises_by_topic(db: Session, topic_id: int, limit: int = 10) -> list[Exercise]:
        stmt = select(Exercise).where(Exercise.topic_id == topic_id).limit(limit)
        return list(db.scalars(stmt).all())

    @staticmethod
    async def get_adaptive_exercise(
        db: Session,
        user_id: int,
        topic_id: int,
        exclude_ids: list[int] | None = None,
    ) -> Exercise | None:
        """Select an exercise based on the user's mastery for the requested topic."""
        exclude_ids = exclude_ids or []

        mastery = db.scalars(
            select(UserMastery).where(
                (UserMastery.user_id == user_id) & (UserMastery.topic_id == topic_id),
            ),
        ).first()
        mastery_level = float(mastery.mastery_score) if mastery else 0.0

        if mastery_level < 0.3:
            min_diff, max_diff = 0.1, 0.6
        elif mastery_level < 0.6:
            min_diff, max_diff = 0.4, 1.2
        else:
            min_diff, max_diff = 1.0, 2.0

        filters = [
            Exercise.topic_id == topic_id,
            Exercise.difficulty >= min_diff,
            Exercise.difficulty <= max_diff,
        ]
        if exclude_ids:
            filters.append(~Exercise.id.in_(exclude_ids))

        candidates = list(db.scalars(select(Exercise).where(*filters).limit(5)).all())
        if candidates:
            return candidates[0]

        fallback_filters = [Exercise.topic_id == topic_id]
        if exclude_ids:
            fallback_filters.append(~Exercise.id.in_(exclude_ids))

        return db.scalars(select(Exercise).where(*fallback_filters).limit(1)).first()

    @staticmethod
    async def generate_exercise_with_ai(
        skill_name: str,
        difficulty: float,
        mastery_level: float,
        error_type: str | None = None,
        *,
        user_id: int | str = "system",
        previous_exercises: list[dict[str, Any]] | None = None,
    ) -> dict[str, Any]:
        """Generate an exercise through AI Tutor, falling back locally if unavailable."""
        app_difficulty = normalize_app_difficulty(difficulty)
        ai_difficulty = _app_to_ai_difficulty(app_difficulty)
        ai_mastery = _mastery_to_ai_percent(mastery_level)
        safe_skill_name = skill_name.strip() or "Matematica"

        payload = {
            "skill": {
                "id": f"skill_{_slugify(safe_skill_name)}",
                "name": safe_skill_name,
                "description": f"Practica de {safe_skill_name}",
                "domain": "math",
                "difficulty": ai_difficulty,
                "prerequisites": [],
            },
            "difficulty": ai_difficulty,
            "masteryLevel": ai_mastery,
            "previousExercises": previous_exercises or [],
            "errorType": _normalize_error_type(error_type),
        }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{AI_TUTOR_BASE_URL}/api/ai-tutor/exercise",
                    json=payload,
                    headers={"x-user-id": str(user_id)},
                )

            if response.status_code == 200:
                data = response.json()
                exercise_data = _extract_generated_exercise(data)
                if exercise_data:
                    logger.info("AI Tutor generated exercise for %s", safe_skill_name)
                    return {
                        "id": f"ai_gen_{exercise_data.get('id', 'unknown')}",
                        "statement": exercise_data["statement"],
                        "correctAnswer": exercise_data["correctAnswer"],
                        "solutionSteps": _string_list(exercise_data.get("solutionSteps"), []),
                        "type": "generated",
                        "source": "ai-tutor",
                        "difficulty": app_difficulty,
                        "keyConceptsTested": _string_list(
                            exercise_data.get("keyConceptsTested"),
                            [safe_skill_name],
                        ),
                    }

                logger.warning("AI Tutor returned an invalid exercise payload: %s", data)
            else:
                logger.warning("AI Tutor returned HTTP %s: %s", response.status_code, response.text[:300])
        except Exception as exc:
            logger.warning("AI Tutor exercise generation failed: %s", exc)

        return ExerciseService._fallback_exercise(safe_skill_name, app_difficulty)

    @staticmethod
    def _fallback_exercise(skill_name: str, difficulty: float) -> dict[str, Any]:
        statement, correct_answer, steps = _fallback_numbers(skill_name, difficulty)
        return {
            "id": f"fallback_{_slugify(skill_name)}_{difficulty:.2f}",
            "statement": f"{skill_name}: {statement}",
            "correctAnswer": correct_answer,
            "solutionSteps": steps,
            "type": "generated",
            "source": "fallback",
            "difficulty": difficulty,
            "keyConceptsTested": [skill_name],
        }

    @staticmethod
    def to_ai_problem_payload(exercise: Exercise) -> dict[str, Any]:
        return {
            "id": str(exercise.id),
            "skillId": f"topic_{exercise.topic_id}",
            "difficulty": _app_to_ai_difficulty(float(exercise.difficulty)),
            "statement": exercise.question,
            "correctAnswer": exercise.answer,
            "solutionSteps": [],
        }

    @staticmethod
    async def seed_exercises(db: Session) -> int:
        """Load seed exercises for topics that already exist in the database."""
        seed_path = Path(__file__).resolve().parent.parent / "data" / "exercises_seed.json"
        if not seed_path.exists():
            logger.warning("Seed file not found: %s", seed_path)
            return 0

        seed_data = json.loads(seed_path.read_text(encoding="utf-8-sig"))
        count = 0

        for exercise_data in seed_data.get("exercises", []):
            topic_id = int(exercise_data["topic_id"])
            if db.get(Topic, topic_id) is None:
                logger.info("Skipping exercise seed for missing topic_id=%s", topic_id)
                continue

            existing = (
                db.query(Exercise)
                .filter(
                    Exercise.topic_id == topic_id,
                    Exercise.question == exercise_data["statement"],
                )
                .first()
            )
            if existing:
                continue

            db.add(
                Exercise(
                    topic_id=topic_id,
                    difficulty=float(exercise_data["difficulty"]),
                    question=str(exercise_data["statement"]),
                    answer=str(exercise_data["correct_answer"]),
                ),
            )
            count += 1

        if count:
            db.commit()
            logger.info("Seeded %s exercises", count)

        return count
