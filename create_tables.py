from app.core.database import create_tables

# Import models so they are registered in the metadata.
from app.models.user import User
from app.models.module import Module
from app.models.level import Level
from app.models.exercise import Exercise
from app.models.progress import Progress

create_tables()
print('Tablas creadas')
