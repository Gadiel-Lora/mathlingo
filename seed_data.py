from __future__ import annotations

from collections import defaultdict

from sqlalchemy import or_

from app.core.database import SessionLocal
from app.models.module import Module
from app.models.subject import Subject
from app.models.topic import Topic

SUBJECT_NAME = 'Matem\u00e1ticas'
SEED_MODULES: dict[str, list[str]] = {
    'Aritm\u00e9tica': ['Suma', 'Resta', 'Multiplicaci\u00f3n', 'Divisi\u00f3n'],
    '\u00c1lgebra': ['Ecuaciones lineales', 'Despeje de variables', 'Sistemas b\u00e1sicos'],
    'Geometr\u00eda': ['\u00c1ngulos', 'Tri\u00e1ngulos', '\u00c1rea y per\u00edmetro'],
}


def get_or_create_subject(db, name: str, summary: dict[str, list[str]]) -> Subject:
    subject = db.query(Subject).filter(Subject.name == name).first()
    if subject is not None:
        summary['subjects_existing'].append(name)
        return subject

    subject = Subject(name=name, description='Ruta base de aprendizaje matematico')
    db.add(subject)
    db.flush()
    summary['subjects_created'].append(name)
    return subject


def get_or_create_module(db, module_name: str, summary: dict[str, list[str]]) -> Module:
    module = (
        db.query(Module)
        .filter(or_(Module.name == module_name, Module.title == module_name))
        .first()
    )

    if module is not None:
        if module.name != module_name or module.title != module_name:
            module.name = module_name
            module.title = module_name
            summary['modules_updated'].append(module_name)
        summary['modules_existing'].append(module_name)
        return module

    module = Module(
        name=module_name,
        title=module_name,
        description=f'Modulo de {module_name}',
        order=0,
    )
    db.add(module)
    db.flush()
    summary['modules_created'].append(module_name)
    return module


def get_or_create_topic(
    db,
    *,
    subject_id: int,
    module_id: int,
    topic_name: str,
    summary: dict[str, list[str]],
) -> Topic:
    topic = (
        db.query(Topic)
        .filter(
            Topic.subject_id == subject_id,
            Topic.name == topic_name,
        )
        .first()
    )

    if topic is not None:
        if topic.module_id != module_id:
            topic.module_id = module_id
            summary['topics_relinked'].append(topic_name)
        summary['topics_existing'].append(topic_name)
        return topic

    topic = Topic(
        subject_id=subject_id,
        module_id=module_id,
        name=topic_name,
        description=f'Tema: {topic_name}',
        difficulty_level=1.0,
        criticality_level=1,
    )
    db.add(topic)
    db.flush()
    summary['topics_created'].append(topic_name)
    return topic


def print_summary(summary: dict[str, list[str]]) -> None:
    print('\nSeed completado correctamente.')
    print(f"Subjects creados: {len(summary['subjects_created'])} -> {summary['subjects_created']}")
    print(f"Subjects existentes: {len(summary['subjects_existing'])} -> {summary['subjects_existing']}")
    print(f"Modules creados: {len(summary['modules_created'])} -> {summary['modules_created']}")
    print(f"Modules existentes: {len(summary['modules_existing'])} -> {summary['modules_existing']}")
    print(f"Modules actualizados: {len(summary['modules_updated'])} -> {summary['modules_updated']}")
    print(f"Topics creados: {len(summary['topics_created'])} -> {summary['topics_created']}")
    print(f"Topics existentes: {len(summary['topics_existing'])} -> {summary['topics_existing']}")
    print(f"Topics relinked: {len(summary['topics_relinked'])} -> {summary['topics_relinked']}")


def main() -> None:
    db = SessionLocal()
    summary: dict[str, list[str]] = defaultdict(list)

    try:
        subject = get_or_create_subject(db, SUBJECT_NAME, summary)

        for module_name, topics in SEED_MODULES.items():
            module = get_or_create_module(db, module_name, summary)
            for topic_name in topics:
                get_or_create_topic(
                    db,
                    subject_id=subject.id,
                    module_id=module.id,
                    topic_name=topic_name,
                    summary=summary,
                )

        db.commit()
        print_summary(summary)
    except Exception as exc:
        db.rollback()
        print(f'Error durante seed, rollback aplicado: {exc}')
        raise
    finally:
        db.close()


if __name__ == '__main__':
    main()
