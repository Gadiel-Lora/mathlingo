from __future__ import annotations

import argparse
import base64
import json
import random
import statistics
from dataclasses import dataclass, field
from typing import Any

import httpx
import pandas as pd


@dataclass
class ProfileConfig:
    name: str
    factor: float
    initial_domain: float


@dataclass
class StudentState:
    profile: ProfileConfig
    user_id: int
    email: str
    token: str
    topic_mastery: dict[int, float] = field(default_factory=dict)
    fallback_mastery: float = 0.0
    known_answers: dict[int, str] = field(default_factory=dict)

    def current_domain(self) -> float:
        if self.topic_mastery:
            return max(0.0, min(1.0, statistics.fmean(self.topic_mastery.values())))
        return max(0.0, min(1.0, self.fallback_mastery or self.profile.initial_domain))


PROFILE_CONFIGS = [
    ProfileConfig(name='novato', factor=0.5, initial_domain=0.2),
    ProfileConfig(name='intermedio', factor=0.7, initial_domain=0.5),
    ProfileConfig(name='experto', factor=0.9, initial_domain=0.8),
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description='Simulacion de aprendizaje adaptativo para Mathlingo.')
    parser.add_argument('--base-url', default='http://127.0.0.1:8000', help='Base URL del backend FastAPI.')
    parser.add_argument('--iterations', type=int, default=50, help='Iteraciones por usuario.')
    parser.add_argument('--output', default='simulation_results.csv', help='Archivo CSV de salida.')
    parser.add_argument('--seed', type=int, default=42, help='Semilla para reproducibilidad.')
    parser.add_argument('--timeout', type=float, default=15.0, help='Timeout HTTP en segundos.')
    return parser.parse_args()


def _decode_user_id_from_jwt(access_token: str) -> int:
    """Decode JWT payload without signature verification to extract `sub`."""
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


def _register_and_login(client: httpx.Client, base_url: str, email: str, password: str) -> tuple[int, str]:
    register_payload = {'email': email, 'password': password}
    register_response = client.post(f'{base_url}/auth/register', json=register_payload)
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


def _load_initial_domain(client: httpx.Client, base_url: str, user_id: int, token: str, fallback: float) -> float:
    response = client.get(
        f'{base_url}/users/{user_id}/progress/',
        headers={'Authorization': f'Bearer {token}'},
    )
    if response.status_code != 200:
        return fallback

    data = response.json()
    mastery_rows = data.get('mastery', [])
    if not mastery_rows:
        return fallback

    values = [float(row.get('mastery_score', 0.0)) for row in mastery_rows]
    return max(0.0, min(1.0, statistics.fmean(values)))


def _build_wrong_answer(exercise_id: int, iteration: int) -> str:
    return f'wrong_{exercise_id}_{iteration}'


def simulate_profile(
    client: httpx.Client,
    base_url: str,
    state: StudentState,
    iterations: int,
) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []

    for iteration in range(1, iterations + 1):
        next_response = client.get(
            f'{base_url}/adaptive/next_exercise',
            params={'user_id': state.user_id},
        )
        if next_response.status_code != 200:
            print(
                f'[{state.profile.name}] Stop: /adaptive/next_exercise -> '
                f'{next_response.status_code} {next_response.text}'
            )
            break

        exercise = next_response.json()
        exercise_id = int(exercise['id'])
        topic_id = exercise.get('topic_id')

        domain_now = state.current_domain()
        p_correct = max(0.0, min(1.0, domain_now * state.profile.factor))
        want_correct = random.random() < p_correct

        answer: str
        if want_correct and exercise_id in state.known_answers:
            answer = state.known_answers[exercise_id]
        else:
            answer = _build_wrong_answer(exercise_id, iteration)

        submit_response = client.post(
            f'{base_url}/adaptive/submit',
            json={
                'user_id': state.user_id,
                'exercise_id': exercise_id,
                'answer': answer,
            },
        )
        if submit_response.status_code != 200:
            print(
                f'[{state.profile.name}] Stop: /adaptive/submit -> '
                f'{submit_response.status_code} {submit_response.text}'
            )
            break

        submit_data = submit_response.json()
        is_correct = bool(submit_data['correct'])
        mastery_score = float(submit_data['mastery_score'])
        correct_answer = str(submit_data['correct_answer'])
        state.known_answers[exercise_id] = correct_answer

        if topic_id is not None:
            state.topic_mastery[int(topic_id)] = mastery_score
        state.fallback_mastery = mastery_score

        rows.append(
            {
                'profile': state.profile.name,
                'user_id': state.user_id,
                'exercise_id': exercise_id,
                'is_correct': is_correct,
                'mastery_score': mastery_score,
                'iteration': iteration,
                'p_correct_target': p_correct,
                'intended_correct': want_correct,
            }
        )

    return rows


def print_convergence_metrics(df: pd.DataFrame) -> None:
    if df.empty:
        print('No se generaron datos de simulacion.')
        return

    print('\n=== Metricas de convergencia por perfil ===')
    for profile, profile_df in df.groupby('profile', sort=False):
        profile_df = profile_df.sort_values('iteration')
        attempts = len(profile_df)
        accuracy = float(profile_df['is_correct'].mean()) if attempts else 0.0

        first_window = profile_df.head(min(10, attempts))
        last_window = profile_df.tail(min(10, attempts))

        first_mastery = float(first_window['mastery_score'].mean()) if not first_window.empty else 0.0
        last_mastery = float(last_window['mastery_score'].mean()) if not last_window.empty else 0.0
        delta_mastery = last_mastery - first_mastery

        print(
            f'- {profile}: attempts={attempts}, '
            f'accuracy={accuracy:.3f}, '
            f'mastery_start={first_mastery:.3f}, '
            f'mastery_end={last_mastery:.3f}, '
            f'delta={delta_mastery:.3f}'
        )


def main() -> None:
    args = parse_args()
    random.seed(args.seed)

    all_rows: list[dict[str, Any]] = []

    with httpx.Client(timeout=args.timeout) as client:
        states: list[StudentState] = []

        for cfg in PROFILE_CONFIGS:
            email = f'sim_{cfg.name}@mathlingo.local'
            password = 'SimPass123!'
            user_id, token = _register_and_login(client, args.base_url, email, password)
            initial_domain = _load_initial_domain(
                client=client,
                base_url=args.base_url,
                user_id=user_id,
                token=token,
                fallback=cfg.initial_domain,
            )
            states.append(
                StudentState(
                    profile=cfg,
                    user_id=user_id,
                    email=email,
                    token=token,
                    fallback_mastery=initial_domain,
                )
            )
            print(f'Perfil {cfg.name} -> user_id={user_id}, dominio_inicial={initial_domain:.3f}')

        for state in states:
            rows = simulate_profile(
                client=client,
                base_url=args.base_url,
                state=state,
                iterations=args.iterations,
            )
            all_rows.extend(rows)

    df = pd.DataFrame(all_rows)
    output_columns = ['user_id', 'exercise_id', 'is_correct', 'mastery_score', 'iteration']
    df_output = df[output_columns] if not df.empty else pd.DataFrame(columns=output_columns)
    df_output.to_csv(args.output, index=False)
    print(f'\nCSV guardado en: {args.output} ({len(df_output)} filas)')
    print_convergence_metrics(df)


if __name__ == '__main__':
    main()
