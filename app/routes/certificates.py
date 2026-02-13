from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.certificate import CertificateVerifyOut
from app.services.certificate_service import verify_certificate_hash

router = APIRouter(tags=['Certificates'])


@router.get('/verify/{certificate_hash}', response_model=CertificateVerifyOut)
def verify_certificate(certificate_hash: str, db: Session = Depends(get_db)):
    """Public endpoint to verify issued certificates by hash."""
    certificate = verify_certificate_hash(db, certificate_hash)
    if certificate is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='Certificate not found',
        )
    return CertificateVerifyOut.model_validate(certificate)
