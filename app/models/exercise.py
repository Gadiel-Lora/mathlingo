from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship

from app.core.database import Base


class Exercise(Base):
    __tablename__ = "exercises"

    id = Column(Integer, primary_key=True, index=True)
    question = Column(String, nullable=False)
    answer = Column(String, nullable=False)

    level_id = Column(Integer, ForeignKey("levels.id"), nullable=False)

    # 🔗 relación correcta con Level
    level = relationship(
        "Level",
        back_populates="exercises",
    )
