from pathlib import Path
import sys

PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from app.core.database import create_tables

# Import models so they are registered in the metadata.
from app.models.user import User
from app.models.module import Module
from app.models.level import Level
from app.models.exercise import Exercise
from app.models.progress import Progress


def main() -> None:
    create_tables()
    print('Tablas creadas')


if __name__ == '__main__':
    main()
