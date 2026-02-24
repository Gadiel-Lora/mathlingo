const normalizeId = (value) => String(value ?? '').trim()

export const buildLessonProgressId = ({ gradeId, topicId, lessonId }) => {
  return [normalizeId(gradeId), normalizeId(topicId), normalizeId(lessonId)].join(':')
}

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
    description: `${grade.areas?.length || 0} areas academicas`,
    lessonCount: lessonRows.length,
    examCount,
  }
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
