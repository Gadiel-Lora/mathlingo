"""Administrative routes for the Mathlingo frontend panel."""
from __future__ import annotations

import re
from typing import Any

from fastapi import APIRouter, Body, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from backend.core.database import get_db
from backend.core.security import require_admin
from backend.models.grade import Grade
from backend.models.pathway import Pathway
from backend.models.subject import Subject
from backend.models.user import User
from backend.schemas.user import UserOut

router = APIRouter(prefix="/api/admin", tags=["Admin"])

GRADE_STAGES = ["PRIMARY", "SECONDARY", "PRE_UNIVERSITY"]
PATH_TYPES = ["GRADE", "AUTONOMOUS", "HYBRID"]
USER_ROLES = ["STUDENT", "TEACHER", "ADMIN"]


def _sanitize(value: Any) -> str:
    return str(value or "").strip()


def _slugify(value: Any) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", _sanitize(value).lower()).strip("-")
    return slug or "ruta"


def _int_value(value: Any, fallback: int = 0) -> int:
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return fallback


def _bool_value(value: Any, fallback: bool = False) -> bool:
    if isinstance(value, bool):
        return value
    normalized = _sanitize(value).lower()
    if normalized in {"1", "true", "yes", "si"}:
        return True
    if normalized in {"0", "false", "no"}:
        return False
    return fallback


def _normalize_stage(value: Any) -> str:
    normalized = _sanitize(value).upper()
    return normalized if normalized in GRADE_STAGES else "SECONDARY"


def _normalize_role_for_response(value: Any) -> str:
    normalized = _sanitize(value).upper()
    if normalized == "USER":
        return "STUDENT"
    return normalized if normalized in USER_ROLES else "STUDENT"


def _normalize_role_for_db(value: Any) -> str:
    response_role = _normalize_role_for_response(value)
    return "user" if response_role == "STUDENT" else response_role.lower()


def _grade_code(grade: Grade) -> str:
    number = int(grade.grade_number or 0)
    return f"G{number}" if number else grade.id.upper()


def _grade_stage(grade: Grade) -> str:
    label = _sanitize(grade.level_name).lower()
    if "primar" in label or int(grade.grade_number or 0) <= 6:
        return "PRIMARY"
    if "pre" in label or "univers" in label:
        return "PRE_UNIVERSITY"
    return "SECONDARY"


def _format_grade(grade: Grade) -> dict[str, Any]:
    lesson_count = 0
    topic_count = 0
    for area in grade.areas or []:
        for topic in area.topics or []:
            topic_count += 1
            lesson_count += len(topic.lessons or [])

    return {
        "id": grade.id,
        "code": _grade_code(grade),
        "name": grade.name,
        "order": int(grade.grade_number or 0),
        "stage": _grade_stage(grade),
        "levelName": grade.level_name or "Secundaria",
        "foundationStyle": "singapore-finland",
        "isPreUniversity": _grade_stage(grade) == "PRE_UNIVERSITY",
        "counts": {
            "users": 0,
            "routes": 0,
            "bimesters": len(grade.areas or []),
            "lessons": lesson_count,
            "skills": topic_count,
        },
    }


def _subject_code(subject: Subject) -> str:
    words = [_sanitize(part) for part in subject.name.split() if _sanitize(part)]
    if len(words) > 1:
        return "".join(word[0].upper() for word in words[:3])
    return (subject.name[:4] or f"S{subject.id}").upper()


def _format_subject(subject: Subject) -> dict[str, Any]:
    return {
        "id": subject.id,
        "code": _subject_code(subject),
        "name": subject.name,
        "description": subject.description,
        "counts": {
            "routes": len(subject.pathways or []),
        },
    }


def _format_learning_path(path: Pathway) -> dict[str, Any]:
    path_type = "AUTONOMOUS" if "auto" in _sanitize(path.name).lower() else "GRADE"
    return {
        "id": path.id,
        "slug": _slugify(path.name),
        "name": path.name,
        "description": path.description,
        "type": path_type,
        "isAutonomous": path_type == "AUTONOMOUS",
        "isDefault": int(path.order or 0) == 0,
        "gradeId": None,
        "subjectId": path.subject_id,
        "grade": None,
        "subject": {
            "id": path.subject.id,
            "name": path.subject.name,
            "code": _subject_code(path.subject),
        }
        if path.subject is not None
        else None,
        "userCount": 0,
        "sequenceCount": len(path.modules or []),
    }


def _permissions(role: str) -> dict[str, Any]:
    normalized = _normalize_role_for_response(role)
    is_admin = normalized == "ADMIN"
    is_teacher = normalized == "TEACHER"
    return {
        "role": normalized,
        "isAdmin": is_admin,
        "isTeacher": is_teacher,
        "isStudent": normalized == "STUDENT",
        "isStaff": is_admin or is_teacher,
        "canAccessAdminPanel": is_admin,
        "canManageUsers": is_admin,
        "canManageCurriculum": is_admin,
        "canManageSubjects": is_admin,
        "canManageLearningPaths": is_admin,
        "canViewOwnAnalytics": True,
        "canViewCohortAnalytics": is_admin or is_teacher,
    }


def _format_user(user: User, db: Session) -> dict[str, Any]:
    first_grade = db.query(Grade).order_by(Grade.grade_number.asc()).first()
    total_xp = sum(progress.xp for progress in user.progress or [])
    role = _normalize_role_for_response(user.role)
    full_name = user.email.split("@")[0].replace(".", " ").title()
    return {
        "id": user.id,
        "email": user.email,
        "fullName": full_name,
        "role": role,
        "gradeId": first_grade.id if first_grade else "",
        "learningPathId": None,
        "selectedPathType": "GRADE",
        "learningStyle": "visual",
        "gradeLockEnabled": True,
        "totalXP": total_xp,
        "currentLevel": max(1, total_xp // 100 + 1),
        "currentStreak": 0,
        "createdAt": None,
        "lastActivityAt": None,
        "grade": {"id": first_grade.id, "name": first_grade.name, "code": _grade_code(first_grade)} if first_grade else None,
        "learningPath": None,
        "permissions": _permissions(role),
    }


def _subject_or_default(db: Session, subject_id: Any = None) -> Subject:
    parsed_id = _int_value(subject_id, 0)
    if parsed_id:
        subject = db.get(Subject, parsed_id)
        if subject is not None:
            return subject
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subject not found")

    subject = db.query(Subject).order_by(Subject.id.asc()).first()
    if subject is not None:
        return subject

    subject = Subject(name="Matematica", description="Materia base de Mathlingo")
    db.add(subject)
    db.flush()
    return subject


@router.get("/meta")
async def get_admin_meta(
    db: Session = Depends(get_db),
    _admin_user: UserOut = Depends(require_admin),
):
    grades = [
        {"id": grade.id, "name": grade.name, "code": _grade_code(grade), "order": int(grade.grade_number or 0)}
        for grade in db.query(Grade).order_by(Grade.grade_number.asc()).all()
    ]
    subjects = [
        {"id": subject.id, "name": subject.name, "code": _subject_code(subject)}
        for subject in db.query(Subject).order_by(Subject.name.asc()).all()
    ]
    learning_paths = [
        {
            "id": path.id,
            "name": path.name,
            "slug": _slugify(path.name),
            "type": "AUTONOMOUS" if "auto" in _sanitize(path.name).lower() else "GRADE",
            "gradeId": None,
            "subjectId": path.subject_id,
        }
        for path in db.query(Pathway).order_by(Pathway.order.asc(), Pathway.name.asc()).all()
    ]
    return {
        "success": True,
        "grades": grades,
        "subjects": subjects,
        "learningPaths": learning_paths,
        "enums": {
            "gradeStages": GRADE_STAGES,
            "pathTypes": PATH_TYPES,
            "userRoles": USER_ROLES,
        },
    }


@router.get("/grades")
async def list_grades(
    db: Session = Depends(get_db),
    _admin_user: UserOut = Depends(require_admin),
):
    grades = [_format_grade(grade) for grade in db.query(Grade).order_by(Grade.grade_number.asc()).all()]
    return {"success": True, "grades": grades, "data": {"grades": grades}}


@router.post("/grades", status_code=status.HTTP_201_CREATED)
async def create_grade(
    payload: dict[str, Any] = Body(default_factory=dict),
    db: Session = Depends(get_db),
    _admin_user: UserOut = Depends(require_admin),
):
    order = _int_value(payload.get("order") or payload.get("gradeNumber"), 0)
    grade_id = _sanitize(payload.get("id")) or f"grade-{order or db.query(Grade).count() + 1}"
    if db.get(Grade, grade_id) is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Grade id already exists")
    if order and db.query(Grade).filter(Grade.grade_number == order).first() is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Grade order already exists")

    grade = Grade(
        id=grade_id,
        name=_sanitize(payload.get("name")) or grade_id,
        grade_number=order or db.query(Grade).count() + 1,
        level_name=_sanitize(payload.get("levelName")) or _normalize_stage(payload.get("stage")).title(),
        objective=_sanitize(payload.get("objective")) or None,
        final_exam=None,
    )
    db.add(grade)
    db.commit()
    db.refresh(grade)
    formatted = _format_grade(grade)
    return {"success": True, "grade": formatted, "data": {"grade": formatted}}


@router.put("/grades/{gradeId}")
async def update_grade(
    gradeId: str,
    payload: dict[str, Any] = Body(default_factory=dict),
    db: Session = Depends(get_db),
    _admin_user: UserOut = Depends(require_admin),
):
    grade = db.get(Grade, gradeId)
    if grade is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Grade not found")

    order = _int_value(payload.get("order") or payload.get("gradeNumber"), grade.grade_number)
    conflict = db.query(Grade).filter(Grade.grade_number == order, Grade.id != grade.id).first()
    if conflict is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Grade order already exists")

    grade.name = _sanitize(payload.get("name")) or grade.name
    grade.grade_number = order
    grade.level_name = _sanitize(payload.get("levelName")) or grade.level_name
    grade.objective = _sanitize(payload.get("objective")) or grade.objective
    db.commit()
    db.refresh(grade)
    formatted = _format_grade(grade)
    return {"success": True, "grade": formatted, "data": {"grade": formatted}}


@router.delete("/grades/{gradeId}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_grade(
    gradeId: str,
    db: Session = Depends(get_db),
    _admin_user: UserOut = Depends(require_admin),
):
    grade = db.get(Grade, gradeId)
    if grade is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Grade not found")
    db.delete(grade)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/subjects")
async def list_subjects(
    db: Session = Depends(get_db),
    _admin_user: UserOut = Depends(require_admin),
):
    subjects = [_format_subject(subject) for subject in db.query(Subject).order_by(Subject.name.asc()).all()]
    return {"success": True, "subjects": subjects, "data": {"subjects": subjects}}


@router.post("/subjects", status_code=status.HTTP_201_CREATED)
async def create_subject(
    payload: dict[str, Any] = Body(default_factory=dict),
    db: Session = Depends(get_db),
    _admin_user: UserOut = Depends(require_admin),
):
    name = _sanitize(payload.get("name"))
    if not name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Subject name is required")
    if db.query(Subject).filter(Subject.name == name).first() is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Subject name already exists")

    subject = Subject(name=name, description=_sanitize(payload.get("description")) or None)
    parsed_id = _int_value(payload.get("id"), 0)
    if parsed_id:
        subject.id = parsed_id
    db.add(subject)
    db.commit()
    db.refresh(subject)
    formatted = _format_subject(subject)
    return {"success": True, "subject": formatted, "data": {"subject": formatted}}


@router.put("/subjects/{subjectId}")
async def update_subject(
    subjectId: int,
    payload: dict[str, Any] = Body(default_factory=dict),
    db: Session = Depends(get_db),
    _admin_user: UserOut = Depends(require_admin),
):
    subject = db.get(Subject, subjectId)
    if subject is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subject not found")
    subject.name = _sanitize(payload.get("name")) or subject.name
    subject.description = _sanitize(payload.get("description")) or subject.description
    db.commit()
    db.refresh(subject)
    formatted = _format_subject(subject)
    return {"success": True, "subject": formatted, "data": {"subject": formatted}}


@router.delete("/subjects/{subjectId}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_subject(
    subjectId: int,
    db: Session = Depends(get_db),
    _admin_user: UserOut = Depends(require_admin),
):
    subject = db.get(Subject, subjectId)
    if subject is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subject not found")
    if (subject.pathways or []) or (subject.topics or []):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Subject has associated content")
    db.delete(subject)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/learning-paths")
async def list_learning_paths(
    db: Session = Depends(get_db),
    _admin_user: UserOut = Depends(require_admin),
):
    paths = [_format_learning_path(path) for path in db.query(Pathway).order_by(Pathway.order.asc(), Pathway.name.asc()).all()]
    return {"success": True, "learningPaths": paths, "data": {"learningPaths": paths}}


@router.post("/learning-paths", status_code=status.HTTP_201_CREATED)
async def create_learning_path(
    payload: dict[str, Any] = Body(default_factory=dict),
    db: Session = Depends(get_db),
    _admin_user: UserOut = Depends(require_admin),
):
    subject = _subject_or_default(db, payload.get("subjectId"))
    name = _sanitize(payload.get("name"))
    if not name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Learning path name is required")

    path = Pathway(
        subject_id=subject.id,
        name=name,
        description=_sanitize(payload.get("description")) or "Ruta creada desde el panel administrativo.",
        order=_int_value(payload.get("order"), 0 if _bool_value(payload.get("isDefault")) else db.query(Pathway).count() + 1),
    )
    parsed_id = _int_value(payload.get("id"), 0)
    if parsed_id:
        path.id = parsed_id
    db.add(path)
    db.commit()
    db.refresh(path)
    formatted = _format_learning_path(path)
    return {"success": True, "learningPath": formatted, "data": {"learningPath": formatted}}


@router.put("/learning-paths/{pathId}")
async def update_learning_path(
    pathId: int,
    payload: dict[str, Any] = Body(default_factory=dict),
    db: Session = Depends(get_db),
    _admin_user: UserOut = Depends(require_admin),
):
    path = db.get(Pathway, pathId)
    if path is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Learning path not found")
    subject = _subject_or_default(db, payload.get("subjectId") or path.subject_id)
    path.subject_id = subject.id
    path.name = _sanitize(payload.get("name")) or path.name
    path.description = _sanitize(payload.get("description")) or path.description
    path.order = _int_value(payload.get("order"), path.order)
    db.commit()
    db.refresh(path)
    formatted = _format_learning_path(path)
    return {"success": True, "learningPath": formatted, "data": {"learningPath": formatted}}


@router.delete("/learning-paths/{pathId}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_learning_path(
    pathId: int,
    db: Session = Depends(get_db),
    _admin_user: UserOut = Depends(require_admin),
):
    path = db.get(Pathway, pathId)
    if path is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Learning path not found")
    if path.modules:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Learning path has associated modules")
    db.delete(path)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/users")
async def list_users(
    db: Session = Depends(get_db),
    _admin_user: UserOut = Depends(require_admin),
):
    users = [_format_user(user, db) for user in db.query(User).order_by(User.id.asc()).all()]
    return {"success": True, "users": users, "data": {"users": users}}


@router.patch("/users/{userId}")
async def update_user(
    userId: int,
    payload: dict[str, Any] = Body(default_factory=dict),
    db: Session = Depends(get_db),
    _admin_user: UserOut = Depends(require_admin),
):
    user = db.get(User, userId)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if "role" in payload:
        user.role = _normalize_role_for_db(payload.get("role"))
    db.commit()
    db.refresh(user)
    formatted = _format_user(user, db)
    return {"success": True, "user": formatted, "data": {"user": formatted}}
