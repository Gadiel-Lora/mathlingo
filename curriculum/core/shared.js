const clampDifficulty = (value) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 1
  return Math.max(1, Math.min(9, Math.floor(parsed)))
}

export const createLesson = ({
  topicId,
  index,
  title,
  type = 'practice',
  difficulty = 1,
  skills = [],
  xpReward,
  questionCount,
  problemMix = 'mixed',
  subtopics = [],
}) => {
  const lessonType = type === 'exam' ? 'exam' : 'practice'
  const safeDifficulty = clampDifficulty(difficulty)
  const safeQuestionCount = Math.max(1, Math.floor(Number(questionCount || (lessonType === 'exam' ? 10 : 4))))
  const normalizedProblemMix = ['contextualized', 'mechanical', 'mixed'].includes(String(problemMix))
    ? String(problemMix)
    : 'mixed'
  const baseXp = lessonType === 'exam' ? 56 : 12
  const computedXp = Number.isFinite(Number(xpReward))
    ? Math.max(0, Math.floor(Number(xpReward)))
    : baseXp + safeDifficulty * (lessonType === 'exam' ? 6 : 4) + safeQuestionCount

  return {
    id: `${topicId}-l${index}`,
    title: String(title || `Leccion ${index}`).trim(),
    type: lessonType,
    difficulty: safeDifficulty,
    skills: Array.isArray(skills) ? skills : [],
    questionCount: safeQuestionCount,
    problemMix: normalizedProblemMix,
    subtopics: Array.isArray(subtopics)
      ? subtopics.map((subtopic) => String(subtopic || '').trim()).filter(Boolean)
      : [],
    contextualized: normalizedProblemMix === 'contextualized',
    xpReward: computedXp,
  }
}

export const buildLessonsFromOutline = (topicId, outline = [], examDifficulty = 3) => {
  return outline.map((title, index) => {
    const isExam = /examen/i.test(String(title))
    const difficulty = isExam ? examDifficulty : Math.max(1, Math.min(9, Math.floor(index / 2) + 1))
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
      questionCount: isExam ? 10 : 4,
      problemMix: isExam ? 'mixed' : 'contextualized',
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
