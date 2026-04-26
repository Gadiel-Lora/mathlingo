import { randomUUID } from 'node:crypto'

import { getFinalExamBlueprint, getGradeCurriculum } from '../../curriculum/index.js'
import { generateQuestion } from './questionEngine.js'

const clampDifficulty = (value) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 3
  return Math.max(1, Math.min(10, Math.floor(parsed)))
}

const shuffle = (items) => {
  const next = [...items]
  for (let index = next.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1))
    ;[next[index], next[randomIndex]] = [next[randomIndex], next[index]]
  }
  return next
}

const sumCounts = (distribution = []) => {
  return distribution.reduce((total, item) => total + Math.max(0, Number(item.count) || 0), 0)
}

const scaleDistribution = (distribution, targetCount) => {
  if (!Array.isArray(distribution) || distribution.length === 0) return []
  if (!Number.isFinite(targetCount) || targetCount <= 0) return distribution

  const baseTotal = sumCounts(distribution)
  if (baseTotal === 0) return distribution
  if (baseTotal === targetCount) return distribution

  const raw = distribution.map((entry) => {
    const scaled = (Math.max(0, Number(entry.count) || 0) / baseTotal) * targetCount
    return {
      ...entry,
      count: Math.floor(scaled),
      remainder: scaled - Math.floor(scaled),
    }
  })

  let currentTotal = raw.reduce((total, item) => total + item.count, 0)
  while (currentTotal < targetCount) {
    raw.sort((a, b) => b.remainder - a.remainder)
    raw[0].count += 1
    raw[0].remainder = 0
    currentTotal += 1
  }

  return raw.map(({ remainder, ...entry }) => entry)
}

const pickDifficulty = (range) => {
  if (!Array.isArray(range) || range.length < 2) return 3
  const min = clampDifficulty(range[0])
  const max = clampDifficulty(range[1])
  const low = Math.min(min, max)
  const high = Math.max(min, max)
  return Math.floor(Math.random() * (high - low + 1)) + low
}

const normalizeMixLabel = (value) => {
  const key = String(value ?? '').trim().toLowerCase()
  if (['contextualized', 'mechanical', 'advanced-modeling', 'mixed'].includes(key)) return key
  if (
    [
      'advanced_modeling',
      'advanced modeling',
      'modelacion-avanzada',
      'modelacion avanzada',
      'modelacion-compleja',
      'modelacion compleja',
    ].includes(key)
  ) {
    return 'advanced-modeling'
  }
  return 'mixed'
}

const normalizeExamMode = (value) => {
  const key = String(value ?? '')
    .trim()
    .toLowerCase()
  if (['standard', 'elite', 'extreme'].includes(key)) return key
  if (['estandar', 'normal'].includes(key)) return 'standard'
  return 'standard'
}

const buildMixSequence = (targetCount, mixDistribution = []) => {
  const safeTarget = Math.max(0, Math.floor(Number(targetCount) || 0))
  if (safeTarget === 0) return []
  if (!Array.isArray(mixDistribution) || mixDistribution.length === 0) {
    return Array.from({ length: safeTarget }, () => 'mixed')
  }

  const entries = mixDistribution.map((entry) => ({
    mix: normalizeMixLabel(entry?.mix ?? entry?.type),
    count: Number(entry?.count),
    ratio: Number(entry?.ratio),
  }))

  const hasExplicitCounts = entries.some((entry) => Number.isFinite(entry.count) && entry.count > 0)
  const resolvedCounts = entries.map((entry) => ({
    mix: entry.mix,
    count: 0,
    remainder: 0,
  }))

  if (hasExplicitCounts) {
    const totalCounts = entries.reduce((total, entry) => {
      const count = Number.isFinite(entry.count) && entry.count > 0 ? entry.count : 0
      return total + count
    }, 0)

    if (totalCounts <= 0) {
      return Array.from({ length: safeTarget }, () => 'mixed')
    }

    for (let index = 0; index < entries.length; index += 1) {
      const count = Number.isFinite(entries[index].count) && entries[index].count > 0 ? entries[index].count : 0
      const scaled = (count / totalCounts) * safeTarget
      resolvedCounts[index].count = Math.floor(scaled)
      resolvedCounts[index].remainder = scaled - Math.floor(scaled)
    }
  } else {
    const ratioSum = entries.reduce((total, entry) => {
      const ratio = Number.isFinite(entry.ratio) && entry.ratio > 0 ? entry.ratio : 0
      return total + ratio
    }, 0)

    if (ratioSum <= 0) {
      return Array.from({ length: safeTarget }, () => 'mixed')
    }

    for (let index = 0; index < entries.length; index += 1) {
      const ratio = Number.isFinite(entries[index].ratio) && entries[index].ratio > 0 ? entries[index].ratio : 0
      const scaled = (ratio / ratioSum) * safeTarget
      resolvedCounts[index].count = Math.floor(scaled)
      resolvedCounts[index].remainder = scaled - Math.floor(scaled)
    }
  }

  let currentTotal = resolvedCounts.reduce((total, entry) => total + entry.count, 0)
  while (currentTotal < safeTarget) {
    resolvedCounts.sort((left, right) => right.remainder - left.remainder)
    resolvedCounts[0].count += 1
    resolvedCounts[0].remainder = 0
    currentTotal += 1
  }

  let sequence = resolvedCounts.flatMap((entry) => Array.from({ length: entry.count }, () => entry.mix))
  if (sequence.length > safeTarget) {
    sequence = sequence.slice(0, safeTarget)
  }
  if (sequence.length < safeTarget) {
    sequence = sequence.concat(Array.from({ length: safeTarget - sequence.length }, () => 'mixed'))
  }

  return shuffle(sequence)
}

export const generateFinalExam = (grade, options = {}) => {
  const gradeData = getGradeCurriculum(grade)
  if (!gradeData) {
    throw new Error(`No existe curriculum para el grado ${grade}.`)
  }

  const blueprint = getFinalExamBlueprint(grade)
  const examMode = normalizeExamMode(options.examMode)
  const modeConfig = blueprint?.examModes?.[examMode] || null
  const baseDistribution =
    Array.isArray(modeConfig?.distribution) && modeConfig.distribution.length > 0 ? modeConfig.distribution : blueprint?.distribution

  if (!Array.isArray(baseDistribution) || baseDistribution.length === 0) {
    throw new Error(`El grado ${gradeData.id} no tiene blueprint de examen final definido.`)
  }

  const defaultTargetByMode = Number(modeConfig?.questionCount)
  const defaultTarget =
    Number.isFinite(defaultTargetByMode) && defaultTargetByMode > 0 ? Math.floor(defaultTargetByMode) : sumCounts(baseDistribution)
  const requestedCount = Number(options.questionCount)
  const targetCount = Number.isFinite(requestedCount) && requestedCount > 0 ? Math.floor(requestedCount) : defaultTarget
  const distribution = scaleDistribution(baseDistribution, targetCount)
  const modeMixDistribution =
    Array.isArray(modeConfig?.mixDistribution) && modeConfig.mixDistribution.length > 0
      ? modeConfig.mixDistribution
      : blueprint.mixDistribution
  const hasMixDistribution = Array.isArray(modeMixDistribution) && modeMixDistribution.length > 0
  const mixSequence = buildMixSequence(targetCount, modeMixDistribution)
  const minDifficultyByMode = Number(modeConfig?.minDifficulty)
  const minDifficulty = Number.isFinite(minDifficultyByMode) ? clampDifficulty(minDifficultyByMode) : 1
  const difficultyBoostByMode = Number(modeConfig?.difficultyBoost)
  const difficultyBoost = Number.isFinite(difficultyBoostByMode) ? Math.floor(difficultyBoostByMode) : 0

  const generatedFingerprints = new Set()
  const generatedQuestions = []
  let generatedCount = 0

  for (const block of distribution) {
    const count = Math.max(0, Number(block.count) || 0)
    const topicId = String(block.topicId || '').trim()
    if (!topicId || count === 0) continue

    for (let index = 0; index < count; index += 1) {
      const requestedMix = normalizeMixLabel(mixSequence[generatedCount] || 'mixed')
      const baseDifficulty = pickDifficulty(block.difficultyRange || [3, 4])
      const boostedDifficulty = clampDifficulty(baseDifficulty + difficultyBoost)
      const mixDifficulty = requestedMix === 'advanced-modeling' ? Math.max(7, boostedDifficulty) : boostedDifficulty
      const difficulty = clampDifficulty(Math.max(mixDifficulty, minDifficulty))
      const problemMix =
        requestedMix === 'mechanical'
          ? 'mechanical'
          : requestedMix === 'contextualized' || requestedMix === 'advanced-modeling'
            ? 'contextualized'
            : 'mixed'

      let nextQuestion = null
      for (let retries = 0; retries < 20; retries += 1) {
        const candidate = generateQuestion({
          grade: gradeData.gradeNumber,
          topic: topicId,
          difficulty,
          lessonContext: {
            lessonId: 'final-exam',
            lessonTitle: blueprint.name || `Examen Final ${gradeData.name}`,
            lessonSkills: ['evaluacion-final', 'razonamiento', requestedMix, ...(hasMixDistribution ? ['mix-control'] : [])],
            lessonSubtopics: requestedMix === 'advanced-modeling' ? ['modelacion avanzada'] : [requestedMix],
            problemMix,
            questionNumber: generatedCount + 1,
            totalQuestions: targetCount,
          },
          excludedFingerprints: generatedFingerprints,
        })
        if (generatedFingerprints.has(candidate.fingerprint)) continue
        nextQuestion = candidate
        generatedFingerprints.add(candidate.fingerprint)
        break
      }

      if (!nextQuestion) {
        throw new Error(`No se pudo generar pregunta unica para topic=${topicId}.`)
      }

      generatedQuestions.push({
        ...nextQuestion,
        examMode: true,
        allowTutorHelp: false,
        mixTag: requestedMix,
      })
      generatedCount += 1
    }
  }

  return {
    id: `final-${gradeData.id}-${examMode}-${randomUUID()}`,
    gradeId: gradeData.id,
    gradeNumber: gradeData.gradeNumber,
    title: blueprint.name || `Examen Final ${gradeData.name}`,
    questions: generatedQuestions,
    questionCount: generatedQuestions.length,
    rules: {
      aiHelpAllowed: false,
      xpMultiplier: Number(blueprint.xpMultiplier || 2),
      passingScore: Number(blueprint.passingScore || 0.7),
      targetRange: blueprint.questionRange || [generatedQuestions.length, generatedQuestions.length],
      examMode,
    },
    generatedAt: new Date().toISOString(),
  }
}
