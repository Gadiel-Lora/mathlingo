from fastapi import APIRouter, Depends
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.auth import LoginRequest, Token
from app.schemas.user import UserCreate
from app.services.auth_service import (
    login_user,
    login_user_credentials,
    register_user,
)

router = APIRouter(prefix='/auth', tags=['Auth'])


@router.post('/register')
def register(user: UserCreate, db: Session = Depends(get_db)):
    return register_user(db, user)


@router.post('/login', response_model=Token)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    return login_user(db, data)


@router.post('/token', response_model=Token)
def login_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    # OAuth2 uses 'username'; here it is the email.
    return login_user_credentials(db, form_data.username, form_data.password)
