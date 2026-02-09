from app.core.database import SessionLocal
from app.services.auth_service import login_user

db = SessionLocal()

token = login_user(db, "test@mail.com", "1234")
print(token)
