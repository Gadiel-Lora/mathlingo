from app.core.database import engine

try:
    with engine.connect() as connection:
        print("Conexión ORM exitosa")
except Exception as e:
    print("Error ORM:", e)
