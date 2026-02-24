import { randomUUID } from 'node:crypto'

import { getFinalExamBlueprint, getGradeCurriculum } from '../../curriculum/index.js'
import { generateQuestion } from './questionEngine.js'

const clampDifficulty = (value) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 3
  return Math.max(1, Math.min(5, Math.floor(parsed)))
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

export const generateFinalExam = (grade, options = {}) => {
  const gradeData = getGradeCurriculum(grade)
  if (!gradeData) {
    throw new Error(`No existe curriculum para el grado ${grade}.`)
  }

  const blueprint = getFinalExamBlueprint(grade)
  if (!blueprint?.distribution?.length) {
    throw new Error(`El grado ${gradeData.id} no tiene blueprint de examen final definido.`)
  }

  const defaultTarget = sumCounts(blueprint.distribution)
  const requestedCount = Number(options.questionCount)
  const targetCount = Number.isFinite(requestedCount) && requestedCount > 0 ? Math.floor(requestedCount) : defaultTarget
  const distribution = scaleDistribution(blueprint.distribution, targetCount)

  const generatedFingerprints = new Set()
  const generatedQuestions = []

  for (const block of distribution) {
    const count = Math.max(0, Number(block.count) || 0)
    const topicId = String(block.topicId || '').trim()
    if (!topicId || count === 0) continue

    for (let index = 0; index < count; index += 1) {
      const difficulty = pickDifficulty(block.difficultyRange || [3, 4])

      let nextQuestion = null
      for (let retries = 0; retries < 20; retries += 1) {
        const candidate = generateQuestion({
          grade: gradeData.gradeNumber,
          topic: topicId,
          difficulty,
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
      })
    }
  }

  return {
    id: `final-${gradeData.id}-${randomUUID()}`,
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
    },
    generatedAt: new Date().toISOString(),
  }
}
