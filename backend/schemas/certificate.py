from datetime import datetime

from pydantic import BaseModel, ConfigDict


class CertificateVerifyOut(BaseModel):
    """Public certificate verification payload."""

    id: int
    user_id: int
    subject_id: int
    avg_mastery: float
    issued_at: datetime
    verification_hash: str
    status: str

    model_config = ConfigDict(from_attributes=True)
