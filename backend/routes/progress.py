from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from backend.core.database import get_db
from backend.core.security import get_current_user
from backend.schemas.user import UserOut
from backend.schemas.progress import ProgressCreate, ProgressOut, ProgressSummary
from backend.services.progress_service import (
    add_progress,
    get_user_progress,
    get_progress_summary,
)

router = APIRouter(
    prefix='/progress',
    tags=['Progress'],
)


@router.get('/', response_model=List[ProgressOut])
def read_progress(
    db: Session = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    return get_user_progress(db, current_user.id)


@router.post('/', response_model=ProgressOut)
def add_progress_route(
    data: ProgressCreate,
    db: Session = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    return add_progress(db, current_user.id, data)


@router.get('/summary', response_model=ProgressSummary)
def read_progress_summary(
    db: Session = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    return get_progress_summary(db, current_user.id)
