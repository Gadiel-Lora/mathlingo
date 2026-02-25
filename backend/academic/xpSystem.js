const clampDifficulty = (value) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 1
  return Math.max(1, Math.min(9, Math.floor(parsed)))
}

const clampRange = (value, min, max) => {
  if (!Number.isFinite(Number(value))) return min
  return Math.max(min, Math.min(max, Number(value)))
}

export const calculateXP = ({ difficulty, attempts, assisted }) => {
  if (Boolean(assisted)) return 0
  if (Number(attempts) > 2) return 0

  const safeDifficulty = clampDifficulty(difficulty)
  const safeAttempts = Number.isFinite(Number(attempts)) ? Math.max(1, Math.floor(Number(attempts))) : 1
  const baseXp = 10 + safeDifficulty * 6
  const firstTryBonus = safeAttempts === 1 ? 6 : 0
  return baseXp + firstTryBonus
}

export const updateUserLevel = ({
  currentDifficulty = 1,
  accuracyRate = 0,
  averageTimeMs = 0,
  streak = 0,
}) => {
  const safeDifficulty = clampDifficulty(currentDifficulty)
  const safeAccuracy = clampRange(accuracyRate, 0, 1)
  const safeAverageTimeMs = Math.max(0, Number(averageTimeMs) || 0)
  const safeStreak = Math.max(0, Math.floor(Number(streak) || 0))

  let score = 0

  if (safeAccuracy >= 0.85) score += 2
  else if (safeAccuracy >= 0.7) score += 1
  else if (safeAccuracy < 0.5) score -= 2
  else if (safeAccuracy < 0.6) score -= 1

  if (safeAverageTimeMs > 0 && safeAverageTimeMs <= 45000) score += 1
  else if (safeAverageTimeMs >= 120000) score -= 1

  if (safeStreak >= 5) score += 1
  else if (safeStreak === 0) score -= 1

  let nextDifficulty = safeDifficulty
  if (score >= 2) nextDifficulty += 1
  if (score <= -2) nextDifficulty -= 1

  nextDifficulty = clampDifficulty(nextDifficulty)

  return {
    currentDifficulty: safeDifficulty,
    nextDifficulty,
    questionType: nextDifficulty >= 4 ? 'input' : 'multiple-choice',
    shouldPromote: nextDifficulty > safeDifficulty,
    shouldDemote: nextDifficulty < safeDifficulty,
    metrics: {
      accuracyRate: safeAccuracy,
      averageTimeMs: safeAverageTimeMs,
      streak: safeStreak,
      score,
    },
  }
}
