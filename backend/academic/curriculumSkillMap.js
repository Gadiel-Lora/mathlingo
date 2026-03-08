import { CURRICULUM_GRADES } from '../../curriculum/index.js'
import { getPrerequisites, getSkill } from './domainGraph.js'
import { getUserMasteryMap } from './masteryEngine.js'

const CORE_WEIGHT = 0.7
const SUPPORT_WEIGHT = 0.3
const LESSON_COMPLETION_TARGET = 75

const normalizeId = (value) => String(value ?? '').trim()

const clamp = (value, min, max) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return min
  return Math.max(min, Math.min(max, parsed))
}

const toUniqueList = (items = []) => [...new Set(items.filter(Boolean))]

const buildCurriculumMap = () => {
  const lessonByRouteId = new Map()
  const lessonByProgressId = new Map()
  const lessonsByLessonId = new Map()
  const lessonsByUnitId = new Map()
  const lessonBySkillId = new Map()

  for (const grade of CURRICULUM_GRADES) {
    for (const area of grade?.areas || []) {
      for (const topic of area?.topics || []) {
        const unitId = `${grade.id}:${area.id}:${topic.id}`

        for (const lesson of topic?.lessons || []) {
          const canonicalSkillId = `${grade.id}:${topic.id}:${lesson.id}`
          const lessonRef = {
            gradeId: grade.id,
            gradeNumber: Number(grade?.gradeNumber || 0),
            areaId: area.id,
            areaName: area?.name || area.id,
            topicId: topic.id,
            topicName: topic?.name || topic.id,
            unitId,
            lessonId: lesson.id,
            lessonRouteId: lesson?.routeId || `${grade.id}~${topic.id}~${lesson.id}`,
            lessonProgressId: lesson?.progressId || `${grade.id}:${topic.id}:${lesson.id}`,
            lessonTitle: lesson?.title || lesson.id,
            canonicalSkillId,
          }

          lessonByRouteId.set(lessonRef.lessonRouteId, lessonRef)
          lessonByProgressId.set(lessonRef.lessonProgressId, lessonRef)
          lessonBySkillId.set(canonicalSkillId, lessonRef)

          if (!lessonsByLessonId.has(lessonRef.lessonId)) {
            lessonsByLessonId.set(lessonRef.lessonId, [])
          }
          lessonsByLessonId.get(lessonRef.lessonId).push(lessonRef)

          if (!lessonsByUnitId.has(unitId)) {
            lessonsByUnitId.set(unitId, [])
          }
          lessonsByUnitId.get(unitId).push(lessonRef)
        }
      }
    }
  }

  return {
    lessonByRouteId,
    lessonByProgressId,
    lessonsByLessonId,
    lessonsByUnitId,
    lessonBySkillId,
  }
}

const MAP_CACHE = buildCurriculumMap()

const resolveLessonRecords = (lessonId) => {
  const safeLessonId = normalizeId(lessonId)
  if (!safeLessonId) return []
  if (MAP_CACHE.lessonByRouteId.has(safeLessonId)) return [MAP_CACHE.lessonByRouteId.get(safeLessonId)]
  if (MAP_CACHE.lessonByProgressId.has(safeLessonId)) return [MAP_CACHE.lessonByProgressId.get(safeLessonId)]
  if (MAP_CACHE.lessonBySkillId.has(safeLessonId)) return [MAP_CACHE.lessonBySkillId.get(safeLessonId)]
  return MAP_CACHE.lessonsByLessonId.get(safeLessonId) || []
}

const buildLessonSkillEntries = (lessonRecord) => {
  const coreSkill = getSkill(lessonRecord?.canonicalSkillId)
  if (!coreSkill) return []

  const supportSkills = getPrerequisites(coreSkill.id)
    .slice(-2)
    .filter(Boolean)

  const supportWeight = supportSkills.length > 0 ? Number((SUPPORT_WEIGHT / supportSkills.length).toFixed(4)) : 0
  const entries = [
    {
      lessonId: lessonRecord.lessonRouteId,
      unitId: lessonRecord.unitId,
      skillId: coreSkill.id,
      role: 'core',
      weight: CORE_WEIGHT,
      masteryThreshold: Number(coreSkill.mastery_threshold || 70),
    },
    ...supportSkills.map((skill) => ({
      lessonId: lessonRecord.lessonRouteId,
      unitId: lessonRecord.unitId,
      skillId: skill.id,
      role: 'support',
      weight: supportWeight,
      masteryThreshold: Number(skill.mastery_threshold || 70),
    })),
  ]

  return entries
}

export const getLessonSkills = (lessonId) => {
  const records = resolveLessonRecords(lessonId)
  if (!records.length) return []

  const merged = new Map()
  for (const record of records) {
    for (const entry of buildLessonSkillEntries(record)) {
      const key = entry.skillId
      if (!merged.has(key)) {
        merged.set(key, {
          ...entry,
          sourceLessons: [record.lessonRouteId],
        })
      } else {
        const existing = merged.get(key)
        existing.weight = Math.max(Number(existing.weight || 0), Number(entry.weight || 0))
        existing.role = existing.role === 'core' || entry.role === 'core' ? 'core' : 'support'
        existing.sourceLessons = toUniqueList([...existing.sourceLessons, record.lessonRouteId])
      }
    }
  }

  return [...merged.values()].sort((left, right) => {
    if (left.role !== right.role) return left.role === 'core' ? -1 : 1
    if (left.weight !== right.weight) return right.weight - left.weight
    return left.skillId.localeCompare(right.skillId)
  })
}

export const isLessonCompleted = (userId, lessonId) => {
  const skills = getLessonSkills(lessonId)
  if (!skills.length) {
    return {
      completed: false,
      lessonId: normalizeId(lessonId),
      reason: 'lesson-not-found',
      weightedMastery: 0,
      coreSkills: 0,
      masteredCoreSkills: 0,
      completionTarget: LESSON_COMPLETION_TARGET,
    }
  }

  const masteryMap = getUserMasteryMap(userId)
  let weightSum = 0
  let weightedScore = 0
  let coreSkills = 0
  let masteredCoreSkills = 0

  for (const mapping of skills) {
    const mastery = clamp(Number(masteryMap?.[mapping.skillId] || 0), 0, 100)
    const weight = clamp(Number(mapping.weight || 0), 0, 1)
    weightSum += weight
    weightedScore += mastery * weight

    if (mapping.role === 'core') {
      coreSkills += 1
      if (mastery >= Number(mapping.masteryThreshold || 70)) masteredCoreSkills += 1
    }
  }

  const weightedMastery = weightSum > 0 ? weightedScore / weightSum : 0
  const coreCoverage = coreSkills > 0 ? masteredCoreSkills / coreSkills : 0
  const completed = weightedMastery >= LESSON_COMPLETION_TARGET && coreCoverage >= 1

  return {
    completed,
    lessonId: normalizeId(lessonId),
    weightedMastery: Number(weightedMastery.toFixed(2)),
    coreCoverage: Number((coreCoverage * 100).toFixed(2)),
    mappedSkills: skills.length,
    coreSkills,
    masteredCoreSkills,
    completionTarget: LESSON_COMPLETION_TARGET,
  }
}

export const getUnitLessons = (unitId) => {
  const safeUnitId = normalizeId(unitId)
  if (!safeUnitId) return []
  const lessons = MAP_CACHE.lessonsByUnitId.get(safeUnitId) || []
  return [...lessons]
}

export const isUnitCompleted = (userId, unitId) => {
  const lessons = getUnitLessons(unitId)
  if (!lessons.length) {
    return {
      completed: false,
      unitId: normalizeId(unitId),
      reason: 'unit-not-found',
      totalLessons: 0,
      completedLessons: 0,
      completionRate: 0,
    }
  }

  const lessonResults = lessons.map((lesson) => ({
    lessonId: lesson.lessonRouteId,
    lessonTitle: lesson.lessonTitle,
    ...isLessonCompleted(userId, lesson.lessonRouteId),
  }))
  const completedLessons = lessonResults.filter((result) => result.completed).length
  const completionRate = (completedLessons / lessons.length) * 100
  const completed = completedLessons === lessons.length

  return {
    completed,
    unitId: normalizeId(unitId),
    totalLessons: lessons.length,
    completedLessons,
    completionRate: Number(completionRate.toFixed(2)),
    lessons: lessonResults,
  }
}
