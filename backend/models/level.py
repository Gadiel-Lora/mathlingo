from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship

from backend.core.database import Base


class Level(Base):
    __tablename__ = "levels"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)

    # 🔑 FK CORRECTA
    module_id = Column(Integer, ForeignKey("modules.id"), nullable=False)

    # 🔗 relaciones
    module = relationship(
        "Module",
        back_populates="levels",
    )

    exercises = relationship(
        "Exercise",
        back_populates="level",
        cascade="all, delete-orphan",
    )
