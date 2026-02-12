from app.core.database import SessionLocal
from app.schemas.auth import LoginRequest
from app.services.auth_service import login_user

db = SessionLocal()

token = login_user(db, LoginRequest(email="test@mail.com", password="1234"))
print(token)
