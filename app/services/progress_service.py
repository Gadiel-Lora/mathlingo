from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.module import Module
from app.models.progress import Progress
from app.schemas.progress import ProgressCreate


def get_user_progress(db: Session, user_id: int):
    return db.query(Progress).filter(Progress.user_id == user_id).all()


def add_progress(
    db: Session,
    user_id: int,
    data: ProgressCreate,
):
    if data.module_id <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Invalid module_id',
        )

    if data.xp <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Invalid xp',
        )

    module = db.query(Module).filter(Module.id == data.module_id).first()
    if module is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='Module not found',
        )

    progress = (
        db.query(Progress)
        .filter(
            Progress.user_id == user_id,
            Progress.module_id == data.module_id,
        )
        .first()
    )

    if progress:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Progress already exists for this module',
        )
    else:
        progress = Progress(
            user_id=user_id,
            module_id=data.module_id,
            xp=data.xp,
        )
        db.add(progress)

    db.commit()
    db.refresh(progress)
    return progress


def get_progress_summary(db: Session, user_id: int) -> dict:
    total_xp = (
        db.query(func.coalesce(func.sum(Progress.xp), 0))
        .filter(Progress.user_id == user_id)
        .scalar()
    )
    return {'total_xp': int(total_xp or 0)}
