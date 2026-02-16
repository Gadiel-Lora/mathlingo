from __future__ import annotations

import unicodedata

from app.core.database import SessionLocal
from app.models import Exercise, Topic

ExerciseSeed = dict[str, str | float | int | None]


def normalize_topic_name(name: str) -> str:
    normalized = unicodedata.normalize('NFKD', name)
    ascii_only = normalized.encode('ascii', 'ignore').decode('ascii')
    return ' '.join(ascii_only.lower().strip().split())


EXERCISES_BY_TOPIC: dict[str, list[ExerciseSeed]] = {
    'suma': [
        {'question': 'Cuanto es 5 + 3?', 'answer': '8', 'difficulty': 0.2},
        {'question': 'Sumar 12 y 7', 'answer': '19', 'difficulty': 0.25},
        {'question': 'Cuanto es 48 + 27?', 'answer': '75', 'difficulty': 0.35},
        {'question': 'Cuanto es 135 + 289?', 'answer': '424', 'difficulty': 0.45},
        {'question': 'Cuanto es 999 + 1?', 'answer': '1000', 'difficulty': 0.5},
    ],
    'resta': [
        {'question': 'Cuanto es 9 - 4?', 'answer': '5', 'difficulty': 0.2},
        {'question': 'Restar 30 - 12', 'answer': '18', 'difficulty': 0.25},
        {'question': 'Cuanto es 75 - 38?', 'answer': '37', 'difficulty': 0.35},
        {'question': 'Cuanto es 402 - 179?', 'answer': '223', 'difficulty': 0.45},
        {'question': 'Cuanto es 1000 - 457?', 'answer': '543', 'difficulty': 0.55},
    ],
    'multiplicacion': [
        {'question': 'Cuanto es 4 x 6?', 'answer': '24', 'difficulty': 0.3},
        {'question': 'Cuanto es 7 x 8?', 'answer': '56', 'difficulty': 0.4},
        {'question': 'Cuanto es 12 x 9?', 'answer': '108', 'difficulty': 0.5},
        {'question': 'Cuanto es 23 x 4?', 'answer': '92', 'difficulty': 0.55},
        {'question': 'Cuanto es 35 x 17?', 'answer': '595', 'difficulty': 0.7},
    ],
    'division': [
        {'question': 'Cuanto es 20 / 5?', 'answer': '4', 'difficulty': 0.35},
        {'question': 'Cuanto es 81 / 9?', 'answer': '9', 'difficulty': 0.4},
        {'question': 'Cuanto es 144 / 12?', 'answer': '12', 'difficulty': 0.5},
        {'question': 'Cuanto es 225 / 15?', 'answer': '15', 'difficulty': 0.6},
        {'question': 'Cuanto es 378 / 14?', 'answer': '27', 'difficulty': 0.75},
    ],
    'ecuaciones lineales': [
        {'question': 'Resolver 2x + 3 = 7', 'answer': '2', 'difficulty': 0.8},
        {'question': 'Resolver 5x - 10 = 0', 'answer': '2', 'difficulty': 0.85},
        {'question': 'Resolver 3x + 9 = 24', 'answer': '5', 'difficulty': 0.9},
        {'question': 'Resolver 7x - 14 = 21', 'answer': '5', 'difficulty': 1.0},
        {'question': 'Resolver 4x + 11 = 3', 'answer': '-2', 'difficulty': 1.1},
    ],
    'despeje de variables': [
        {'question': 'Despejar x en x + y = 10', 'answer': 'x = 10 - y', 'difficulty': 0.9},
        {'question': 'Despejar y en 3y = 2x + 6', 'answer': 'y = (2x + 6) / 3', 'difficulty': 1.0},
        {'question': 'Despejar a en b = 4a - 8', 'answer': 'a = (b + 8) / 4', 'difficulty': 1.05},
        {'question': 'Despejar m en y = mx + b', 'answer': 'm = (y - b) / x', 'difficulty': 1.1},
        {'question': 'Despejar r en A = pi r^2', 'answer': 'r = sqrt(A / pi)', 'difficulty': 1.2},
    ],
    'sistemas basicos': [
        {'question': 'Resolver: x + y = 5, x - y = 1', 'answer': 'x = 3, y = 2', 'difficulty': 1.0},
        {'question': 'Resolver: x + y = 9, x - y = 3', 'answer': 'x = 6, y = 3', 'difficulty': 1.05},
        {'question': 'Resolver: 2x + y = 7, x - y = 2', 'answer': 'x = 3, y = 1', 'difficulty': 1.15},
        {'question': 'Resolver: 3x + y = 11, x + y = 7', 'answer': 'x = 2, y = 5', 'difficulty': 1.2},
        {'question': 'Resolver: 2x - y = 4, x + y = 5', 'answer': 'x = 3, y = 2', 'difficulty': 1.25},
    ],
    'angulos': [
        {'question': 'Un angulo recto mide?', 'answer': '90', 'difficulty': 0.7},
        {'question': 'Un angulo llano mide?', 'answer': '180', 'difficulty': 0.75},
        {'question': 'Si un angulo mide 35, su complemento mide?', 'answer': '55', 'difficulty': 0.85},
        {'question': 'Si un angulo mide 120, su suplemento mide?', 'answer': '60', 'difficulty': 0.9},
        {'question': 'Dos angulos opuestos por el vertice son?', 'answer': 'Iguales', 'difficulty': 1.0},
    ],
    'triangulos': [
        {'question': 'Suma de angulos internos de un triangulo', 'answer': '180', 'difficulty': 0.8},
        {'question': 'Triangulo con 3 lados iguales', 'answer': 'Equilatero', 'difficulty': 0.85},
        {'question': 'Triangulo con 2 lados iguales', 'answer': 'Isosceles', 'difficulty': 0.9},
        {'question': 'Si dos angulos son 50 y 60, el tercero es?', 'answer': '70', 'difficulty': 1.0},
        {'question': 'Un triangulo rectangulo tiene un angulo de?', 'answer': '90', 'difficulty': 1.05},
    ],
    'area y perimetro': [
        {'question': 'Area de un cuadrado de lado 6', 'answer': '36', 'difficulty': 0.9},
        {'question': 'Perimetro de un rectangulo de 8 y 3', 'answer': '22', 'difficulty': 0.95},
        {'question': 'Area de un triangulo base 10 altura 4', 'answer': '20', 'difficulty': 1.0},
        {'question': 'Area de un circulo de radio 3', 'answer': '9pi', 'difficulty': 1.1},
        {'question': 'Perimetro de un triangulo de lados 5, 6, 7', 'answer': '18', 'difficulty': 1.05},
    ],
}


def exercise_exists(db, topic_id: int, question: str, answer: str) -> bool:
    return (
        db.query(Exercise)
        .filter(
            Exercise.topic_id == topic_id,
            Exercise.question == question,
            Exercise.answer == answer,
        )
        .first()
        is not None
    )


def main() -> None:
    db = SessionLocal()
    total_inserted = 0
    topics_processed = 0

    try:
        topics = db.query(Topic).order_by(Topic.id.asc()).all()
        if not topics:
            print('No hay topics en la base de datos. Ejecuta seed_data.py primero.')
            return

        print('Topics detectados:')
        for topic in topics:
            print(f'- [{topic.id}] {topic.name}')

        print('\nInsertando ejercicios por topic...')
        for topic in topics:
            topic_key = normalize_topic_name(topic.name)
            seeds = EXERCISES_BY_TOPIC.get(topic_key, [])

            if not seeds:
                print(f'[SKIP] Topic [{topic.id}] {topic.name}: sin plantilla de ejercicios.')
                continue

            inserted_for_topic = 0
            for seed in seeds:
                question = str(seed['question'])
                answer = str(seed['answer'])
                difficulty = float(seed['difficulty'])

                if exercise_exists(db, topic.id, question, answer):
                    continue

                exercise = Exercise(
                    topic_id=topic.id,
                    question=question,
                    answer=answer,
                    difficulty=difficulty,
                    level_id=seed.get('level_id'),  # Optional if your model uses levels.
                )
                db.add(exercise)
                inserted_for_topic += 1

            db.commit()  # Commit per topic as requested.
            topics_processed += 1
            total_inserted += inserted_for_topic
            print(
                f'[OK] Topic [{topic.id}] {topic.name}: '
                f'{inserted_for_topic} ejercicios insertados.'
            )

        print('\nResumen final:')
        print(f'- Topics procesados: {topics_processed}')
        print(f'- Total ejercicios insertados: {total_inserted}')
    except Exception as exc:
        db.rollback()
        print(f'Error durante el seed de ejercicios. Rollback aplicado: {exc}')
        raise
    finally:
        db.close()


if __name__ == '__main__':
    main()
