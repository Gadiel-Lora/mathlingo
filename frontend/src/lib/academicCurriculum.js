const normalizeId = (value) => String(value ?? '').trim()
export const ADMIN_UNLOCK_SENTINEL = '__admin-unlock-all__'

const normalizeCompletedLessons = (completedLessons) => {
  if (!Array.isArray(completedLessons)) return []
  return completedLessons.map((lessonId) => normalizeId(lessonId)).filter(Boolean)
}
const toCompletedSet = (completedLessons) => new Set(normalizeCompletedLessons(completedLessons))
const hasAdminUnlock = (completedLessons) => toCompletedSet(completedLessons).has(ADMIN_UNLOCK_SENTINEL)
const byGradeNumber = (left, right) => Number(left?.gradeNumber || 0) - Number(right?.gradeNumber || 0)

export const buildLessonProgressId = ({ gradeId, topicId, lessonId }) => {
  return [normalizeId(gradeId), normalizeId(topicId), normalizeId(lessonId)].join(':')
}

export const buildFinalExamProgressId = (gradeId) => `${normalizeId(gradeId)}:final-exam`

export const encodeLessonRouteId = ({ gradeId, topicId, lessonId }) => {
  return [normalizeId(gradeId), normalizeId(topicId), normalizeId(lessonId)].join('~')
}

export const decodeLessonRouteId = (encoded) => {
  const [gradeId = '', topicId = '', lessonId = ''] = String(encoded ?? '').split('~')
  return {
    gradeId: normalizeId(gradeId),
    topicId: normalizeId(topicId),
    lessonId: normalizeId(lessonId),
  }
}

export const flattenGradeLessons = (grade) => {
  const rows = []
  let globalIndex = 0

  for (const area of grade?.areas || []) {
    for (const topic of area?.topics || []) {
      for (const lesson of topic?.lessons || []) {
        const progressId = buildLessonProgressId({
          gradeId: grade.id,
          topicId: topic.id,
          lessonId: lesson.id,
        })

        rows.push({
          globalIndex,
          progressId,
          gradeId: grade.id,
          gradeNumber: Number(grade.gradeNumber || 0),
          gradeName: grade.name || '',
          areaId: area.id,
          areaName: area.name || area.id,
          topicId: topic.id,
          topicName: topic.name || topic.id,
          lessonId: lesson.id,
          lessonTitle: lesson.title || lesson.id,
          lessonType: lesson.type || 'practice',
          difficulty: Number(lesson.difficulty || 1),
          xpReward: Number(lesson.xpReward || 0),
          questionCount: Math.max(1, Number(lesson.questionCount || (lesson.type === 'exam' ? 10 : 4))),
          problemMix: String(lesson.problemMix || topic.problemMix || 'mixed'),
          lessonSubtopics: Array.isArray(lesson.subtopics) ? lesson.subtopics : [],
          topicSubtopics: Array.isArray(topic.subtopics) ? topic.subtopics : [],
          skills: Array.isArray(lesson.skills) ? lesson.skills : [],
        })

        globalIndex += 1
      }
    }
  }

  return rows
}

export const summarizeGradeForCard = (grade) => {
  const lessonRows = flattenGradeLessons(grade)
  const examCount = lessonRows.filter((row) => row.lessonType === 'exam').length

  return {
    id: grade.id,
    gradeNumber: Number(grade.gradeNumber || 0),
    title: grade.name || grade.id,
    description: `${grade.areas?.length || 0} modulos curriculares`,
    lessonCount: lessonRows.length,
    examCount,
  }
}

const sortGrades = (grades) => {
  return (grades || []).slice().sort(byGradeNumber)
}

export const isFinalExamUnlockedInGrade = ({ grade, completedLessons }) => {
  if (hasAdminUnlock(completedLessons)) return true
  const completedSet = toCompletedSet(completedLessons)
  const lessonRows = flattenGradeLessons(grade).sort((a, b) => a.globalIndex - b.globalIndex)
  if (!lessonRows.length) return false
  return lessonRows.every((row) => completedSet.has(row.progressId))
}

export const isGradeAcademicallyCompleted = ({ grade, completedLessons }) => {
  if (hasAdminUnlock(completedLessons)) return true
  if (!grade?.id) return false
  const completedSet = toCompletedSet(completedLessons)
  const regularLessonsCompleted = isFinalExamUnlockedInGrade({ grade, completedLessons })
  if (!regularLessonsCompleted) return false
  return completedSet.has(buildFinalExamProgressId(grade.id))
}

export const getUnlockedGradeIds = ({ grades, completedLessons }) => {
  const orderedGrades = sortGrades(grades)
  if (!orderedGrades.length) return []
  if (hasAdminUnlock(completedLessons)) return orderedGrades.map((grade) => grade.id)

  const unlocked = new Set([orderedGrades[0].id])
  for (let index = 1; index < orderedGrades.length; index += 1) {
    const previousGrade = orderedGrades[index - 1]
    if (!isGradeAcademicallyCompleted({ grade: previousGrade, completedLessons })) {
      break
    }
    unlocked.add(orderedGrades[index].id)
  }

  return [...unlocked]
}

export const isGradeUnlocked = ({ grades, gradeId, completedLessons }) => {
  if (!gradeId) return false
  if (hasAdminUnlock(completedLessons)) return true
  const unlockedGradeIds = new Set(getUnlockedGradeIds({ grades, completedLessons }))
  return unlockedGradeIds.has(String(gradeId))
}

export const isLessonUnlockedInGrade = ({ grade, lessonProgressId, completedLessons }) => {
  if (hasAdminUnlock(completedLessons)) return true
  const targetProgressId = normalizeId(lessonProgressId)
  if (!grade?.id || !targetProgressId) return false

  const completedSet = toCompletedSet(completedLessons)
  const orderedLessons = flattenGradeLessons(grade).sort((a, b) => a.globalIndex - b.globalIndex)
  const targetIndex = orderedLessons.findIndex((lessonRow) => lessonRow.progressId === targetProgressId)
  if (targetIndex < 0) return false
  if (targetIndex === 0) return true

  for (let index = 0; index < targetIndex; index += 1) {
    if (!completedSet.has(orderedLessons[index].progressId)) {
      return false
    }
  }

  return true
}

export const findLessonContext = ({ grade, topicId, lessonId }) => {
  for (const area of grade?.areas || []) {
    for (const topic of area?.topics || []) {
      if (topic.id !== topicId) continue
      for (const lesson of topic.lessons || []) {
        if (lesson.id !== lessonId) continue
        return {
          gradeId: grade.id,
          gradeNumber: Number(grade.gradeNumber || 0),
          gradeName: grade.name || grade.id,
          areaId: area.id,
          areaName: area.name || area.id,
          topicId: topic.id,
          topicName: topic.name || topic.id,
          lessonId: lesson.id,
          lessonTitle: lesson.title || lesson.id,
          lessonType: lesson.type || 'practice',
          difficulty: Number(lesson.difficulty || 1),
          xpReward: Number(lesson.xpReward || 0),
          questionCount: Math.max(1, Number(lesson.questionCount || (lesson.type === 'exam' ? 10 : 4))),
          problemMix: String(lesson.problemMix || topic.problemMix || 'mixed'),
          lessonSubtopics: Array.isArray(lesson.subtopics) ? lesson.subtopics : [],
          topicSubtopics: Array.isArray(topic.subtopics) ? topic.subtopics : [],
          skills: Array.isArray(lesson.skills) ? lesson.skills : [],
          progressId: buildLessonProgressId({
            gradeId: grade.id,
            topicId: topic.id,
            lessonId: lesson.id,
          }),
        }
      }
    }
  }

  return null
}
