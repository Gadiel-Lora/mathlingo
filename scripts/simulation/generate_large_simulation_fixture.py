from __future__ import annotations

import argparse
import csv
import math
import random
from collections import Counter, defaultdict
from pathlib import Path

REQUIRED_COLUMNS = {
    'user_id',
    'exercise_id',
    'is_correct',
    'mastery_score',
    'iteration',
    'simulated_profile',
}
PROFILE_ORDER = ['novato', 'intermedio', 'experto']


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description='Genera un CSV grande de simulacion desde el fixture base.')
    parser.add_argument('--input', default='simulation_results.csv', help='CSV base pequeno.')
    parser.add_argument('--output', default='simulation_results_large.csv', help='CSV grande generado.')
    parser.add_argument('--target-rows', type=int, default=10200, help='Filas minimas a generar.')
    parser.add_argument('--seed', type=int, default=42, help='Semilla reproducible.')
    return parser.parse_args()


def clamp(value: float, low: float = 0.0, high: float = 1.0) -> float:
    return max(low, min(high, value))


def parse_bool(value: object) -> bool:
    token = str(value).strip().lower()
    return token in {'true', '1', 'yes'}


def load_base(path: Path) -> list[dict[str, object]]:
    if not path.exists():
        raise FileNotFoundError(f'No existe el CSV base: {path}')

    with path.open('r', encoding='utf-8', newline='') as handle:
        reader = csv.DictReader(handle)
        if reader.fieldnames is None:
            raise ValueError('El CSV base no tiene encabezados.')
        missing = REQUIRED_COLUMNS - set(reader.fieldnames)
        if missing:
            raise ValueError('Faltan columnas requeridas: ' + ', '.join(sorted(missing)))

        rows = []
        for row in reader:
            rows.append({
                'user_id': int(row['user_id']),
                'exercise_id': int(row['exercise_id']),
                'is_correct': parse_bool(row['is_correct']),
                'mastery_score': float(row['mastery_score']),
                'iteration': int(row['iteration']),
                'simulated_profile': str(row['simulated_profile']).strip().lower(),
            })
        return rows


def build_templates(rows: list[dict[str, object]]) -> dict[str, dict[str, object]]:
    by_profile: dict[str, list[dict[str, object]]] = defaultdict(list)
    for row in rows:
        by_profile[str(row['simulated_profile'])].append(row)

    templates: dict[str, dict[str, object]] = {}
    for profile, profile_rows in by_profile.items():
        profile_rows = sorted(profile_rows, key=lambda item: (int(item['user_id']), int(item['iteration'])))
        accuracy = sum(1 for row in profile_rows if bool(row['is_correct'])) / max(1, len(profile_rows))

        mastery_totals: dict[int, float] = defaultdict(float)
        mastery_counts: dict[int, int] = defaultdict(int)
        exercise_pool = [exercise_id for exercise_id, _ in Counter(int(row['exercise_id']) for row in profile_rows).most_common()]

        diffs: list[float] = []
        last_by_user: dict[int, float] = {}
        for row in profile_rows:
            iteration = int(row['iteration'])
            mastery = float(row['mastery_score'])
            user_id = int(row['user_id'])
            mastery_totals[iteration] += mastery
            mastery_counts[iteration] += 1
            if user_id in last_by_user:
                diffs.append(mastery - last_by_user[user_id])
            last_by_user[user_id] = mastery

        positive = [delta for delta in diffs if delta > 0]
        negative = [-delta for delta in diffs if delta < 0]
        curve = {
            iteration: mastery_totals[iteration] / mastery_counts[iteration]
            for iteration in sorted(mastery_totals)
        }

        templates[profile] = {
            'accuracy': accuracy,
            'gain': sum(positive) / len(positive) if positive else 0.04,
            'drop': sum(negative) / len(negative) if negative else 0.03,
            'iterations': max(curve) if curve else 1,
            'start': curve[min(curve)] if curve else 0.0,
            'curve': curve,
            'exercise_pool': exercise_pool or [1],
        }

    if not templates:
        raise ValueError('No se pudieron inferir perfiles desde el CSV base.')
    return templates


def ordered_profiles(templates: dict[str, dict[str, object]]) -> list[str]:
    known = [profile for profile in PROFILE_ORDER if profile in templates]
    extra = [profile for profile in templates if profile not in known]
    return known + extra


def write_rows(path: Path, rows: list[dict[str, object]]) -> None:
    fieldnames = ['user_id', 'exercise_id', 'is_correct', 'mastery_score', 'iteration', 'simulated_profile']
    with path.open('w', encoding='utf-8', newline='') as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def main() -> None:
    args = parse_args()
    base_rows = load_base(Path(args.input))
    templates = build_templates(base_rows)
    result_rows = generate_rows(base_rows, templates, args.target_rows, args.seed)
    write_rows(Path(args.output), result_rows)

    accuracy_mean = sum(1 for row in result_rows if bool(row['is_correct'])) / max(1, len(result_rows))
    mastery_mean = sum(float(row['mastery_score']) for row in result_rows) / max(1, len(result_rows))
    distribution = Counter(str(row['simulated_profile']) for row in result_rows)

    print(f'CSV grande generado en: {args.output}')
    print(f'Filas generadas: {len(result_rows)}')
    print('Distribucion por perfil:')
    for profile, count in sorted(distribution.items()):
        print(f'- {profile}: {count} filas')
    print(f'Accuracy media: {accuracy_mean:.4f}')
    print(f'Mastery media: {mastery_mean:.4f}')



def generate_rows(base_rows: list[dict[str, object]], templates: dict[str, dict[str, object]], target_rows: int, seed: int) -> list[dict[str, object]]:
    rng = random.Random(seed)
    rows: list[dict[str, object]] = []
    profiles = ordered_profiles(templates)
    max_user_id = max(int(row['user_id']) for row in base_rows)
    max_iterations = max(int(template['iterations']) for template in templates.values())
    synthetic_users = math.ceil(target_rows / max_iterations)

    for offset in range(synthetic_users):
        profile = profiles[offset % len(profiles)]
        template = templates[profile]
        user_id = max_user_id + offset + 1
        mastery = clamp(float(template['start']) + rng.uniform(-0.02, 0.02))
        bias = rng.uniform(-0.08, 0.08)

        for iteration in range(1, int(template['iterations']) + 1):
            target = float(template['curve'].get(iteration, mastery))
            probability = clamp(
                float(template['accuracy']) + bias + (iteration / max(1, int(template['iterations']))) * 0.08 + (target - mastery) * 0.25,
                0.03,
                0.98,
            )
            is_correct = rng.random() < probability

            if is_correct:
                mastery = clamp((mastery * 0.72) + (target * 0.28) + float(template['gain']) * rng.uniform(0.7, 1.35))
            else:
                mastery = clamp((mastery * 0.88) + (target * 0.12) - float(template['drop']) * rng.uniform(0.7, 1.2))

            rows.append({
                'user_id': user_id,
                'exercise_id': rng.choice(list(template['exercise_pool'])),
                'is_correct': is_correct,
                'mastery_score': round(mastery, 6),
                'iteration': iteration,
                'simulated_profile': profile,
            })
            if len(rows) >= target_rows:
                return rows

    return rows

if __name__ == '__main__':
    main()
