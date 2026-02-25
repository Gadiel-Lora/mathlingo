from pathlib import Path
import sys

PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from app.core.database import SessionLocal
from app.services.auth_service import login_user


def main() -> None:
    db = SessionLocal()
    try:
        token = login_user(db, 'test@mail.com', '1234')
        print(token)
    finally:
        db.close()


if __name__ == '__main__':
    main()
