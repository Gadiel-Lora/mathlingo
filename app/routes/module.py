from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import get_db
from app.core.security import require_admin
from app.schemas.module import ModuleCreate, ModuleResponse
from app.schemas.user import UserOut
from app.services.module_service import create_module, get_module, get_modules

router = APIRouter(
    prefix='/modules',
    tags=['Modules'],
)


@router.post('/', response_model=ModuleResponse)
def create(
    module: ModuleCreate,
    db: Session = Depends(get_db),
    admin_user: UserOut = Depends(require_admin),
):
    return create_module(db, module)


@router.get('/', response_model=list[ModuleResponse])
def list_modules(db: Session = Depends(get_db)):
    return get_modules(db)


@router.get('/{module_id}', response_model=ModuleResponse)
def read_module(module_id: int, db: Session = Depends(get_db)):
    return get_module(db, module_id)
