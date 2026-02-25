import { grade1, grade2, grade3 } from './grades/index.js'
import { findTopicInGrade } from './core/shared.js'

const BRANCH_NAME_MAP = {
  'numeros-naturales': 'Numeros Naturales',
  'aritmetica-fundamental': 'Aritmetica Fundamental',
  'aritmetica-avanzada': 'Aritmetica Avanzada',
  geometria: 'Geometria',
  algebra: 'Algebra',
  'algebra-basica': 'Algebra',
  'estadistica-probabilidad': 'Estadistica y Probabilidad',
  medicion: 'Medicion',
  funciones: 'Funciones',
}

const deepClone = (value) => JSON.parse(JSON.stringify(value))

const slugify = (value) => {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

const clampDifficulty = (value, fallback = 1) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.max(1, Math.min(9, Math.floor(parsed)))
}

const clampQuestionCount = (value, fallback = 4) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.max(1, Math.floor(parsed))
}

const normalizeProblemMix = (value, fallback = 'mixed') => {
  const normalized = String(value ?? '').trim().toLowerCase()
  if (['contextualized', 'mechanical', 'mixed'].includes(normalized)) return normalized
  return fallback
}

const countLessonsInGrade = (grade) => {
  return (grade?.areas || []).reduce((areaTotal, area) => {
    const topicTotal = (area?.topics || []).reduce((acc, topic) => acc + (topic?.lessons?.length || 0), 0)
    return areaTotal + topicTotal
  }, 0)
}

const buildProgressId = ({ gradeId, topicId, lessonId }) => `${gradeId}:${topicId}:${lessonId}`
const buildLessonRouteId = ({ gradeId, topicId, lessonId }) => `${gradeId}~${topicId}~${lessonId}`

const normalizeLesson = ({ lesson, topic, area, grade, index }) => {
  const fallbackQuestionCount = lesson?.type === 'exam' ? 10 : 4
  const normalizedProblemMix = normalizeProblemMix(lesson?.problemMix, topic?.problemMix || 'mixed')
  const normalizedSubtopics = Array.isArray(lesson?.subtopics)
    ? lesson.subtopics.map((item) => String(item || '').trim()).filter(Boolean)
    : []
  const mergedSkills = Array.isArray(lesson?.skills) ? [...new Set(lesson.skills)] : []
  const difficulty = clampDifficulty(lesson?.difficulty, clampDifficulty(topic?.difficultyRange?.[0], 1))
  const questionCount = clampQuestionCount(lesson?.questionCount, fallbackQuestionCount)
  const xpFallback = Math.max(10, 8 + difficulty * 5 + questionCount)
  const rawXp = Number(lesson?.xpReward)
  const xpReward = Number.isFinite(rawXp) ? Math.max(0, Math.floor(rawXp)) : xpFallback
  const lessonId = String(lesson?.id || `${topic.id}-l${index + 1}`).trim()

  return {
    ...lesson,
    id: lessonId,
    title: String(lesson?.title || `Leccion ${index + 1}`).trim(),
    type: lesson?.type === 'exam' ? 'exam' : 'practice',
    difficulty,
    xpReward,
    questionCount,
    problemMix: normalizedProblemMix,
    subtopics: normalizedSubtopics,
    skills: mergedSkills,
    contextualized: normalizedProblemMix === 'contextualized',
    gradeId: grade.id,
    gradeNumber: Number(grade.gradeNumber || 0),
    gradeName: grade.name || grade.id,
    areaId: area.id,
    areaName: area.name || area.id,
    topicId: topic.id,
    topicName: topic.name || topic.id,
    progressId: buildProgressId({
      gradeId: grade.id,
      topicId: topic.id,
      lessonId,
    }),
    routeId: buildLessonRouteId({
      gradeId: grade.id,
      topicId: topic.id,
      lessonId,
    }),
  }
}

const normalizeTopic = ({ topic, area, grade }) => {
  const nextTopic = {
    ...topic,
    id: String(topic?.id || slugify(topic?.name || 'topic')),
    name: String(topic?.name || topic?.id || 'Tema').trim(),
    subtopics: Array.isArray(topic?.subtopics) ? topic.subtopics.map((item) => String(item || '').trim()).filter(Boolean) : [],
    difficultyRange: Array.isArray(topic?.difficultyRange) ? topic.difficultyRange.map((value) => clampDifficulty(value, 1)) : [],
    questionCountRange: Array.isArray(topic?.questionCountRange)
      ? topic.questionCountRange.map((value) => clampQuestionCount(value, 1))
      : [],
    problemMix: normalizeProblemMix(topic?.problemMix, 'mixed'),
  }

  const normalizedLessons = (topic?.lessons || []).map((lesson, index) =>
    normalizeLesson({
      lesson,
      topic: nextTopic,
      area,
      grade,
      index,
    }),
  )

  return {
    ...nextTopic,
    lessons: normalizedLessons,
    lessonCount: normalizedLessons.length,
  }
}

const normalizeArea = ({ area, grade }) => {
  const nextArea = {
    ...area,
    id: String(area?.id || slugify(area?.name || 'area')),
    name: String(area?.name || area?.id || 'Area').trim(),
  }

  const normalizedTopics = (area?.topics || []).map((topic) =>
    normalizeTopic({
      topic,
      area: nextArea,
      grade,
    }),
  )

  return {
    ...nextArea,
    topics: normalizedTopics,
    lessonCount: normalizedTopics.reduce((acc, topic) => acc + (topic.lessonCount || 0), 0),
  }
}

const normalizeGrades = (sourceGrades = []) => {
  return (sourceGrades || [])
    .map((grade) => {
      const nextGrade = deepClone(grade)
      nextGrade.id = String(nextGrade?.id || slugify(nextGrade?.name || 'grade'))
      nextGrade.gradeNumber = Number(nextGrade?.gradeNumber || 0)
      nextGrade.name = String(nextGrade?.name || nextGrade.id).trim()
      nextGrade.areas = (nextGrade?.areas || []).map((area) => normalizeArea({ area, grade: nextGrade }))
      nextGrade.lessonCount = countLessonsInGrade(nextGrade)
      return nextGrade
    })
    .sort((a, b) => Number(a.gradeNumber || 0) - Number(b.gradeNumber || 0))
}

const resolveBranchId = (area) => {
  const key = slugify(area?.id || area?.name || 'rama')

  if (key.includes('numeros-naturales')) return 'numeros-naturales'
  if (key.includes('aritmetica-fundamental')) return 'aritmetica-fundamental'
  if (key.includes('aritmetica-avanzada')) return 'aritmetica-avanzada'
  if (key.includes('algebra-avanzada') || key.includes('algebra-basica') || key === 'algebra') return 'algebra'
  if (key.includes('estadistica-probabilidad')) return 'estadistica-probabilidad'
  if (key.includes('introduccion-funciones') || key.includes('funcion')) return 'funciones'
  if (key.includes('geometria')) return 'geometria'
  if (key.includes('medicion')) return 'medicion'

  return key
}

const buildBranchCollection = (grades = []) => {
  const branchMap = new Map()

  for (const grade of grades) {
    for (const area of grade?.areas || []) {
      const branchId = resolveBranchId(area)
      if (!branchMap.has(branchId)) {
        const label = BRANCH_NAME_MAP[branchId] || area?.name || branchId
        branchMap.set(branchId, {
          id: branchId,
          name: label,
          description: `Modulo por rama: ${label}`,
          lessonCount: 0,
          gradeIds: new Set(),
          modules: [],
        })
      }

      const branch = branchMap.get(branchId)
      branch.gradeIds.add(grade.id)

      const module = {
        id: `${grade.id}:${area.id}`,
        gradeId: grade.id,
        gradeNumber: Number(grade.gradeNumber || 0),
        gradeName: grade.name || grade.id,
        areaId: area.id,
        areaName: area.name || area.id,
        lessonCount: 0,
        topics: [],
      }

      for (const topic of area?.topics || []) {
        const lessons = (topic?.lessons || []).map((lesson) => ({
          ...lesson,
        }))

        module.lessonCount += lessons.length
        module.topics.push({
          id: topic.id,
          name: topic.name || topic.id,
          subtopics: Array.isArray(topic.subtopics) ? [...topic.subtopics] : [],
          lessonCount: lessons.length,
          lessons,
        })
      }

      if (module.lessonCount > 0) {
        module.topics.sort((a, b) => a.name.localeCompare(b.name))
        branch.modules.push(module)
        branch.lessonCount += module.lessonCount
      }
    }
  }

  return [...branchMap.values()]
    .map((branch) => ({
      ...branch,
      gradeCount: branch.gradeIds.size,
      gradeIds: [...branch.gradeIds],
      modules: branch.modules.sort((a, b) => a.gradeNumber - b.gradeNumber || a.areaName.localeCompare(b.areaName)),
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

export const CURRICULUM_GRADES = normalizeGrades([grade1, grade2, grade3])
export const CURRICULUM_BRANCHES = buildBranchCollection(CURRICULUM_GRADES)

export const getQuestionTypeByDifficulty = (difficulty) => {
  return Number(difficulty) >= 4 ? 'input' : 'multiple-choice'
}

const gradeIndexById = new Map()
const gradeIndexByNumber = new Map()
const branchIndexById = new Map()
const BRANCH_ALIASES = {
  'algebra-basica': 'algebra',
  'introduccion-funciones': 'funciones',
}

for (const grade of CURRICULUM_GRADES) {
  gradeIndexById.set(grade.id, grade)
  gradeIndexByNumber.set(Number(grade.gradeNumber), grade)
}

for (const branch of CURRICULUM_BRANCHES) {
  branchIndexById.set(branch.id, branch)
}

const parseGradeKey = (grade) => {
  if (grade == null) return null

  if (typeof grade === 'number') return Number.isFinite(grade) ? Math.floor(grade) : null

  const asString = String(grade).trim().toLowerCase()
  if (!asString) return null

  if (gradeIndexById.has(asString)) {
    return Number(gradeIndexById.get(asString)?.gradeNumber || 0)
  }

  const numericMatch = asString.match(/\d+/)
  if (!numericMatch) return null
  const parsed = Number(numericMatch[0])
  return Number.isFinite(parsed) ? Math.floor(parsed) : null
}

export const getGradeCurriculum = (grade) => {
  const parsed = parseGradeKey(grade)
  if (!parsed) return null
  return gradeIndexByNumber.get(parsed) || null
}

export const getTopicByGradeAndId = (grade, topicId) => {
  const gradeData = getGradeCurriculum(grade)
  if (!gradeData) return null
  return findTopicInGrade(gradeData, topicId)
}

export const getFinalExamBlueprint = (grade) => {
  const gradeData = getGradeCurriculum(grade)
  return gradeData?.finalExam || null
}

export const getCurriculumBranch = (branchId) => {
  const key = String(branchId ?? '').trim().toLowerCase()
  if (!key) return null
  return branchIndexById.get(key) || branchIndexById.get(BRANCH_ALIASES[key]) || null
}

export const CURRICULUM_INDEX = {
  byId: gradeIndexById,
  byNumber: gradeIndexByNumber,
  branchById: branchIndexById,
}
