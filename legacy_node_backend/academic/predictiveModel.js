const clamp = (value, min, max) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return min
  return Math.max(min, Math.min(max, parsed))
}

const logistic = (z) => 1 / (1 + Math.exp(-z))

const toPercent = (value) => Number((clamp(value, 0, 1) * 100).toFixed(2))

export const estimatePredictiveOutcomes = ({
  accuracyRate = 0,
  assistanceRate = 0,
  retentionIndex = 0,
  stabilityRate = 0,
  abstractionIndex = 0,
  averageDifficulty = 1,
}) => {
  const safeAccuracy = clamp(accuracyRate, 0, 1)
  const safeAssistance = clamp(assistanceRate, 0, 1)
  const safeRetention = clamp(retentionIndex, 0, 1)
  const safeStability = clamp(stabilityRate, 0, 1)
  const safeAbstraction = clamp(abstractionIndex / 100, 0, 1)
  const safeDifficulty = clamp(averageDifficulty, 1, 9)
  const errorRate = 1 - safeAccuracy

  const evalZ =
    -1.35 +
    3.25 * safeAccuracy +
    1.4 * safeRetention +
    1.15 * safeStability +
    0.75 * safeAbstraction +
    0.14 * (safeDifficulty - 4) -
    1.2 * safeAssistance
  const masteryZ =
    -1.1 +
    2.8 * safeAccuracy +
    1.8 * safeRetention +
    0.65 * safeStability +
    0.75 * safeAbstraction -
    0.95 * errorRate -
    0.7 * safeAssistance

  const evaluationSuccessProbability = logistic(evalZ)
  const fullMasteryProbability = logistic(masteryZ)
  const projectedMathLevelRaw = 1 + 7.5 * safeAccuracy + 2.6 * safeRetention + 1.8 * safeStability + safeDifficulty / 2
  const projectedMathLevel = clamp(projectedMathLevelRaw, 1, 12)

  return {
    evaluationSuccessProbability,
    fullMasteryProbability,
    projectedMathLevel,
    percentages: {
      evaluationSuccess: toPercent(evaluationSuccessProbability),
      fullMastery: toPercent(fullMasteryProbability),
    },
  }
}
