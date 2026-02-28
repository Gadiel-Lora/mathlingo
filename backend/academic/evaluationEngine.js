import { randomUUID } from 'node:crypto'

import { getGradeCurriculum } from '../../curriculum/index.js'
import { generateQuestion } from './questionEngine.js'

const clampDifficulty = (value, fallback = 3) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.max(1, Math.min(10, Math.floor(parsed)))
}

const clampPositiveInt = (value, fallback = 10) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return Math.max(1, Math.floor(parsed))
}

const shuffle = (items) => {
  const next = [...items]
  for (let index = next.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1))
    ;[next[index], next[randomIndex]] = [next[randomIndex], next[index]]
  }
  return next
}

const normalizeMix = (value) => {
  const key = String(value ?? '').trim().toLowerCase()
  if (['mixed', 'mechanical', 'contextualized', 'advanced-modeling'].includes(key)) return key
  if (['advanced_modeling', 'advanced modeling', 'modelacion-avanzada', 'modelacion-compleja'].includes(key)) {
    return 'advanced-modeling'
  }
  return 'mixed'
}

const normalizeQuestionType = (value) => {
  const key = String(value ?? '').trim().toLowerCase()
  if (['multiple-choice', 'input'].includes(key)) return key
  return 'input'
}

const MODE_PRESETS = {
  micro: {
    questionRange: [5, 10],
    defaultQuestionCount: 8,
    difficultyRange: [2, 6],
    mixDistribution: [
      { mix: 'contextualized', ratio: 0.55 },
      { mix: 'mechanical', ratio: 0.45 },
    ],
    typeDistribution: [
      { type: 'multiple-choice', ratio: 0.5 },
      { type: 'input', ratio: 0.5 },
    ],
    aiHelpAllowed: true,
  },
  standard: {
    questionRange: [20, 30],
    defaultQuestionCount: 24,
    difficultyRange: [3, 7],
    mixDistribution: [
      { mix: 'contextualized', ratio: 0.45 },
      { mix: 'mechanical', ratio: 0.4 },
      { mix: 'advanced-modeling', ratio: 0.15 },
    ],
    typeDistribution: [
      { type: 'multiple-choice', ratio: 0.35 },
      { type: 'input', ratio: 0.65 },
    ],
    aiHelpAllowed: true,
  },
  mock: {
    questionRange: [40, 80],
    defaultQuestionCount: 50,
    difficultyRange: [4, 9],
    mixDistribution: [
      { mix: 'contextualized', ratio: 0.45 },
      { mix: 'mechanical', ratio: 0.35 },
      { mix: 'advanced-modeling', ratio: 0.2 },
    ],
    typeDistribution: [
      { type: 'multiple-choice', ratio: 0.3 },
      { type: 'input', ratio: 0.7 },
    ],
    aiHelpAllowed: false,
  },
  diagnostic: {
    questionRange: [12, 20],
    defaultQuestionCount: 15,
    difficultyRange: [1, 8],
    mixDistribution: [
      { mix: 'contextualized', ratio: 0.4 },
      { mix: 'mechanical', ratio: 0.6 },
    ],
    typeDistribution: [
      { type: 'multiple-choice', ratio: 0.6 },
      { type: 'input', ratio: 0.4 },
    ],
    aiHelpAllowed: false,
  },
}

const resolveMode = (value) => {
  const normalized = String(value ?? '').trim().toLowerCase()
  if (MODE_PRESETS[normalized]) return normalized
  return 'standard'
}

const toCountSequence = (entries, targetCount, fallbackValue) => {
  const safeTarget = clampPositiveInt(targetCount, 1)
  if (!Array.isArray(entries) || entries.length === 0) {
    return Array.from({ length: safeTarget }, () => fallbackValue)
  }

  const hasCounts = entries.some((entry) => Number(entry?.count) > 0)
  const normalized = entries.map((entry) => ({
    value: entry.value,
    count: Number(entry?.count),
    ratio: Number(entry?.ratio),
  }))

  const resolved = normalized.map((entry) => ({ value: entry.value, count: 0, remainder: 0 }))

  if (hasCounts) {
    const total = normalized.reduce((acc, entry) => acc + Math.max(0, Number(entry.count) || 0), 0)
    if (total <= 0) return Array.from({ length: safeTarget }, () => fallbackValue)
    for (let index = 0; index < normalized.length; index += 1) {
      const scaled = ((Math.max(0, Number(normalized[index].count) || 0) / total) * safeTarget) || 0
      resolved[index].count = Math.floor(scaled)
      resolved[index].remainder = scaled - Math.floor(scaled)
    }
  } else {
    const total = normalized.reduce((acc, entry) => acc + Math.max(0, Number(entry.ratio) || 0), 0)
    if (total <= 0) return Array.from({ length: safeTarget }, () => fallbackValue)
    for (let index = 0; index < normalized.length; index += 1) {
      const scaled = ((Math.max(0, Number(normalized[index].ratio) || 0) / total) * safeTarget) || 0
      resolved[index].count = Math.floor(scaled)
      resolved[index].remainder = scaled - Math.floor(scaled)
    }
  }

  let assigned = resolved.reduce((acc, entry) => acc + entry.count, 0)
  while (assigned < safeTarget) {
    resolved.sort((left, right) => right.remainder - left.remainder)
    resolved[0].count += 1
    resolved[0].remainder = 0
    assigned += 1
  }

  const sequence = resolved.flatMap((entry) => Array.from({ length: entry.count }, () => entry.value))
  while (sequence.length < safeTarget) sequence.push(fallbackValue)
  return shuffle(sequence.slice(0, safeTarget))
}

const pickDifficultyInRange = (min, max) => {
  const low = Math.min(min, max)
  const high = Math.max(min, max)
  return Math.floor(Math.random() * (high - low + 1)) + low
}

const pickDifficultyForType = ({ targetType, baseRange }) => {
  const min = clampDifficulty(baseRange?.[0], 3)
  const max = clampDifficulty(baseRange?.[1], 6)
  if (normalizeQuestionType(targetType) === 'multiple-choice') {
    const low = Math.min(min, 3)
    const high = Math.min(3, max)
    if (high < 1) return 1
    return pickDifficultyInRange(Math.max(1, low), Math.max(1, high))
  }

  const low = Math.max(4, min)
  const high = Math.max(low, max)
  return pickDifficultyInRange(low, high)
}

const collectTopicPool = (gradeData, selectedTopicIds = []) => {
  const selected = new Set((selectedTopicIds || []).map((item) => String(item || '').trim()).filter(Boolean))
  const pool = []

  for (const area of gradeData?.areas || []) {
    for (const topic of area?.topics || []) {
      if (selected.size > 0 && !selected.has(topic.id)) continue
      const difficultyRange = Array.isArray(topic?.difficultyRange) && topic.difficultyRange.length >= 2 ? topic.difficultyRange : [3, 6]
      pool.push({
        topicId: topic.id,
        areaId: area.id,
        areaName: area.name || area.id,
        difficultyRange: [clampDifficulty(difficultyRange[0], 3), clampDifficulty(difficultyRange[1], 6)],
      })
    }
  }

  return pool
}

export const generateAdaptiveEvaluation = ({
  grade,
  mode = 'standard',
  blueprint = {},
} = {}) => {
  const gradeData = getGradeCurriculum(grade)
  if (!gradeData) {
    throw new Error(`No existe curriculum para el grado ${grade}.`)
  }

  const normalizedMode = resolveMode(mode)
  const preset = MODE_PRESETS[normalizedMode]
  const requestedCount = clampPositiveInt(blueprint?.questionCount, preset.defaultQuestionCount)
  const boundedCount = Math.max(
    preset.questionRange[0],
    Math.min(preset.questionRange[1], requestedCount),
  )
  const globalDifficultyRange = Array.isArray(blueprint?.difficultyRange) && blueprint.difficultyRange.length >= 2
    ? [clampDifficulty(blueprint.difficultyRange[0], preset.difficultyRange[0]), clampDifficulty(blueprint.difficultyRange[1], preset.difficultyRange[1])]
    : [...preset.difficultyRange]
  const topicPool = collectTopicPool(gradeData, blueprint?.topicIds)
  if (!topicPool.length) {
    throw new Error(`No hay temas disponibles para generar evaluacion en ${gradeData.id}.`)
  }

  const mixSequence = toCountSequence(
    (Array.isArray(blueprint?.mixDistribution) ? blueprint.mixDistribution : preset.mixDistribution).map((entry) => ({
      value: normalizeMix(entry?.mix ?? entry?.type),
      count: entry?.count,
      ratio: entry?.ratio,
    })),
    boundedCount,
    'mixed',
  )

  const typeSequence = toCountSequence(
    (Array.isArray(blueprint?.typeDistribution) ? blueprint.typeDistribution : preset.typeDistribution).map((entry) => ({
      value: normalizeQuestionType(entry?.type),
      count: entry?.count,
      ratio: entry?.ratio,
    })),
    boundedCount,
    'input',
  )

  const generatedFingerprints = new Set()
  const questions = []
  const shuffledPool = shuffle(topicPool)

  for (let index = 0; index < boundedCount; index += 1) {
    const topic = shuffledPool[index % shuffledPool.length]
    const requestedType = typeSequence[index]
    const mix = mixSequence[index]
    const mergedRange = [
      Math.max(1, Math.min(topic.difficultyRange[0], globalDifficultyRange[0])),
      Math.min(10, Math.max(topic.difficultyRange[1], globalDifficultyRange[1])),
    ]
    const difficulty = pickDifficultyForType({
      targetType: requestedType,
      baseRange: mergedRange,
    })
    const problemMix = mix === 'mechanical' ? 'mechanical' : mix === 'contextualized' || mix === 'advanced-modeling' ? 'contextualized' : 'mixed'

    let generated = null
    for (let retry = 0; retry < 20; retry += 1) {
      const candidate = generateQuestion({
        grade: gradeData.gradeNumber,
        topic: topic.topicId,
        difficulty,
        lessonContext: {
          lessonId: `evaluation-${normalizedMode}`,
          lessonTitle: `Evaluacion ${normalizedMode}`,
          lessonSkills: ['evaluacion', normalizedMode, mix],
          lessonSubtopics: [mix, requestedType],
          problemMix,
          questionNumber: index + 1,
          totalQuestions: boundedCount,
        },
        excludedFingerprints: generatedFingerprints,
      })
      if (generatedFingerprints.has(candidate.fingerprint)) continue
      generated = {
        ...candidate,
        mixTag: mix,
        requestedType,
      }
      generatedFingerprints.add(candidate.fingerprint)
      break
    }

    if (!generated) {
      throw new Error(`No se pudo generar pregunta unica para topic=${topic.topicId} en modo=${normalizedMode}.`)
    }

    questions.push(generated)
  }

  return {
    id: `eval-${gradeData.id}-${normalizedMode}-${randomUUID()}`,
    gradeId: gradeData.id,
    gradeNumber: gradeData.gradeNumber,
    mode: normalizedMode,
    title: blueprint?.name || `Evaluacion ${normalizedMode} - ${gradeData.name}`,
    questionCount: questions.length,
    questions,
    rules: {
      aiHelpAllowed: blueprint?.aiHelpAllowed == null ? preset.aiHelpAllowed : Boolean(blueprint.aiHelpAllowed),
      passingScore: Number.isFinite(Number(blueprint?.passingScore)) ? Number(blueprint.passingScore) : 0.7,
      targetRange: preset.questionRange,
      difficultyRange: globalDifficultyRange,
    },
    blueprint: {
      topicIds: topicPool.map((item) => item.topicId),
      mixDistribution: mixSequence.reduce((acc, mixLabel) => {
        acc[mixLabel] = (acc[mixLabel] || 0) + 1
        return acc
      }, {}),
      typeDistribution: typeSequence.reduce((acc, typeLabel) => {
        acc[typeLabel] = (acc[typeLabel] || 0) + 1
        return acc
      }, {}),
    },
    generatedAt: new Date().toISOString(),
  }
}
