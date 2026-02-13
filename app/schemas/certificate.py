from datetime import datetime

from pydantic import BaseModel


class CertificateVerifyOut(BaseModel):
    """Public certificate verification payload."""

    id: int
    user_id: int
    subject_id: int
    avg_mastery: float
    issued_at: datetime
    verification_hash: str
    status: str

    class Config:
        from_attributes = True
