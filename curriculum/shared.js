const clampDifficulty = (value) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 1
  return Math.max(1, Math.min(5, Math.floor(parsed)))
}

export const createLesson = ({
  topicId,
  index,
  title,
  type = 'practice',
  difficulty = 1,
  skills = [],
  xpReward,
}) => {
  const lessonType = type === 'exam' ? 'exam' : 'practice'
  const safeDifficulty = clampDifficulty(difficulty)
  const baseXp = lessonType === 'exam' ? 50 : 12
  const computedXp = Number.isFinite(Number(xpReward))
    ? Math.max(0, Math.floor(Number(xpReward)))
    : baseXp + safeDifficulty * (lessonType === 'exam' ? 4 : 3)

  return {
    id: `${topicId}-l${index}`,
    title: String(title || `Leccion ${index}`).trim(),
    type: lessonType,
    difficulty: safeDifficulty,
    skills: Array.isArray(skills) ? skills : [],
    xpReward: computedXp,
  }
}

export const buildLessonsFromOutline = (topicId, outline = [], examDifficulty = 3) => {
  return outline.map((title, index) => {
    const isExam = /examen/i.test(String(title))
    const difficulty = isExam ? examDifficulty : Math.max(1, Math.min(5, Math.floor(index / 2) + 1))
    const skills = String(title)
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 4)

    return createLesson({
      topicId,
      index: index + 1,
      title,
      type: isExam ? 'exam' : 'practice',
      difficulty,
      skills,
    })
  })
}

export const findTopicInGrade = (grade, topicId) => {
  if (!grade?.areas?.length) return null

  for (const area of grade.areas) {
    for (const topic of area.topics || []) {
      if (topic.id === topicId) return topic
    }
  }

  return null
}
