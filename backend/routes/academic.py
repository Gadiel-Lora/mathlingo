from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from backend.core.database import get_db
from backend.core.security import require_admin
from backend.schemas.academic import (
    BranchCollectionResponse,
    BranchSingleResponse,
    CurriculumCollectionResponse,
    CurriculumGradeResponse,
    CurriculumGradeWrite,
    CurriculumSingleResponse,
)
from backend.schemas.user import UserOut
from backend.services.academic_service import (
    create_curriculum_grade,
    delete_curriculum_grade,
    get_curriculum_branch,
    get_curriculum_grade,
    list_curriculum_branches,
    list_curriculum_grades,
    update_curriculum_grade,
)

router = APIRouter(
    prefix='/api/academic',
    tags=['Academic'],
)


@router.get('/curriculum', response_model=CurriculumCollectionResponse | CurriculumSingleResponse)
def get_curriculum(
    grade: str | None = None,
    db: Session = Depends(get_db),
):
    if grade:
        return {'grade': get_curriculum_grade(db, grade)}

    grades = list_curriculum_grades(db)
    return {'grades': grades, 'totalGrades': len(grades)}


@router.get('/grades/{grade_id}', response_model=CurriculumGradeResponse)
def get_grade(
    grade_id: str,
    db: Session = Depends(get_db),
):
    return get_curriculum_grade(db, grade_id)


@router.get('/branches', response_model=BranchCollectionResponse)
def get_branches(db: Session = Depends(get_db)):
    branches = list_curriculum_branches(db)
    return {'branches': branches, 'totalBranches': len(branches)}


@router.get('/branches/{branch_id}', response_model=BranchSingleResponse)
def get_branch(
    branch_id: str,
    db: Session = Depends(get_db),
):
    return {'branch': get_curriculum_branch(db, branch_id)}


@router.post('/grades', response_model=CurriculumGradeResponse)
def create_grade(
    payload: CurriculumGradeWrite,
    db: Session = Depends(get_db),
    admin_user: UserOut = Depends(require_admin),
):
    return create_curriculum_grade(db, payload)


@router.put('/grades/{grade_id}', response_model=CurriculumGradeResponse)
def update_grade(
    grade_id: str,
    payload: CurriculumGradeWrite,
    db: Session = Depends(get_db),
    admin_user: UserOut = Depends(require_admin),
):
    return update_curriculum_grade(db, grade_id, payload)


@router.delete('/grades/{grade_id}', status_code=status.HTTP_204_NO_CONTENT)
def delete_grade(
    grade_id: str,
    db: Session = Depends(get_db),
    admin_user: UserOut = Depends(require_admin),
):
    delete_curriculum_grade(db, grade_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
