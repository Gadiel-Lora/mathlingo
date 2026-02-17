from __future__ import annotations

import argparse
import math
from pathlib import Path
from typing import Iterable

import matplotlib.pyplot as plt
import pandas as pd

REQUIRED_COLUMNS = {'user_id', 'exercise_id', 'is_correct', 'mastery_score', 'iteration'}
PROFILE_ORDER = ['novice', 'intermediate', 'expert']
PROFILE_ALIASES = {
    'novato': 'novice',
    'novice': 'novice',
    'intermedio': 'intermediate',
    'intermediate': 'intermediate',
    'experto': 'expert',
    'expert': 'expert',
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description='Analyze adaptive learning simulation results.')
    parser.add_argument('--input', required=True, help='Path to simulation_results.csv')
    return parser.parse_args()


def normalize_profile(value: str) -> str:
    token = str(value).strip().lower()
    return PROFILE_ALIASES.get(token, token)


def ordered_profiles(values: Iterable[str]) -> list[str]:
    unique_values = list(dict.fromkeys(values))
    ordered = [profile for profile in PROFILE_ORDER if profile in unique_values]
    ordered.extend([profile for profile in unique_values if profile not in ordered])
    return ordered


def infer_profiles_from_user_ranges(df: pd.DataFrame) -> tuple[pd.Series, dict[str, tuple[int, int]]]:
    user_ids = sorted(df['user_id'].dropna().astype(int).unique().tolist())
    if not user_ids:
        raise ValueError('Cannot infer profiles: no user_id values found.')

    bucket_size = max(1, math.ceil(len(user_ids) / 3))
    mapping: dict[int, str] = {}

    for idx, user_id in enumerate(user_ids):
        if idx < bucket_size:
            mapping[user_id] = 'novice'
        elif idx < bucket_size * 2:
            mapping[user_id] = 'intermediate'
        else:
            mapping[user_id] = 'expert'

    ranges: dict[str, tuple[int, int]] = {}
    for profile in PROFILE_ORDER:
        profile_ids = [user_id for user_id, value in mapping.items() if value == profile]
        if profile_ids:
            ranges[profile] = (min(profile_ids), max(profile_ids))

    return df['user_id'].astype(int).map(mapping), ranges


def validate_dataframe(df: pd.DataFrame) -> None:
    missing_columns = REQUIRED_COLUMNS - set(df.columns)
    if missing_columns:
        missing = ', '.join(sorted(missing_columns))
        raise ValueError(f'Missing required columns in CSV: {missing}')


def _list_csv_files(directory: Path) -> list[Path]:
    return sorted([path for path in directory.glob('*.csv') if path.is_file()])


def _print_csv_options(csv_files: list[Path]) -> None:
    print('\nCSV files found in current directory:')
    for idx, csv_path in enumerate(csv_files, start=1):
        print(f'  {idx}. {csv_path.name}')
    print('Choose by number (e.g. 1) or by filename (e.g. simulation_results.csv).')


def _prompt_csv_selection(csv_files: list[Path]) -> Path:
    while True:
        selection = input('CSV to use: ').strip()
        if not selection:
            print('Please enter a valid option.')
            continue

        if selection.isdigit():
            index = int(selection)
            if 1 <= index <= len(csv_files):
                return csv_files[index - 1]
            print('Invalid number. Try again.')
            continue

        by_name = [path for path in csv_files if path.name == selection]
        if by_name:
            return by_name[0]

        by_path = Path(selection)
        if by_path.exists() and by_path.is_file():
            return by_path

        print('Invalid selection. Use a listed number or filename.')


def resolve_input_path(input_arg: str) -> Path:
    input_path = Path(input_arg).expanduser()
    if input_path.exists() and input_path.is_file():
        return input_path

    print(f'Input file not found: {input_arg}')
    cwd = Path.cwd()
    csv_files = _list_csv_files(cwd)

    if not csv_files:
        raise FileNotFoundError(
            f'No CSV files found in current directory: {cwd}\n'
            'Run simulate_learning.py first or provide a valid --input path.'
        )

    _print_csv_options(csv_files)

    if len(csv_files) == 1:
        selected = csv_files[0]
        print(f'Only one CSV available. Using: {selected.name}')
        return selected

    selected = _prompt_csv_selection(csv_files)
    print(f'Using CSV: {selected}')
    return selected


def plot_mastery_by_profile(df: pd.DataFrame, profiles: list[str]) -> None:
    for profile in profiles:
        profile_rows = df[df['profile'] == profile]
        if profile_rows.empty:
            continue

        plt.figure(figsize=(10, 6))
        for user_id, user_rows in profile_rows.groupby('user_id'):
            line_data = (
                user_rows.groupby('iteration', as_index=False)['mastery_score']
                .mean()
                .sort_values('iteration')
            )
            plt.plot(
                line_data['iteration'],
                line_data['mastery_score'],
                label=f'user {int(user_id)}',
            )

        plt.title(f'Mastery score over iterations - {profile}')
        plt.xlabel('Iteration')
        plt.ylabel('Mastery score')
        plt.ylim(0.0, 1.0)
        plt.legend()
        plt.tight_layout()


def plot_profile_average(df: pd.DataFrame, profiles: list[str]) -> pd.DataFrame:
    aggregated = (
        df.groupby(['profile', 'iteration'], as_index=False)['mastery_score']
        .mean()
        .sort_values(['profile', 'iteration'])
    )

    plt.figure(figsize=(10, 6))
    for profile in profiles:
        profile_rows = aggregated[aggregated['profile'] == profile]
        if profile_rows.empty:
            continue
        plt.plot(
            profile_rows['iteration'],
            profile_rows['mastery_score'],
            label=profile,
        )

    plt.title('Average mastery per iteration per profile')
    plt.xlabel('Iteration')
    plt.ylabel('Average mastery score')
    plt.ylim(0.0, 1.0)
    plt.legend()
    plt.tight_layout()
    return aggregated


def print_profile_metrics(df: pd.DataFrame, aggregated: pd.DataFrame, profiles: list[str]) -> None:
    print('\n=== Final Metrics by Profile ===')
    for profile in profiles:
        rows = df[df['profile'] == profile]
        if rows.empty:
            continue

        max_iteration = int(rows['iteration'].max())
        final_rows = rows[rows['iteration'] == max_iteration]
        final_avg_mastery = float(final_rows['mastery_score'].mean())
        profile_std = float(rows['mastery_score'].std(ddof=0))
        print(
            f'- {profile}: final_avg_mastery={final_avg_mastery:.4f}, '
            f'std_mastery={profile_std:.4f}'
        )

        series = (
            aggregated[aggregated['profile'] == profile]
            .sort_values('iteration')['mastery_score']
        )
        if len(series) < 5:
            print('  convergence: insufficient iterations for stability check')
            continue

        last_five_variance = float(series.tail(5).var(ddof=0))
        if last_five_variance < 0.01:
            print(f'  convergence: Stable convergence (variance={last_five_variance:.6f})')
        else:
            print(f'  convergence: Unstable convergence (variance={last_five_variance:.6f})')


def main() -> None:
    args = parse_args()
    csv_path = resolve_input_path(args.input)
    print(f'Reading data from: {csv_path}')
    df = pd.read_csv(csv_path)
    validate_dataframe(df)

    df['user_id'] = pd.to_numeric(df['user_id'], errors='raise').astype(int)
    df['iteration'] = pd.to_numeric(df['iteration'], errors='raise').astype(int)
    df['mastery_score'] = pd.to_numeric(df['mastery_score'], errors='raise')

    if 'profile' in df.columns:
        df['profile'] = df['profile'].map(normalize_profile)
    else:
        inferred_profiles, ranges = infer_profiles_from_user_ranges(df)
        df['profile'] = inferred_profiles
        print('Profile column not found. Inferred profile ranges from user_id:')
        for profile in PROFILE_ORDER:
            if profile in ranges:
                start_id, end_id = ranges[profile]
                print(f'- {profile}: user_id {start_id} to {end_id}')

    profiles = ordered_profiles(df['profile'].tolist())
    plot_mastery_by_profile(df, profiles)
    aggregated = plot_profile_average(df, profiles)
    print_profile_metrics(df, aggregated, profiles)
    plt.show()


if __name__ == '__main__':
    main()
