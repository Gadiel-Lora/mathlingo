from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.core.deps import get_db
from app.core.security import get_current_user, require_admin
from app.schemas.mastery import UserProgressOut, UserMasteryOut
from app.schemas.user import UserOut, UserPromoteRequest
from app.services.mastery_engine import get_user_mastery
from app.services.user_service import list_users, promote_user

router = APIRouter(prefix='/users', tags=['Users'])


@router.get('/', response_model=List[UserOut])
def get_users(
    db: Session = Depends(get_db),
    admin_user: UserOut = Depends(require_admin),
):
    """Return all users (admin only)."""
    return list_users(db)


@router.post('/promote', response_model=UserOut)
def promote(
    data: UserPromoteRequest,
    db: Session = Depends(get_db),
    admin_user: UserOut = Depends(require_admin),
):
    """Promote a user to admin."""
    return promote_user(db, data.email)


@router.get('/{user_id}/progress/', response_model=UserProgressOut)
def get_user_progress(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    """Return mastery progress for a user (self or admin)."""
    if current_user.id != user_id and current_user.role != 'admin':
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Access denied')

    mastery_rows = get_user_mastery(db, user_id)
    return UserProgressOut(
        user_id=user_id,
        mastery=[
            UserMasteryOut(topic_id=row.topic_id, mastery_score=row.mastery_score)
            for row in mastery_rows
        ],
    )
