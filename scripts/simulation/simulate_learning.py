from __future__ import annotations

import argparse
import base64
import json
import random
import statistics
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import httpx
import pandas as pd


@dataclass
class ProfileConfig:
    name: str
    correct_probability: float


@dataclass
class StudentState:
    profile: ProfileConfig
    user_id: int
    email: str
    token: str
    known_answers: dict[int, str] = field(default_factory=dict)


PROFILES = [
    ProfileConfig(name='novato', correct_probability=0.30),
    ProfileConfig(name='intermedio', correct_probability=0.60),
    ProfileConfig(name='experto', correct_probability=0.85),
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description='Simulador de aprendizaje adaptativo para Mathlingo.')
    parser.add_argument('--base-url', default='http://127.0.0.1:8000', help='Base URL del backend FastAPI.')
    parser.add_argument('--iterations', type=int, default=50, help='Numero de iteraciones por usuario.')
    parser.add_argument('--output', default='simulation_results.csv', help='Ruta del CSV de salida.')
    parser.add_argument('--seed', type=int, default=42, help='Semilla aleatoria para reproducibilidad.')
    parser.add_argument('--timeout', type=float, default=15.0, help='Timeout HTTP en segundos.')
    return parser.parse_args()


def _decode_user_id_from_jwt(access_token: str) -> int:
    parts = access_token.split('.')
    if len(parts) < 2:
        raise ValueError('Invalid JWT token format')
    payload_part = parts[1]
    padding = '=' * (-len(payload_part) % 4)
    decoded = base64.urlsafe_b64decode(payload_part + padding).decode('utf-8')
    payload: dict[str, Any] = json.loads(decoded)
    sub = payload.get('sub')
    if sub is None:
        raise ValueError('JWT token has no `sub` claim')
    return int(sub)


def _build_alternative_base_urls(base_url: str) -> list[str]:
    candidates = [base_url.rstrip('/')]
    if ':8000' in base_url:
        candidates.append(base_url.replace(':8000', ':8001').rstrip('/'))
    elif ':8001' in base_url:
        candidates.append(base_url.replace(':8001', ':8000').rstrip('/'))
    return list(dict.fromkeys(candidates))


def _probe_backend(client: httpx.Client, base_url: str) -> bool:
    for endpoint in (f'{base_url}/openapi.json', f'{base_url}/'):
        try:
            response = client.get(endpoint)
            if response.status_code < 500:
                return True
        except httpx.HTTPError:
            continue
    return False


def _resolve_reachable_base_url(client: httpx.Client, base_url: str) -> str | None:
    for candidate in _build_alternative_base_urls(base_url):
        if _probe_backend(client, candidate):
            return candidate
    return None


def _register_and_login(client: httpx.Client, base_url: str, email: str, password: str) -> tuple[int, str]:
    register_response = client.post(f'{base_url}/auth/register', json={'email': email, 'password': password})
    if register_response.status_code not in (200, 400):
        raise RuntimeError(
            f'Register failed for {email}: {register_response.status_code} {register_response.text}'
        )

    token_response = client.post(
        f'{base_url}/auth/token',
        data={'username': email, 'password': password},
        headers={'Content-Type': 'application/x-www-form-urlencoded'},
    )
    if token_response.status_code != 200:
        raise RuntimeError(
            f'Login failed for {email}: {token_response.status_code} {token_response.text}'
        )

    token = token_response.json()['access_token']
    user_id = _decode_user_id_from_jwt(token)
    return user_id, token


def _get_next_exercise(client: httpx.Client, base_url: str, user_id: int) -> dict[str, Any] | None:
    response = client.get(f'{base_url}/adaptive/next_exercise', params={'user_id': user_id})
    if response.status_code == 404:
        return None
    if response.status_code != 200:
        raise RuntimeError(
            f'/adaptive/next_exercise failed: {response.status_code} {response.text}'
        )
    return response.json()


def _submit_answer(
    client: httpx.Client,
    base_url: str,
    user_id: int,
    exercise_id: int,
    answer: str,
) -> dict[str, Any]:
    response = client.post(
        f'{base_url}/adaptive/submit',
        json={
            'user_id': user_id,
            'exercise_id': exercise_id,
            'answer': answer,
        },
    )
    if response.status_code != 200:
        raise RuntimeError(f'/adaptive/submit failed: {response.status_code} {response.text}')
    return response.json()


def _build_simulated_answer(
    *,
    should_be_correct: bool,
    exercise_id: int,
    next_payload: dict[str, Any],
    known_answers: dict[int, str],
) -> str:
    correct_answer = next_payload.get('correct_answer')
    if should_be_correct:
        if isinstance(correct_answer, str) and correct_answer.strip():
            return correct_answer
        if exercise_id in known_answers:
            return known_answers[exercise_id]
    return '9999'


def _simulate_profile(
    client: httpx.Client,
    base_url: str,
    state: StudentState,
    iterations: int,
) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []

    for iteration in range(1, iterations + 1):
        next_payload = _get_next_exercise(client, base_url, state.user_id)
        if next_payload is None:
            print(f'[{state.profile.name}] No more exercises available.')
            break

        exercise_id = int(next_payload['id'])
        _question = str(next_payload.get('question', ''))

        should_be_correct = random.random() < state.profile.correct_probability
        answer = _build_simulated_answer(
            should_be_correct=should_be_correct,
            exercise_id=exercise_id,
            next_payload=next_payload,
            known_answers=state.known_answers,
        )

        submit_payload = _submit_answer(
            client=client,
            base_url=base_url,
            user_id=state.user_id,
            exercise_id=exercise_id,
            answer=answer,
        )

        is_correct = bool(submit_payload['correct'])
        mastery_score = float(submit_payload['mastery_score'])
        if isinstance(submit_payload.get('correct_answer'), str):
            state.known_answers[exercise_id] = str(submit_payload['correct_answer'])

        rows.append(
            {
                'user_id': state.user_id,
                'exercise_id': exercise_id,
                'is_correct': is_correct,
                'mastery_score': mastery_score,
                'iteration': iteration,
                'simulated_profile': state.profile.name,
            }
        )

    return rows


def _print_convergence_metrics(df: pd.DataFrame) -> None:
    if df.empty:
        print('No se generaron datos de simulacion.')
        return

    print('\n=== Metricas de convergencia por perfil ===')
    for profile, profile_df in df.groupby('simulated_profile', sort=False):
        accuracy = float(profile_df['is_correct'].mean())
        start_window = profile_df.head(min(10, len(profile_df)))
        end_window = profile_df.tail(min(10, len(profile_df)))
        start_mastery = float(start_window['mastery_score'].mean()) if not start_window.empty else 0.0
        end_mastery = float(end_window['mastery_score'].mean()) if not end_window.empty else 0.0
        delta_mastery = end_mastery - start_mastery
        print(
            f'- {profile}: attempts={len(profile_df)}, '
            f'accuracy={accuracy:.3f}, '
            f'mastery_start={start_mastery:.3f}, '
            f'mastery_end={end_mastery:.3f}, '
            f'delta={delta_mastery:.3f}'
        )

    global_mean = float(df['mastery_score'].mean())
    global_std = float(df['mastery_score'].std(ddof=0))
    print(f'\nGlobal mastery mean={global_mean:.4f}, std={global_std:.4f}')


def main() -> None:
    args = parse_args()
    random.seed(args.seed)

    all_rows: list[dict[str, Any]] = []
    timestamp = datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')

    try:
        with httpx.Client(timeout=args.timeout) as client:
            base_url = _resolve_reachable_base_url(client, args.base_url.rstrip('/'))
            if base_url is None:
                print(f'No se pudo conectar al backend en: {args.base_url}')
                print('Inicia el backend y vuelve a intentar.')
                print('Ejemplo: python -m uvicorn app.main:app --reload --port 8001')
                print('O especifica: --base-url http://127.0.0.1:8001')
                return

            if base_url != args.base_url.rstrip('/'):
                print(f'Backend detectado en {base_url}. Se usara esta URL.')

            students: list[StudentState] = []
            for profile in PROFILES:
                email = f'sim_{profile.name}_{timestamp}@mathlingo.local'
                password = 'SimPass123!'
                user_id, token = _register_and_login(client, base_url, email, password)
                students.append(
                    StudentState(
                        profile=profile,
                        user_id=user_id,
                        email=email,
                        token=token,
                    )
                )
                print(
                    f'Perfil {profile.name}: user_id={user_id}, '
                    f'P(correct)={profile.correct_probability:.2f}'
                )

            for student in students:
                profile_rows = _simulate_profile(
                    client=client,
                    base_url=base_url,
                    state=student,
                    iterations=args.iterations,
                )
                all_rows.extend(profile_rows)

    except httpx.HTTPError as exc:
        print(f'Error de red durante la simulacion: {exc}')
        print('Verifica que el backend este activo y que --base-url sea correcto.')
        return
    except Exception as exc:
        print(f'Error durante la simulacion: {exc}')
        return

    output_path = Path(args.output)
    output_columns = [
        'user_id',
        'exercise_id',
        'is_correct',
        'mastery_score',
        'iteration',
        'simulated_profile',
    ]
    result_df = pd.DataFrame(all_rows, columns=output_columns)
    result_df.to_csv(output_path, index=False)
    print(f'\nCSV guardado en: {output_path} ({len(result_df)} filas)')
    _print_convergence_metrics(result_df)


if __name__ == '__main__':
    main()
