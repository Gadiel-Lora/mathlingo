from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from app.core.deps import get_db
from app.core.security import require_admin
from app.schemas.user import UserOut, UserPromoteRequest
from app.services.user_service import list_users, promote_user

router = APIRouter(prefix='/users', tags=['Users'])


@router.get('/', response_model=List[UserOut])
def get_users(
    db: Session = Depends(get_db),
    admin_user: UserOut = Depends(require_admin),
):
    return list_users(db)


@router.post('/promote', response_model=UserOut)
def promote(
    data: UserPromoteRequest,
    db: Session = Depends(get_db),
    admin_user: UserOut = Depends(require_admin),
):
    return promote_user(db, data.email)
