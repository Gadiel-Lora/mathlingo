import { getSkill } from './domainGraph.js'

const DEFAULT_INITIAL_MASTERY = 22

const FREE_PRACTICE_ALIASES = new Set(['review', 'repasos', 'free-practice', 'free_practice', 'practice-only'])

const userSkillStateStore = new Map()

const normalizeId = (value) => String(value ?? '').trim()

const clamp = (value, min, max) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return min
  return Math.max(min, Math.min(max, parsed))
}

const normalizeLearningMode = (value) => {
  const normalized = normalizeId(value).toLowerCase()
  if (!normalized) return 'curriculum'
  if (['autonomo', 'autonomous', 'auto'].includes(normalized)) return 'autonomous'
  if (FREE_PRACTICE_ALIASES.has(normalized)) return 'review'
  if (['curriculum', 'journey', 'recorrido'].includes(normalized)) return 'curriculum'
  return normalized
}

export const isMasteryTrackingMode = (mode) => {
  return normalizeLearningMode(mode) !== 'review'
}

const getUserSkillMap = (userId) => {
  const safeUserId = normalizeId(userId)
  if (!safeUserId) return null
  if (!userSkillStateStore.has(safeUserId)) {
    userSkillStateStore.set(safeUserId, new Map())
  }
  return userSkillStateStore.get(safeUserId)
}

const createInitialState = ({ userId, skillId }) => ({
  userId: normalizeId(userId),
  skillId: normalizeId(skillId),
  mastery_score: DEFAULT_INITIAL_MASTERY,
  confidence: 0.25,
  attempts: 0,
  correct_attempts: 0,
  avg_time_ms: 0,
  last_performance: 0,
  updated_at: new Date().toISOString(),
})

const getOrCreateState = ({ userId, skillId }) => {
  const userMap = getUserSkillMap(userId)
  if (!userMap) return null
  const safeSkillId = normalizeId(skillId)
  if (!safeSkillId) return null
  if (!userMap.has(safeSkillId)) {
    userMap.set(safeSkillId, createInitialState({ userId, skillId: safeSkillId }))
  }
  return userMap.get(safeSkillId)
}

const computeSpeedScore = ({ elapsedTimeMs, difficultyLevel }) => {
  const safeDifficulty = clamp(difficultyLevel, 1, 10)
  const expectedMs = 95000 + safeDifficulty * 14000
  const elapsed = Math.max(0, Number(elapsedTimeMs) || 0)
  if (elapsed <= 0) return 0.55
  const ratio = elapsed / expectedMs
  return clamp(1.15 - ratio, 0, 1)
}

const resolveErrorScore = ({ isCorrect, errorType }) => {
  if (Boolean(isCorrect)) return 1

  const normalizedError = normalizeId(errorType).toLowerCase()
  if (!normalizedError) return 0.42
  if (normalizedError.includes('aritmetico')) return 0.45
  if (normalizedError.includes('algebraico')) return 0.33
  if (normalizedError.includes('interpretacion')) return 0.3
  if (normalizedError.includes('conceptual')) return 0.22
  return 0.38
}

export const computePerformanceScore = ({
  isCorrect,
  elapsedTimeMs = 0,
  difficultyLevel = 1,
  errorType = '',
  assisted = false,
}) => {
  const correctness = Boolean(isCorrect) ? 1 : 0
  const speed = computeSpeedScore({
    elapsedTimeMs,
    difficultyLevel,
  })
  const errorQuality = resolveErrorScore({
    isCorrect,
    errorType,
  })
  const assistanceMultiplier = Boolean(assisted) ? 0.72 : 1
  const weightedScore = (0.7 * correctness + 0.2 * speed + 0.1 * errorQuality) * assistanceMultiplier
  const clipped = clamp(weightedScore, 0, 1)
  if (!isCorrect) return Math.min(clipped, 0.49)
  return clipped
}

const cloneState = (state) => ({
  ...state,
})

export const getUserSkillState = (userId, skillId) => {
  const userMap = getUserSkillMap(userId)
  if (!userMap) return null
  const state = userMap.get(normalizeId(skillId))
  return state ? cloneState(state) : null
}

export const getUserSkillStates = (userId) => {
  const userMap = getUserSkillMap(userId)
  if (!userMap) return []
  return [...userMap.values()].map((state) => cloneState(state))
}

export const getUserMasteryMap = (userId) => {
  const mastery = {}
  for (const state of getUserSkillStates(userId)) {
    mastery[state.skillId] = clamp(Number(state.mastery_score || 0), 0, 100)
  }
  return mastery
}

export const applyCompletedSkillsSnapshot = (userId, completedSkills = [], masteryValue = 100) => {
  const userMap = getUserSkillMap(userId)
  if (!userMap) return 0
  const safeMastery = clamp(masteryValue, 0, 100)
  let applied = 0
  for (const skillId of completedSkills || []) {
    const normalizedSkillId = normalizeId(skillId)
    if (!normalizedSkillId) continue
    const state = getOrCreateState({
      userId,
      skillId: normalizedSkillId,
    })
    if (!state) continue
    if (safeMastery <= Number(state.mastery_score || 0)) continue
    state.mastery_score = safeMastery
    state.confidence = Math.max(Number(state.confidence || 0), 0.7)
    state.updated_at = new Date().toISOString()
    applied += 1
  }
  return applied
}

export const updateMastery = (userId, skillId, attemptData = {}) => {
  const safeUserId = normalizeId(userId)
  const safeSkillId = normalizeId(skillId)
  if (!safeUserId || !safeSkillId) {
    return {
      updated: false,
      reason: 'missing-user-or-skill',
      state: null,
    }
  }

  const mode = normalizeLearningMode(attemptData?.mode)
  const current = getOrCreateState({
    userId: safeUserId,
    skillId: safeSkillId,
  })

  if (!current) {
    return {
      updated: false,
      reason: 'state-unavailable',
      state: null,
    }
  }

  if (!isMasteryTrackingMode(mode)) {
    return {
      updated: false,
      reason: 'mode-review-disabled',
      mode,
      state: cloneState(current),
    }
  }

  const knownSkill = getSkill(safeSkillId)
  const difficultyLevel = clamp(
    Number(attemptData?.difficultyLevel || knownSkill?.difficulty_level || 1),
    1,
    10,
  )
  const isCorrect = Boolean(attemptData?.isCorrect)
  const assisted = Boolean(attemptData?.assisted)
  const elapsedTimeMs = Math.max(0, Number(attemptData?.elapsedTimeMs || 0))
  const errorType = normalizeId(attemptData?.errorType)
  const performance = computePerformanceScore({
    isCorrect,
    elapsedTimeMs,
    difficultyLevel,
    errorType,
    assisted,
  })

  const previousMastery = clamp(current.mastery_score, 0, 100)
  const learnRate = clamp(0.1 + difficultyLevel * 0.011 + (isCorrect ? 0.025 : 0), 0.08, 0.24)
  const decayRate = clamp(0.055 + difficultyLevel * 0.009, 0.05, 0.17)
  const performanceTarget = performance * 100

  let nextMastery = previousMastery
  if (isCorrect) {
    nextMastery = previousMastery + (100 - previousMastery) * learnRate * performance
  } else {
    const blended = previousMastery * (1 - decayRate) + performanceTarget * decayRate
    nextMastery = Math.min(previousMastery, blended)
  }

  nextMastery = clamp(nextMastery, 0, 100)

  const nextAttempts = Number(current.attempts || 0) + 1
  const nextCorrectAttempts = Number(current.correct_attempts || 0) + (isCorrect ? 1 : 0)
  const nextAvgTime =
    nextAttempts <= 1
      ? elapsedTimeMs
      : (Number(current.avg_time_ms || 0) * Number(current.attempts || 0) + elapsedTimeMs) / nextAttempts
  const nextConfidence = clamp(
    (Number(current.confidence || 0) * Number(current.attempts || 0) + performance) / nextAttempts,
    0,
    1,
  )

  current.mastery_score = Number(nextMastery.toFixed(4))
  current.confidence = Number(nextConfidence.toFixed(4))
  current.attempts = nextAttempts
  current.correct_attempts = nextCorrectAttempts
  current.avg_time_ms = Number(nextAvgTime.toFixed(2))
  current.last_performance = Number(performance.toFixed(4))
  current.updated_at = new Date().toISOString()

  const threshold = Number(knownSkill?.mastery_threshold || 70)

  return {
    updated: true,
    mode,
    performanceScore: Number(performance.toFixed(4)),
    previousMastery: Number(previousMastery.toFixed(4)),
    mastery: Number(current.mastery_score.toFixed(4)),
    delta: Number((current.mastery_score - previousMastery).toFixed(4)),
    isMastered: current.mastery_score >= threshold,
    masteryThreshold: threshold,
    state: cloneState(current),
  }
}

export const resetMasteryForUser = (userId) => {
  const safeUserId = normalizeId(userId)
  if (!safeUserId) return
  userSkillStateStore.delete(safeUserId)
}
