from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class CurriculumLessonBase(BaseModel):
    id: str
    title: str
    type: str = 'practice'
    difficulty: int = 1
    xp_reward: int = Field(default=0, alias='xpReward')
    question_count: int = Field(default=4, alias='questionCount')
    problem_mix: str = Field(default='mixed', alias='problemMix')
    subtopics: list[str] = Field(default_factory=list)
    skills: list[str] = Field(default_factory=list)

    model_config = ConfigDict(populate_by_name=True)


class CurriculumLessonWrite(CurriculumLessonBase):
    pass


class CurriculumLessonResponse(CurriculumLessonBase):
    contextualized: bool = False
    grade_id: str = Field(alias='gradeId')
    grade_number: int = Field(alias='gradeNumber')
    grade_name: str = Field(alias='gradeName')
    area_id: str = Field(alias='areaId')
    area_name: str = Field(alias='areaName')
    topic_id: str = Field(alias='topicId')
    topic_name: str = Field(alias='topicName')
    progress_id: str = Field(alias='progressId')
    route_id: str = Field(alias='routeId')

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class CurriculumTopicBase(BaseModel):
    id: str
    name: str
    subtopics: list[str] = Field(default_factory=list)
    difficulty_range: list[int] = Field(default_factory=list, alias='difficultyRange')
    question_count_range: list[int] = Field(default_factory=list, alias='questionCountRange')
    problem_mix: str = Field(default='mixed', alias='problemMix')

    model_config = ConfigDict(populate_by_name=True)


class CurriculumTopicWrite(CurriculumTopicBase):
    lessons: list[CurriculumLessonWrite] = Field(default_factory=list)


class CurriculumTopicResponse(CurriculumTopicBase):
    lessons: list[CurriculumLessonResponse] = Field(default_factory=list)
    lesson_count: int = Field(default=0, alias='lessonCount')

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class CurriculumAreaBase(BaseModel):
    id: str
    name: str
    branch_id: str | None = Field(default=None, alias='branchId')
    branch_name: str | None = Field(default=None, alias='branchName')

    model_config = ConfigDict(populate_by_name=True)


class CurriculumAreaWrite(CurriculumAreaBase):
    topics: list[CurriculumTopicWrite] = Field(default_factory=list)


class CurriculumAreaResponse(CurriculumAreaBase):
    topics: list[CurriculumTopicResponse] = Field(default_factory=list)
    lesson_count: int = Field(default=0, alias='lessonCount')

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class CurriculumGradeBase(BaseModel):
    id: str
    grade_number: int = Field(alias='gradeNumber')
    name: str
    level_name: str | None = Field(default=None, alias='levelName')
    objective: str | None = None
    final_exam: dict[str, Any] | None = Field(default=None, alias='finalExam')

    model_config = ConfigDict(populate_by_name=True)


class CurriculumGradeWrite(CurriculumGradeBase):
    areas: list[CurriculumAreaWrite] = Field(default_factory=list)


class CurriculumGradeResponse(CurriculumGradeBase):
    areas: list[CurriculumAreaResponse] = Field(default_factory=list)
    lesson_count: int = Field(default=0, alias='lessonCount')

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class CurriculumCollectionResponse(BaseModel):
    grades: list[CurriculumGradeResponse] = Field(default_factory=list)
    total_grades: int = Field(default=0, alias='totalGrades')

    model_config = ConfigDict(populate_by_name=True)


class CurriculumSingleResponse(BaseModel):
    grade: CurriculumGradeResponse | None = None

    model_config = ConfigDict(populate_by_name=True)


class BranchTopicResponse(BaseModel):
    id: str
    name: str
    subtopics: list[str] = Field(default_factory=list)
    lesson_count: int = Field(default=0, alias='lessonCount')
    lessons: list[CurriculumLessonResponse] = Field(default_factory=list)

    model_config = ConfigDict(populate_by_name=True)


class BranchModuleResponse(BaseModel):
    id: str
    grade_id: str = Field(alias='gradeId')
    grade_number: int = Field(alias='gradeNumber')
    grade_name: str = Field(alias='gradeName')
    area_id: str = Field(alias='areaId')
    area_name: str = Field(alias='areaName')
    lesson_count: int = Field(alias='lessonCount')
    topics: list[BranchTopicResponse] = Field(default_factory=list)

    model_config = ConfigDict(populate_by_name=True)


class BranchResponse(BaseModel):
    id: str
    name: str
    description: str
    lesson_count: int = Field(alias='lessonCount')
    grade_count: int = Field(alias='gradeCount')
    grade_ids: list[str] = Field(default_factory=list, alias='gradeIds')
    modules: list[BranchModuleResponse] = Field(default_factory=list)

    model_config = ConfigDict(populate_by_name=True)


class BranchCollectionResponse(BaseModel):
    branches: list[BranchResponse] = Field(default_factory=list)
    total_branches: int = Field(default=0, alias='totalBranches')

    model_config = ConfigDict(populate_by_name=True)


class BranchSingleResponse(BaseModel):
    branch: BranchResponse | None = None

    model_config = ConfigDict(populate_by_name=True)
