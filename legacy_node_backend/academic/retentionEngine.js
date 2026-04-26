const retentionStore = new Map()

const DAY_MS = 24 * 60 * 60 * 1000

const normalizeId = (value) => String(value ?? '').trim()

const clamp = (value, min, max) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return min
  return Math.max(min, Math.min(max, parsed))
}

const toIso = (value) => {
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString()
}

const toDate = (value, fallback = new Date()) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return fallback
  return date
}

const getDaysBetween = (fromDate, toDate) => {
  const diff = Math.max(0, toDate.getTime() - fromDate.getTime())
  return diff / DAY_MS
}

const getUserRetentionMap = (userId) => {
  const key = normalizeId(userId)
  if (!key) return null
  if (!retentionStore.has(key)) {
    retentionStore.set(key, new Map())
  }
  return retentionStore.get(key)
}

const computeDecayedMastery = ({ mastery, stabilityDays, elapsedDays }) => {
  const safeMastery = clamp(mastery, 0, 1)
  const safeStability = clamp(stabilityDays, 0.5, 120)
  const safeElapsed = Math.max(0, Number(elapsedDays) || 0)
  return safeMastery * Math.exp(-safeElapsed / safeStability)
}

const deriveNextReviewDays = ({ stabilityDays, mastery }) => {
  const safeStability = clamp(stabilityDays, 0.5, 120)
  const safeMastery = clamp(mastery, 0, 1)
  return clamp(safeStability * (0.75 + safeMastery), 0.5, 45)
}

const createInitialState = (skillId, nowIso) => ({
  skillId,
  attempts: 0,
  successes: 0,
  mastery: 0.35,
  stabilityDays: 1.5,
  forgetIndex: 0.65,
  averageTimeMs: 0,
  lastPracticedAt: nowIso,
  nextReviewAt: new Date(Date.parse(nowIso) + DAY_MS).toISOString(),
  updatedAt: nowIso,
})

export const registerSkillObservation = ({
  userId,
  skillId,
  correct,
  difficulty = 1,
  elapsedTimeMs = 0,
  timestamp = new Date().toISOString(),
}) => {
  const userMap = getUserRetentionMap(userId)
  const normalizedSkillId = normalizeId(skillId)
  if (!userMap || !normalizedSkillId) return null

  const now = toDate(timestamp)
  const nowIso = now.toISOString()
  const previous = userMap.get(normalizedSkillId) || createInitialState(normalizedSkillId, nowIso)

  const elapsedDays = getDaysBetween(toDate(previous.lastPracticedAt, now), now)
  const decayedMastery = computeDecayedMastery({
    mastery: previous.mastery,
    stabilityDays: previous.stabilityDays,
    elapsedDays,
  })
  const safeDifficulty = clamp(difficulty, 1, 9)

  let nextMastery = decayedMastery
  let nextStability = previous.stabilityDays
  if (Boolean(correct)) {
    const learnGain = 0.12 + safeDifficulty * 0.015
    nextMastery = decayedMastery + (1 - decayedMastery) * learnGain
    nextStability = clamp(previous.stabilityDays * 1.14 + 0.5, 0.6, 120)
  } else {
    const penalty = 0.55 - Math.min(0.22, safeDifficulty * 0.02)
    nextMastery = clamp(decayedMastery * penalty, 0.04, 1)
    nextStability = clamp(previous.stabilityDays * 0.72, 0.5, 120)
  }

  const attempts = previous.attempts + 1
  const successes = previous.successes + (Boolean(correct) ? 1 : 0)
  const averageTimeMs =
    attempts <= 1
      ? Math.max(0, Number(elapsedTimeMs) || 0)
      : (previous.averageTimeMs * previous.attempts + Math.max(0, Number(elapsedTimeMs) || 0)) / attempts

  const forgetIndex = clamp(1 - nextMastery, 0, 1)
  const nextReviewDays = deriveNextReviewDays({
    stabilityDays: nextStability,
    mastery: nextMastery,
  })
  const nextReviewAt = new Date(now.getTime() + nextReviewDays * DAY_MS).toISOString()

  const nextState = {
    skillId: normalizedSkillId,
    attempts,
    successes,
    mastery: clamp(nextMastery, 0, 1),
    stabilityDays: clamp(nextStability, 0.5, 120),
    forgetIndex,
    averageTimeMs: Math.max(0, Number(averageTimeMs) || 0),
    lastPracticedAt: nowIso,
    nextReviewAt,
    updatedAt: nowIso,
  }

  userMap.set(normalizedSkillId, nextState)
  return nextState
}

export const getUserRetentionProfile = (userId) => {
  const userMap = getUserRetentionMap(userId)
  if (!userMap) return []
  return [...userMap.values()].sort((left, right) => {
    return new Date(left.nextReviewAt).getTime() - new Date(right.nextReviewAt).getTime()
  })
}

export const getDueSkillsForReview = (userId, limit = 10) => {
  const now = Date.now()
  const safeLimit = Math.max(1, Math.floor(Number(limit) || 10))
  return getUserRetentionProfile(userId)
    .filter((skill) => new Date(skill.nextReviewAt).getTime() <= now)
    .sort((left, right) => right.forgetIndex - left.forgetIndex)
    .slice(0, safeLimit)
}

export const getRetentionSummary = (userId) => {
  const profile = getUserRetentionProfile(userId)
  if (!profile.length) {
    return {
      trackedSkills: 0,
      averageMastery: 0,
      averageForgetIndex: 0,
      dueNow: 0,
    }
  }

  const trackedSkills = profile.length
  const averageMastery = profile.reduce((acc, item) => acc + item.mastery, 0) / trackedSkills
  const averageForgetIndex = profile.reduce((acc, item) => acc + item.forgetIndex, 0) / trackedSkills
  const dueNow = profile.filter((item) => new Date(item.nextReviewAt).getTime() <= Date.now()).length

  return {
    trackedSkills,
    averageMastery: Number(averageMastery.toFixed(4)),
    averageForgetIndex: Number(averageForgetIndex.toFixed(4)),
    dueNow,
  }
}

export const resetRetentionForUser = (userId) => {
  const key = normalizeId(userId)
  if (!key) return
  retentionStore.delete(key)
}
