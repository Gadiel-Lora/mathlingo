from __future__ import annotations

import json
from copy import deepcopy
from pathlib import Path
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from backend.core.database import SessionLocal
from backend.models.curriculum_area import CurriculumArea
from backend.models.curriculum_lesson import CurriculumLesson
from backend.models.curriculum_topic import CurriculumTopic
from backend.models.grade import Grade
from backend.schemas.academic import CurriculumGradeWrite

CURRICULUM_SEED_PATH = Path(__file__).resolve().parent.parent / 'data' / 'curriculum_seed.json'

BRANCH_NAME_MAP = {
    'numeros-naturales': 'Numeros Naturales',
    'aritmetica-fundamental': 'Aritmetica Fundamental',
    'aritmetica-avanzada': 'Aritmetica Avanzada',
    'geometria': 'Geometria',
    'algebra': 'Algebra',
    'algebra-basica': 'Algebra',
    'estadistica-probabilidad': 'Estadistica y Probabilidad',
    'medicion': 'Medicion',
    'funciones': 'Funciones',
}

BRANCH_ALIASES = {
    'algebra-basica': 'algebra',
    'introduccion-funciones': 'funciones',
}


def _grade_query():
    return (
        select(Grade)
        .options(
            selectinload(Grade.areas)
            .selectinload(CurriculumArea.topics)
            .selectinload(CurriculumTopic.lessons),
        )
        .order_by(Grade.grade_number.asc())
    )


def _normalize_id(value: Any) -> str:
    return str(value or '').strip()


def _slugify(value: Any) -> str:
    raw = str(value or '').strip().lower()
    if not raw:
        return ''

    chunks: list[str] = []
    previous_was_dash = False
    for char in raw:
        if char.isalnum():
            chunks.append(char)
            previous_was_dash = False
            continue

        if not previous_was_dash:
            chunks.append('-')
            previous_was_dash = True

    slug = ''.join(chunks).strip('-')
    while '--' in slug:
        slug = slug.replace('--', '-')
    return slug


def _derive_level_name(name: str, grade_number: int) -> str:
    label = str(name or '').lower()
    if 'secund' in label:
        return 'Secundaria'
    if 'primar' in label:
        return 'Primaria'
    if 'univers' in label or 'pre' in label:
        return 'Preuniversitario'
    if grade_number <= 6:
        return 'Primaria'
    return 'Secundaria'


def _normalize_problem_mix(value: Any, fallback: str = 'mixed') -> str:
    normalized = str(value or '').strip().lower()
    if normalized in {'contextualized', 'mechanical', 'mixed'}:
        return normalized
    return fallback


def _normalize_lesson_type(value: Any) -> str:
    return 'exam' if str(value or '').strip().lower() == 'exam' else 'practice'


def _resolve_branch_id(area_id: str, area_name: str) -> str:
    key = _slugify(area_id or area_name or 'rama')

    if 'numeros-naturales' in key:
        return 'numeros-naturales'
    if 'aritmetica-fundamental' in key:
        return 'aritmetica-fundamental'
    if 'numeros-enteros' in key or 'entero' in key:
        return 'aritmetica-fundamental'
    if 'aritmetica-avanzada' in key:
        return 'aritmetica-avanzada'
    if (
        'algebra-avanzada' in key
        or 'algebra-basica' in key
        or 'algebra-ecuaciones' in key
        or 'algebra-sistemas' in key
        or 'algebra' in key
        or key == 'algebra'
    ):
        return 'algebra'
    if 'estadistica-probabilidad' in key:
        return 'estadistica-probabilidad'
    if 'introduccion-funciones' in key or 'funcion' in key:
        return 'funciones'
    if 'geometria' in key:
        return 'geometria'
    if 'medicion' in key:
        return 'medicion'

    return key


def _resolve_branch_name(area_name: str, branch_id: str) -> str:
    return BRANCH_NAME_MAP.get(branch_id) or str(area_name or branch_id).strip() or branch_id


def _build_progress_id(grade_id: str, topic_id: str, lesson_id: str) -> str:
    return f'{_normalize_id(grade_id)}:{_normalize_id(topic_id)}:{_normalize_id(lesson_id)}'


def _build_route_id(grade_id: str, topic_id: str, lesson_id: str) -> str:
    return f'{_normalize_id(grade_id)}~{_normalize_id(topic_id)}~{_normalize_id(lesson_id)}'


def _lesson_to_dict(
    lesson: CurriculumLesson,
    *,
    grade: Grade,
    area: CurriculumArea,
    topic: CurriculumTopic,
) -> dict[str, Any]:
    return {
        'id': lesson.external_id,
        'title': lesson.title,
        'type': lesson.lesson_type,
        'difficulty': int(lesson.difficulty or 1),
        'xpReward': int(lesson.xp_reward or 0),
        'questionCount': max(1, int(lesson.question_count or 4)),
        'problemMix': _normalize_problem_mix(lesson.problem_mix, topic.problem_mix or 'mixed'),
        'subtopics': list(lesson.subtopics or []),
        'skills': list(lesson.skills or []),
        'contextualized': _normalize_problem_mix(lesson.problem_mix) == 'contextualized',
        'gradeId': grade.id,
        'gradeNumber': int(grade.grade_number or 0),
        'gradeName': grade.name,
        'areaId': area.external_id,
        'areaName': area.name,
        'topicId': topic.external_id,
        'topicName': topic.name,
        'progressId': _build_progress_id(grade.id, topic.external_id, lesson.external_id),
        'routeId': _build_route_id(grade.id, topic.external_id, lesson.external_id),
    }


def _topic_to_dict(topic: CurriculumTopic, *, grade: Grade, area: CurriculumArea) -> dict[str, Any]:
    lessons = [_lesson_to_dict(lesson, grade=grade, area=area, topic=topic) for lesson in topic.lessons]
    return {
        'id': topic.external_id,
        'name': topic.name,
        'subtopics': list(topic.subtopics or []),
        'difficultyRange': [int(value) for value in (topic.difficulty_range or [])],
        'questionCountRange': [int(value) for value in (topic.question_count_range or [])],
        'problemMix': _normalize_problem_mix(topic.problem_mix),
        'lessons': lessons,
        'lessonCount': len(lessons),
    }


def _area_to_dict(area: CurriculumArea, *, grade: Grade) -> dict[str, Any]:
    topics = [_topic_to_dict(topic, grade=grade, area=area) for topic in area.topics]
    return {
        'id': area.external_id,
        'name': area.name,
        'branchId': area.branch_id,
        'branchName': area.branch_name,
        'topics': topics,
        'lessonCount': sum(topic['lessonCount'] for topic in topics),
    }


def _grade_to_dict(grade: Grade) -> dict[str, Any]:
    areas = [_area_to_dict(area, grade=grade) for area in grade.areas]
    return {
        'id': grade.id,
        'gradeNumber': int(grade.grade_number or 0),
        'name': grade.name,
        'levelName': grade.level_name,
        'objective': grade.objective,
        'finalExam': deepcopy(grade.final_exam) if grade.final_exam else None,
        'areas': areas,
        'lessonCount': sum(area['lessonCount'] for area in areas),
    }


def _read_seed_payload() -> dict[str, Any]:
    if not CURRICULUM_SEED_PATH.exists():
        return {'grades': []}
    return json.loads(CURRICULUM_SEED_PATH.read_text(encoding='utf-8-sig'))


def bootstrap_curriculum_data() -> None:
    db = SessionLocal()
    try:
        if db.query(Grade.id).first() is not None:
            return

        payload = _read_seed_payload()
        for raw_grade in payload.get('grades', []):
            grade_payload = CurriculumGradeWrite.model_validate(raw_grade)
            _persist_grade_tree(db, grade_payload, existing=None)

        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def list_curriculum_grades(db: Session) -> list[dict[str, Any]]:
    grades = db.execute(_grade_query()).scalars().unique().all()
    return [_grade_to_dict(grade) for grade in grades]


def get_curriculum_grade(db: Session, grade_key: str | int) -> dict[str, Any]:
    raw_key = _normalize_id(grade_key)

    grade = db.get(Grade, raw_key)
    if grade is None and raw_key.isdigit():
        grade = db.execute(
            _grade_query().where(Grade.grade_number == int(raw_key)),
        ).scalars().first()
    elif grade is not None:
        db.refresh(grade, attribute_names=['areas'])

    if grade is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='Grade not found',
        )

    grade = db.execute(
        _grade_query().where(Grade.id == grade.id),
    ).scalars().first()
    if grade is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='Grade not found',
        )

    return _grade_to_dict(grade)


def list_curriculum_branches(db: Session) -> list[dict[str, Any]]:
    grades = list_curriculum_grades(db)
    branch_map: dict[str, dict[str, Any]] = {}

    for grade in grades:
        for area in grade.get('areas', []):
            branch_id = BRANCH_ALIASES.get(area.get('branchId') or '', area.get('branchId') or '')
            if branch_id not in branch_map:
                label = area.get('branchName') or _resolve_branch_name(area.get('name', ''), branch_id)
                branch_map[branch_id] = {
                    'id': branch_id,
                    'name': label,
                    'description': f'Modulo por rama: {label}',
                    'lessonCount': 0,
                    'gradeIds': set(),
                    'modules': [],
                }

            branch = branch_map[branch_id]
            branch['gradeIds'].add(grade['id'])

            module_topics: list[dict[str, Any]] = []
            module_lesson_count = 0
            for topic in area.get('topics', []):
                lessons = [deepcopy(lesson) for lesson in topic.get('lessons', [])]
                module_lesson_count += len(lessons)
                module_topics.append(
                    {
                        'id': topic['id'],
                        'name': topic['name'],
                        'subtopics': list(topic.get('subtopics', [])),
                        'lessonCount': len(lessons),
                        'lessons': lessons,
                    },
                )

            if module_lesson_count == 0:
                continue

            branch['modules'].append(
                {
                    'id': f"{grade['id']}:{area['id']}",
                    'gradeId': grade['id'],
                    'gradeNumber': int(grade.get('gradeNumber') or 0),
                    'gradeName': grade.get('name') or grade['id'],
                    'areaId': area['id'],
                    'areaName': area.get('name') or area['id'],
                    'lessonCount': module_lesson_count,
                    'topics': sorted(module_topics, key=lambda item: item['name']),
                },
            )
            branch['lessonCount'] += module_lesson_count

    branches = []
    for branch in branch_map.values():
        branches.append(
            {
                'id': branch['id'],
                'name': branch['name'],
                'description': branch['description'],
                'lessonCount': branch['lessonCount'],
                'gradeCount': len(branch['gradeIds']),
                'gradeIds': sorted(branch['gradeIds']),
                'modules': sorted(
                    branch['modules'],
                    key=lambda item: (item['gradeNumber'], item['areaName']),
                ),
            },
        )

    return sorted(branches, key=lambda item: item['name'])


def get_curriculum_branch(db: Session, branch_id: str) -> dict[str, Any]:
    key = BRANCH_ALIASES.get(_normalize_id(branch_id).lower(), _normalize_id(branch_id).lower())
    branches = list_curriculum_branches(db)
    branch = next((item for item in branches if item['id'].lower() == key), None)
    if branch is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='Branch not found',
        )
    return branch


def create_curriculum_grade(db: Session, payload: CurriculumGradeWrite) -> dict[str, Any]:
    existing = db.get(Grade, payload.id)
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail='Grade id already exists',
        )

    _ensure_grade_conflicts(db, payload, current_grade_id=None)
    grade = _persist_grade_tree(db, payload, existing=None)
    db.commit()
    return get_curriculum_grade(db, grade.id)


def update_curriculum_grade(db: Session, grade_id: str, payload: CurriculumGradeWrite) -> dict[str, Any]:
    if payload.id != grade_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Grade id in path must match payload id',
        )

    existing = db.get(Grade, grade_id)
    if existing is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='Grade not found',
        )

    _ensure_grade_conflicts(db, payload, current_grade_id=grade_id)
    _persist_grade_tree(db, payload, existing=existing)
    db.commit()
    return get_curriculum_grade(db, grade_id)


def delete_curriculum_grade(db: Session, grade_id: str) -> None:
    grade = db.get(Grade, grade_id)
    if grade is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='Grade not found',
        )

    db.delete(grade)
    db.commit()


def _ensure_grade_conflicts(
    db: Session,
    payload: CurriculumGradeWrite,
    *,
    current_grade_id: str | None,
) -> None:
    name_conflict = db.execute(
        select(Grade).where(Grade.name == payload.name),
    ).scalars().first()
    if name_conflict is not None and name_conflict.id != current_grade_id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail='Grade name already exists',
        )

    number_conflict = db.execute(
        select(Grade).where(Grade.grade_number == payload.grade_number),
    ).scalars().first()
    if number_conflict is not None and number_conflict.id != current_grade_id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail='Grade number already exists',
        )


def _persist_grade_tree(
    db: Session,
    payload: CurriculumGradeWrite,
    *,
    existing: Grade | None,
) -> Grade:
    grade = existing or Grade(id=payload.id)
    if existing is None:
        db.add(grade)
    else:
        grade.areas.clear()
        db.flush()

    grade.name = payload.name
    grade.grade_number = int(payload.grade_number)
    grade.level_name = payload.level_name or _derive_level_name(payload.name, int(payload.grade_number))
    grade.objective = payload.objective
    grade.final_exam = deepcopy(payload.final_exam) if payload.final_exam else None

    for area_index, area_payload in enumerate(payload.areas):
        branch_id = area_payload.branch_id or _resolve_branch_id(area_payload.id, area_payload.name)
        branch_name = area_payload.branch_name or _resolve_branch_name(area_payload.name, branch_id)
        area = CurriculumArea(
            external_id=area_payload.id,
            name=area_payload.name,
            branch_id=branch_id,
            branch_name=branch_name,
            position=area_index,
        )

        for topic_index, topic_payload in enumerate(area_payload.topics):
            topic = CurriculumTopic(
                external_id=topic_payload.id,
                name=topic_payload.name,
                subtopics=list(topic_payload.subtopics),
                difficulty_range=[int(value) for value in topic_payload.difficulty_range],
                question_count_range=[int(value) for value in topic_payload.question_count_range],
                problem_mix=_normalize_problem_mix(topic_payload.problem_mix),
                position=topic_index,
            )

            for lesson_index, lesson_payload in enumerate(topic_payload.lessons):
                lesson = CurriculumLesson(
                    external_id=lesson_payload.id,
                    title=lesson_payload.title,
                    lesson_type=_normalize_lesson_type(lesson_payload.type),
                    difficulty=max(1, int(lesson_payload.difficulty)),
                    xp_reward=max(0, int(lesson_payload.xp_reward)),
                    question_count=max(1, int(lesson_payload.question_count)),
                    problem_mix=_normalize_problem_mix(lesson_payload.problem_mix, topic.problem_mix),
                    subtopics=list(lesson_payload.subtopics),
                    skills=list(lesson_payload.skills),
                    position=lesson_index,
                )
                topic.lessons.append(lesson)

            area.topics.append(topic)

        grade.areas.append(area)

    db.flush()
    return grade
