from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from backend.models.module import Module
from backend.schemas.module import ModuleCreate


def create_module(db: Session, module: ModuleCreate):
    new_module = Module(**module.model_dump())
    db.add(new_module)
    db.commit()
    db.refresh(new_module)
    return new_module


def get_modules(db: Session):
    return db.query(Module).all()


def get_module(db: Session, module_id: int):
    module = db.query(Module).filter(Module.id == module_id).first()
    if module is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='Module not found',
        )
    return module

