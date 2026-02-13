from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import create_access_token, hash_password, verify_password
from app.models.user import User
from app.schemas.auth import LoginRequest, Token
from app.schemas.user import UserCreate


def register_user(db: Session, user: UserCreate):
    existing = db.query(User).filter(User.email == user.email).first()

    if existing:
        raise HTTPException(status_code=400, detail='Email already registered')

    is_first_user = db.query(User).count() == 0
    role = 'admin' if is_first_user else 'user'

    new_user = User(
        email=user.email,
        hashed_password=hash_password(user.password),
        role=role,
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {'message': 'User created'}


def login_user_credentials(db: Session, email: str, password: str) -> Token:
    user: User | None = (
        db.query(User)
        .filter(User.email == email)
        .first()
    )

    if not user or not verify_password(password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Invalid credentials',
        )

    token = create_access_token({'sub': str(user.id)})
    return Token(access_token=token)


def login_user(
    db: Session,
    data_or_email: LoginRequest | str,
    password: str | None = None,
) -> Token:
    """Login helper with backward-compatible signatures."""
    if isinstance(data_or_email, LoginRequest):
        email = data_or_email.email
        raw_password = data_or_email.password
    else:
        if password is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail='Password is required',
            )
        email = data_or_email
        raw_password = password

    return login_user_credentials(db, email, raw_password)
