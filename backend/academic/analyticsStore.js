import { CURRICULUM_GRADES } from '../../curriculum/index.js'

const MAX_EVENTS_PER_USER = 5000

const userAnalyticsStore = new Map()

const normalizeId = (value) => String(value ?? '').trim()

const clamp = (value, min, max) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return min
  return Math.max(min, Math.min(max, parsed))
}

const round = (value, digits = 4) => Number(Number(value || 0).toFixed(digits))

const topicToBranch = (() => {
  const map = new Map()
  for (const grade of CURRICULUM_GRADES) {
    for (const area of grade?.areas || []) {
      for (const topic of area?.topics || []) {
        map.set(topic.id, {
          branchId: area.id,
          branchName: area.name || area.id,
          gradeNumber: Number(grade?.gradeNumber || 0),
        })
      }
    }
  }
  return map
})()

const ensureUserAnalytics = (userId) => {
  const key = normalizeId(userId)
  if (!key) return null

  if (!userAnalyticsStore.has(key)) {
    userAnalyticsStore.set(key, {
      userId: key,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      generatedCount: 0,
      totalAttempts: 0,
      correctAttempts: 0,
      assistedAttempts: 0,
      totalTimeMs: 0,
      weightedDifficultySum: 0,
      contextualizedAttempts: 0,
      advancedModelingAttempts: 0,
      currentStreak: 0,
      longestStreak: 0,
      events: [],
      errorsByType: new Map(),
      byTopic: new Map(),
      bySkill: new Map(),
    })
  }

  return userAnalyticsStore.get(key)
}

const pushEvent = (container, event) => {
  container.events.push(event)
  if (container.events.length > MAX_EVENTS_PER_USER) {
    container.events.splice(0, container.events.length - MAX_EVENTS_PER_USER)
  }
}

export const registerQuestionGeneratedEvent = ({
  userId,
  question,
  lessonContext = {},
}) => {
  const userState = ensureUserAnalytics(userId)
  if (!userState) return

  userState.generatedCount += 1
  userState.updatedAt = new Date().toISOString()
  pushEvent(userState, {
    type: 'question-generated',
    at: new Date().toISOString(),
    topic: question?.topic || lessonContext?.topicId || '',
    difficulty: Number(question?.difficulty || 1),
    mix: String(lessonContext?.problemMix || 'mixed'),
  })
}

export const registerAttemptAnalyticsEvent = ({
  userId,
  question,
  correct,
  assisted = false,
  elapsedTimeMs = 0,
  errorType = 'sin-error',
  requestedMix = 'mixed',
}) => {
  const userState = ensureUserAnalytics(userId)
  if (!userState) return null

  const safeDifficulty = clamp(question?.difficulty, 1, 9)
  const safeElapsed = Math.max(0, Number(elapsedTimeMs) || 0)
  const topicId = normalizeId(question?.topic)
  const skillId = `${question?.grade || 0}:${topicId}:${normalizeId(question?.templateId || 'template')}`
  const branchMeta = topicToBranch.get(topicId) || { branchId: 'general', branchName: 'General' }
  const nowIso = new Date().toISOString()

  userState.totalAttempts += 1
  if (Boolean(correct)) userState.correctAttempts += 1
  if (Boolean(assisted)) userState.assistedAttempts += 1
  userState.totalTimeMs += safeElapsed
  userState.weightedDifficultySum += safeDifficulty
  if (String(requestedMix) === 'contextualized') userState.contextualizedAttempts += 1
  if (String(requestedMix) === 'advanced-modeling') userState.advancedModelingAttempts += 1
  if (Boolean(correct)) {
    userState.currentStreak += 1
    userState.longestStreak = Math.max(userState.longestStreak, userState.currentStreak)
  } else {
    userState.currentStreak = 0
  }

  const nextErrorCount = (userState.errorsByType.get(errorType) || 0) + 1
  userState.errorsByType.set(errorType, nextErrorCount)

  const topicStats = userState.byTopic.get(topicId) || {
    topicId,
    branchId: branchMeta.branchId,
    branchName: branchMeta.branchName,
    gradeNumber: branchMeta.gradeNumber,
    attempts: 0,
    correct: 0,
    totalTimeMs: 0,
    difficultySum: 0,
  }
  topicStats.attempts += 1
  topicStats.correct += Boolean(correct) ? 1 : 0
  topicStats.totalTimeMs += safeElapsed
  topicStats.difficultySum += safeDifficulty
  userState.byTopic.set(topicId, topicStats)

  const skillStats = userState.bySkill.get(skillId) || {
    skillId,
    topicId,
    attempts: 0,
    correct: 0,
    totalTimeMs: 0,
  }
  skillStats.attempts += 1
  skillStats.correct += Boolean(correct) ? 1 : 0
  skillStats.totalTimeMs += safeElapsed
  userState.bySkill.set(skillId, skillStats)

  userState.updatedAt = nowIso
  pushEvent(userState, {
    type: 'attempt',
    at: nowIso,
    topicId,
    skillId,
    branchId: branchMeta.branchId,
    correct: Boolean(correct),
    assisted: Boolean(assisted),
    difficulty: safeDifficulty,
    elapsedTimeMs: safeElapsed,
    errorType,
    mix: requestedMix,
  })

  return userState
}

const buildLearningCurve = (events = []) => {
  const attemptEvents = events.filter((event) => event.type === 'attempt')
  const windowSize = 5
  const curve = []
  for (let index = 0; index < attemptEvents.length; index += 1) {
    const start = Math.max(0, index - windowSize + 1)
    const window = attemptEvents.slice(start, index + 1)
    const accuracy = window.reduce((acc, event) => acc + (event.correct ? 1 : 0), 0) / window.length
    curve.push({
      step: index + 1,
      movingAccuracy: round(accuracy, 4),
    })
  }
  return curve.slice(-60)
}

export const getUserAnalyticsSummary = (userId) => {
  const state = ensureUserAnalytics(userId)
  if (!state || state.totalAttempts === 0) {
    return {
      userId: normalizeId(userId),
      totals: {
        generated: state?.generatedCount || 0,
        attempts: 0,
        correct: 0,
      },
      dominioGlobal: 0,
      dominioPorRama: [],
      indiceAbstraccion: 0,
      tiempoPromedioPorSkill: [],
      patronErrorConceptual: [],
      curvaAprendizaje: [],
      rates: {
        accuracyRate: 0,
        assistanceRate: 0,
        stabilityRate: 0,
        averageDifficulty: 1,
        contextualizedRate: 0,
        advancedModelingRate: 0,
      },
      streaks: {
        current: state?.currentStreak || 0,
        longest: state?.longestStreak || 0,
      },
    }
  }

  const accuracyRate = state.correctAttempts / state.totalAttempts
  const assistanceRate = state.assistedAttempts / state.totalAttempts
  const averageDifficulty = state.weightedDifficultySum / state.totalAttempts
  const contextualizedRate = state.contextualizedAttempts / state.totalAttempts
  const advancedModelingRate = state.advancedModelingAttempts / state.totalAttempts
  const stabilityRate = clamp(state.longestStreak / Math.max(1, state.totalAttempts), 0, 1)
  const dominioGlobal = round(accuracyRate * 100, 2)
  const indiceAbstraccion = round(
    clamp(averageDifficulty / 9, 0, 1) * 45 +
      clamp(contextualizedRate, 0, 1) * 30 +
      clamp(advancedModelingRate, 0, 1) * 25,
    2,
  )

  const dominioPorRamaMap = new Map()
  for (const topicStats of state.byTopic.values()) {
    const key = topicStats.branchId || 'general'
    const branchStats = dominioPorRamaMap.get(key) || {
      branchId: key,
      branchName: topicStats.branchName || key,
      attempts: 0,
      correct: 0,
      dominio: 0,
    }
    branchStats.attempts += topicStats.attempts
    branchStats.correct += topicStats.correct
    dominioPorRamaMap.set(key, branchStats)
  }
  const dominioPorRama = [...dominioPorRamaMap.values()].map((item) => ({
    ...item,
    dominio: round((item.correct / Math.max(1, item.attempts)) * 100, 2),
  }))

  const tiempoPromedioPorSkill = [...state.bySkill.values()]
    .map((skill) => ({
      skillId: skill.skillId,
      topicId: skill.topicId,
      attempts: skill.attempts,
      averageTimeMs: round(skill.totalTimeMs / Math.max(1, skill.attempts), 2),
      accuracy: round(skill.correct / Math.max(1, skill.attempts), 4),
    }))
    .sort((left, right) => right.averageTimeMs - left.averageTimeMs)
    .slice(0, 30)

  const patronErrorConceptual = [...state.errorsByType.entries()]
    .map(([type, count]) => ({
      type,
      count,
      ratio: round(count / Math.max(1, state.totalAttempts), 4),
    }))
    .sort((left, right) => right.count - left.count)

  return {
    userId: state.userId,
    totals: {
      generated: state.generatedCount,
      attempts: state.totalAttempts,
      correct: state.correctAttempts,
    },
    dominioGlobal,
    dominioPorRama,
    indiceAbstraccion,
    tiempoPromedioPorSkill,
    patronErrorConceptual,
    curvaAprendizaje: buildLearningCurve(state.events),
    rates: {
      accuracyRate: round(accuracyRate, 4),
      assistanceRate: round(assistanceRate, 4),
      stabilityRate: round(stabilityRate, 4),
      averageDifficulty: round(averageDifficulty, 3),
      contextualizedRate: round(contextualizedRate, 4),
      advancedModelingRate: round(advancedModelingRate, 4),
    },
    streaks: {
      current: state.currentStreak,
      longest: state.longestStreak,
    },
    updatedAt: state.updatedAt,
  }
}

export const getAbstractionRanking = (limit = 20) => {
  const safeLimit = Math.max(1, Math.floor(Number(limit) || 20))
  return [...userAnalyticsStore.keys()]
    .map((userId) => {
      const summary = getUserAnalyticsSummary(userId)
      return {
        userId,
        indiceAbstraccion: summary.indiceAbstraccion,
        dominioGlobal: summary.dominioGlobal,
        attempts: summary.totals.attempts,
      }
    })
    .sort((left, right) => right.indiceAbstraccion - left.indiceAbstraccion)
    .slice(0, safeLimit)
}

export const getAdministrativeAnalytics = () => {
  const users = [...userAnalyticsStore.keys()]
  const summaries = users.map((userId) => getUserAnalyticsSummary(userId))
  if (!summaries.length) {
    return {
      users: 0,
      globalDominio: 0,
      globalAbstraction: 0,
      attempts: 0,
      topErrors: [],
      ranking: [],
    }
  }

  const attempts = summaries.reduce((acc, item) => acc + item.totals.attempts, 0)
  const globalDominio = summaries.reduce((acc, item) => acc + item.dominioGlobal, 0) / summaries.length
  const globalAbstraction = summaries.reduce((acc, item) => acc + item.indiceAbstraccion, 0) / summaries.length

  const errorMap = new Map()
  for (const summary of summaries) {
    for (const item of summary.patronErrorConceptual || []) {
      errorMap.set(item.type, (errorMap.get(item.type) || 0) + item.count)
    }
  }

  const topErrors = [...errorMap.entries()]
    .map(([type, count]) => ({ type, count }))
    .sort((left, right) => right.count - left.count)
    .slice(0, 8)

  return {
    users: summaries.length,
    globalDominio: round(globalDominio, 2),
    globalAbstraction: round(globalAbstraction, 2),
    attempts,
    topErrors,
    ranking: getAbstractionRanking(20),
  }
}

export const resetAnalyticsForUser = (userId) => {
  const key = normalizeId(userId)
  if (!key) return
  userAnalyticsStore.delete(key)
}
