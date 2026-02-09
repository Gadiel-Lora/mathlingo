from app.core.security import hash_password, verify_password

hashed = hash_password("1234")
print(hashed)
print(verify_password("1234", hashed))
