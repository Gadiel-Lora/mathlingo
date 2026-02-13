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
