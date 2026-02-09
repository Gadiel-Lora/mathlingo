from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.user import User


def list_users(db: Session):
    return db.query(User).all()


def promote_user(db: Session, email: str) -> User:
    user = db.query(User).filter(User.email == email).first()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='User not found',
        )

    if user.role != 'admin':
        user.role = 'admin'
        db.commit()
        db.refresh(user)

    return user
