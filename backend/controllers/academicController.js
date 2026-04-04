import { Router } from 'express'

import { CURRICULUM_BRANCHES, CURRICULUM_GRADES, getCurriculumBranch, getGradeCurriculum } from '../../curriculum/index.js'
import { findRealProblemForTopic } from '../academic/problemService.js'
import {
  getBlockedFingerprints,
  getPublicQuestionState,
  getQuestionState,
  getStoredQuestion,
  registerChatInteraction,
  registerGeneratedQuestion,
  registerHelpRequest,
  resetQuestionState,
  submitAttempt,
} from '../academic/attemptManager.js'
import {
  getAbstractionRanking,
  getAdministrativeAnalytics,
  getUserAnalyticsSummary,
  registerAttemptAnalyticsEvent,
  registerQuestionGeneratedEvent,
} from '../academic/analyticsStore.js'
import { getLessonSkills, isLessonCompleted, isUnitCompleted } from '../academic/curriculumSkillMap.js'
import { getDomainGraph, getDomainSkills, getPrerequisites, getDependents, getSkill, getRecommendedSkills, getUnlockFrontier } from '../academic/domainGraph.js'
import { classifyConceptualError } from '../academic/errorClassifier.js'
import { generateAdaptiveEvaluation } from '../academic/evaluationEngine.js'
import { generateFinalExam } from '../academic/finalExamGenerator.js'
import { applyCompletedSkillsSnapshot, getUserMasteryMap, getUserSkillStates, isMasteryTrackingMode, updateMastery } from '../academic/masteryEngine.js'
import { estimatePredictiveOutcomes } from '../academic/predictiveModel.js'
import { QUESTION_STATE_FLOW } from '../academic/questionStateFlow.js'
import { generateQuestion, isAnswerCorrect, toPublicQuestion } from '../academic/questionEngine.js'
import { getDueSkillsForReview, getRetentionSummary, getUserRetentionProfile, registerSkillObservation } from '../academic/retentionEngine.js'
import { CHAT_INTENTS, classifyTutorIntent, requestTutorChat, requestTutorHelp } from '../academic/tutorAI.js'
import { getNextSkills, getUnlockedSkills } from '../academic/unlockEngine.js'
import { calculateXP, updateUserLevel } from '../academic/xpSystem.js'

const MAX_ATTEMPTS = 3
const router = Router()

const sanitizeInput = (value) => String(value ?? '').trim()

const parseGrade = (value) => {
  const asString = sanitizeInput(value)
  if (!asString) return null
  if (/^grade-\d+$/.test(asString)) return asString
  const numeric = Number(asString)
  if (Number.isFinite(numeric)) return Math.floor(numeric)
  return asString
}

const parseGradeNumber = (grade) => {
  const asNumber = Number(grade)
  if (Number.isFinite(asNumber)) return Math.floor(asNumber)
  const match = String(grade ?? '').match(/\d+/)
  if (!match) return null
  const parsed = Number(match[0])
  return Number.isFinite(parsed) ? Math.floor(parsed) : null
}

const toGradeId = (grade, fallback = '') => {
  const clean = sanitizeInput(grade)
  if (/^grade-\d+$/.test(clean)) return clean
  const numeric = parseGradeNumber(grade)
  if (numeric) return `grade-${numeric}`
  return sanitizeInput(fallback)
}

const parseBoolean = (value, fallback = false) => {
  if (typeof value === 'boolean') return value
  const normalized = sanitizeInput(value).toLowerCase()
  if (['1', 'true', 'yes', 'si'].includes(normalized)) return true
  if (['0', 'false', 'no'].includes(normalized)) return false
  return fallback
}

const parseCompletedSkills = (value) => {
  if (!Array.isArray(value)) return []
  return value.map((item) => sanitizeInput(item)).filter(Boolean)
}

const parseMix = (value) => {
  const normalized = sanitizeInput(value).toLowerCase()
  if (['mixed', 'mechanical', 'contextualized', 'advanced-modeling'].includes(normalized)) return normalized
  if (['advanced_modeling', 'advanced modeling', 'modelacion-avanzada', 'modelacion-compleja'].includes(normalized)) {
    return 'advanced-modeling'
  }
  return 'mixed'
}

const LEARNING_MODES = Object.freeze({
  CURRICULUM: 'curriculum',
  AUTONOMOUS: 'autonomous',
  REVIEW: 'review',
})

const parseLearningMode = (value, fallback = LEARNING_MODES.CURRICULUM) => {
  const normalized = sanitizeInput(value).toLowerCase()
  if (!normalized) return fallback
  if (['autonomous', 'autonomo', 'auto'].includes(normalized)) return LEARNING_MODES.AUTONOMOUS
  if (['review', 'repasos', 'free-practice', 'free_practice', 'practice-only'].includes(normalized)) {
    return LEARNING_MODES.REVIEW
  }
  if (['curriculum', 'journey', 'recorrido'].includes(normalized)) return LEARNING_MODES.CURRICULUM
  return fallback
}

const parseOptionalLimit = (value, fallback = 8, max = 50) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return Math.max(1, Math.floor(fallback))
  return Math.max(1, Math.min(Math.floor(parsed), max))
}

const parseOptionalCount = (value) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return null
  return Math.max(0, Math.floor(parsed))
}

const parseTutorLevel = (value) => {
  const normalized = sanitizeInput(value).toLowerCase()
  if (['basic', 'intermediate', 'advanced'].includes(normalized)) return normalized
  return ''
}

const parseChatHistory = (value) => {
  if (!Array.isArray(value)) return []
  return value
    .slice(-12)
    .map((item) => {
      const roleRaw = sanitizeInput(item?.role).toLowerCase()
      const role = roleRaw === 'assistant' ? 'assistant' : 'student'
      const content = sanitizeInput(item?.content)
      return { role, content }
    })
    .filter((entry) => entry.content)
}

const deriveQuestionTypeFromDifficulty = (difficulty) => (Number(difficulty) >= 4 ? 'input' : 'multiple-choice')

const buildSkillIdFromQuestion = (question) => {
  const gradeId = toGradeId(question?.gradeId || question?.grade)
  const topicId = sanitizeInput(question?.topic)
  const lessonId = sanitizeInput(question?.lessonId)
  if (gradeId && topicId && lessonId) return `${gradeId}:${topicId}:${lessonId}`

  const templateId = sanitizeInput(question?.templateId || question?.id)
  if (gradeId && topicId && templateId) return `${gradeId}:${topicId}:${templateId}`

  return sanitizeInput(question?.id || '')
}

const summarizePredictionPayload = ({ analyticsSummary, retentionSummary }) => {
  const rates = analyticsSummary?.rates || {}
  return estimatePredictiveOutcomes({
    accuracyRate: rates.accuracyRate,
    assistanceRate: rates.assistanceRate,
    retentionIndex: 1 - Number(retentionSummary?.averageForgetIndex || 0),
    stabilityRate: rates.stabilityRate,
    abstractionIndex: analyticsSummary?.indiceAbstraccion || 0,
    averageDifficulty: rates.averageDifficulty,
  })
}

const buildAdaptiveRecommendation = ({ userId, grade, completedSkills, learningMode, domain }) => {
  const normalizedGrade = parseGradeNumber(grade)
  const mode = parseLearningMode(learningMode, LEARNING_MODES.CURRICULUM)
  const domainFilter = sanitizeInput(domain).toLowerCase()

  applyCompletedSkillsSnapshot(userId, completedSkills, 100)
  const masteryMap = getUserMasteryMap(userId)
  for (const completedSkillId of completedSkills || []) {
    const safeSkillId = sanitizeInput(completedSkillId)
    if (!safeSkillId) continue
    if (masteryMap[safeSkillId] == null) masteryMap[safeSkillId] = 100
  }

  const unlockFrontier = getUnlockedSkills(userId, {
    masteryMap,
    domain: domainFilter || null,
    grade: normalizedGrade || null,
    includeMastered: true,
  })
  const recommendationCandidates = getNextSkills(userId, domainFilter || null, {
    masteryMap,
    grade: normalizedGrade || null,
    limit: 25,
  })

  const dueSkills = mode === LEARNING_MODES.REVIEW ? [] : getDueSkillsForReview(userId, 25)
  const unlockedById = new Map(unlockFrontier.map((skill) => [skill.id, skill]))
  const dueCandidates = dueSkills
    .map((dueSkill) => ({
      skill: unlockedById.get(sanitizeInput(dueSkill.skillId)),
      due: dueSkill,
    }))
    .filter((item) => item.skill)
    .sort((left, right) => (right.due?.forgetIndex || 0) - (left.due?.forgetIndex || 0))

  const analyticsSummary = getUserAnalyticsSummary(userId)
  const branchMasteryMap = new Map((analyticsSummary?.dominioPorRama || []).map((item) => [item.branchId, Number(item.dominio || 0)]))
  const branchWeaknessCandidates = [...unlockFrontier]
    .filter((skill) => !Boolean(skill.mastered))
    .sort((left, right) => {
      const leftMastery = Number(branchMasteryMap.get(left.domain) || branchMasteryMap.get(left.branchId) || 0)
      const rightMastery = Number(branchMasteryMap.get(right.domain) || branchMasteryMap.get(right.branchId) || 0)
      if (leftMastery !== rightMastery) return leftMastery - rightMastery
      return Number(left.complexityWeight || 0) - Number(right.complexityWeight || 0)
    })

  const selected = dueCandidates[0]?.skill || recommendationCandidates[0] || branchWeaknessCandidates[0] || null
  const retentionSummary = getRetentionSummary(userId)
  const accuracyRate = Number(analyticsSummary?.rates?.accuracyRate || 0)
  const averageForget = Number(retentionSummary?.averageForgetIndex || 0)

  let recommendationMode = 'practice'
  if (mode === LEARNING_MODES.REVIEW) recommendationMode = 'review'
  else if (dueCandidates.length > 0) recommendationMode = 'practice'
  else if (accuracyRate >= 0.86 && averageForget <= 0.35) recommendationMode = 'challenge'
  else if (accuracyRate >= 0.72) recommendationMode = 'evaluation'

  const baseDifficulty = Number(selected?.difficulty_level || selected?.difficulty || 3)
  const recommendedDifficulty = Math.max(1, Math.min(10, baseDifficulty + (recommendationMode === 'challenge' ? 1 : 0)))
  const recommendedType = deriveQuestionTypeFromDifficulty(recommendedDifficulty)
  const frontier = getUnlockFrontier(masteryMap, {
    domain: domainFilter || null,
    grade: normalizedGrade || null,
    includeMastered: false,
  })
  const graphRecommendations = getRecommendedSkills(masteryMap, {
    domain: domainFilter || null,
    grade: normalizedGrade || null,
    limit: 10,
  })

  return {
    nextSkill: selected
      ? {
          id: selected.id,
          name: selected.name,
          domain: selected.domain,
          gradeId: selected.gradeId,
          gradeNumber: selected.gradeNumber,
          branchId: selected.branchId || selected.domain,
          topicId: selected.topicId,
          lessonId: selected.lessonId,
          lessonTitle: selected.lessonTitle,
          complexityWeight: selected.complexityWeight,
          masteryThreshold: selected.mastery_threshold,
          state: selected.state || 'unlocked',
        }
      : null,
    mode: recommendationMode,
    learningMode: mode,
    reason:
      mode === LEARNING_MODES.REVIEW
        ? 'manual-practice-mode'
        : dueCandidates.length > 0
          ? 'review-due'
          : recommendationMode === 'challenge'
            ? 'high-performance'
            : recommendationMode === 'evaluation'
              ? 'stability-window'
              : 'practice-gap',
    recommendedDifficulty,
    recommendedQuestionType: recommendedType,
    suggestedProblemMix:
      recommendationMode === 'challenge' ? 'advanced-modeling' : recommendationMode === 'evaluation' ? 'mixed' : 'contextualized',
    telemetry: {
      availableSkills: unlockFrontier.length,
      dueSkills: dueSkills.length,
      dueCandidates: dueCandidates.length,
      unlockFrontier: frontier.length,
      graphRecommendations: graphRecommendations.length,
      masteryTrackedSkills: Object.keys(masteryMap).length,
      accuracyRate: Number(analyticsSummary?.rates?.accuracyRate || 0),
      averageForgetIndex: averageForget,
      xpEnabled: mode !== LEARNING_MODES.REVIEW,
      masteryEnabled: mode !== LEARNING_MODES.REVIEW,
    },
  }
}

router.get('/curriculum', (req, res) => {
  const grade = parseGrade(req.query.grade)
  if (!grade) {
    res.status(200).json({
      grades: CURRICULUM_GRADES,
      totalGrades: CURRICULUM_GRADES.length,
    })
    return
  }

  const gradeData = getGradeCurriculum(grade)
  if (!gradeData) {
    res.status(404).json({
      error: `No existe curriculum para grade=${grade}`,
    })
    return
  }

  res.status(200).json({
    grade: gradeData,
  })
})

router.get('/branches', (req, res) => {
  res.status(200).json({
    branches: CURRICULUM_BRANCHES,
    totalBranches: CURRICULUM_BRANCHES.length,
  })
})

router.get('/branches/:id', (req, res) => {
  const branchId = sanitizeInput(req.params?.id).toLowerCase()
  if (!branchId) {
    res.status(400).json({
      error: 'branch id es obligatorio.',
    })
    return
  }

  const branch = getCurriculumBranch(branchId)
  if (!branch) {
    res.status(404).json({
      error: `No existe rama academica para id=${branchId}`,
    })
    return
  }

  res.status(200).json({
    branch,
  })
})

router.get('/skills/domain/:domain', (req, res) => {
  const domain = sanitizeInput(req.params?.domain).toLowerCase()
  if (!domain) {
    res.status(400).json({
      error: 'domain es obligatorio.',
    })
    return
  }

  const skills = getDomainSkills(domain)
  if (!skills.length) {
    res.status(404).json({
      error: `No existen habilidades para domain=${domain}.`,
    })
    return
  }

  res.status(200).json({
    domain,
    skills,
    totalSkills: skills.length,
  })
})

router.get('/skills/:id/prerequisites', (req, res) => {
  const skillId = sanitizeInput(req.params?.id)
  const skill = getSkill(skillId)
  if (!skill) {
    res.status(404).json({
      error: `No existe skill id=${skillId}.`,
    })
    return
  }

  res.status(200).json({
    skillId,
    prerequisites: getPrerequisites(skillId),
  })
})

router.get('/skills/:id/dependents', (req, res) => {
  const skillId = sanitizeInput(req.params?.id)
  const skill = getSkill(skillId)
  if (!skill) {
    res.status(404).json({
      error: `No existe skill id=${skillId}.`,
    })
    return
  }

  res.status(200).json({
    skillId,
    dependents: getDependents(skillId),
  })
})

router.get('/skills/:id', (req, res) => {
  const skillId = sanitizeInput(req.params?.id)
  const skill = getSkill(skillId)
  if (!skill) {
    res.status(404).json({
      error: `No existe skill id=${skillId}.`,
    })
    return
  }

  res.status(200).json({
    skill,
    prerequisites: getPrerequisites(skillId).map((item) => item.id),
    unlocks: getDependents(skillId).map((item) => item.id),
  })
})

router.post('/skills/unlocked', (req, res) => {
  const userId = sanitizeInput(req.body?.userId)
  const domain = sanitizeInput(req.body?.domain)
  const grade = parseGrade(req.body?.grade)
  if (!userId) {
    res.status(400).json({
      error: 'userId es obligatorio.',
    })
    return
  }

  const unlocked = getUnlockedSkills(userId, {
    domain: domain || null,
    grade: grade || null,
    includeMastered: true,
  })
  res.status(200).json({
    userId,
    domain: domain || null,
    grade: grade || null,
    unlocked,
    totalUnlocked: unlocked.length,
  })
})

router.post('/skills/next', (req, res) => {
  const userId = sanitizeInput(req.body?.userId)
  const domain = sanitizeInput(req.body?.domain)
  const grade = parseGrade(req.body?.grade)
  const limit = parseOptionalLimit(req.body?.limit, 8, 50)
  if (!userId) {
    res.status(400).json({
      error: 'userId es obligatorio.',
    })
    return
  }

  const nextSkills = getNextSkills(userId, domain || null, {
    grade: grade || null,
    limit,
  })
  res.status(200).json({
    userId,
    domain: domain || null,
    grade: grade || null,
    nextSkills,
  })
})

router.post('/mastery/state', (req, res) => {
  const userId = sanitizeInput(req.body?.userId)
  if (!userId) {
    res.status(400).json({
      error: 'userId es obligatorio.',
    })
    return
  }

  const masteryMap = getUserMasteryMap(userId)
  res.status(200).json({
    userId,
    trackedSkills: Object.keys(masteryMap).length,
    mastery: masteryMap,
    states: getUserSkillStates(userId),
  })
})

router.post('/curriculum/lesson/skills', (req, res) => {
  const lessonId = sanitizeInput(req.body?.lessonId)
  if (!lessonId) {
    res.status(400).json({
      error: 'lessonId es obligatorio.',
    })
    return
  }

  const lessonSkills = getLessonSkills(lessonId)
  res.status(200).json({
    lessonId,
    skills: lessonSkills,
    totalSkills: lessonSkills.length,
  })
})

router.post('/curriculum/lesson/completed', (req, res) => {
  const userId = sanitizeInput(req.body?.userId)
  const lessonId = sanitizeInput(req.body?.lessonId)
  if (!userId || !lessonId) {
    res.status(400).json({
      error: 'userId y lessonId son obligatorios.',
    })
    return
  }

  res.status(200).json({
    userId,
    lessonId,
    completion: isLessonCompleted(userId, lessonId),
  })
})

router.post('/curriculum/unit/completed', (req, res) => {
  const userId = sanitizeInput(req.body?.userId)
  const unitId = sanitizeInput(req.body?.unitId)
  if (!userId || !unitId) {
    res.status(400).json({
      error: 'userId y unitId son obligatorios.',
    })
    return
  }

  res.status(200).json({
    userId,
    unitId,
    completion: isUnitCompleted(userId, unitId),
  })
})

router.post('/domain/map', (req, res) => {
  const grade = parseGrade(req.body?.grade)
  const completedSkills = parseCompletedSkills(req.body?.completedSkills)
  const revealAll = parseBoolean(req.body?.revealAll, false)
  const graph = getDomainGraph({
    grade: grade ?? null,
    completedSkills,
    revealAll,
  })

  res.status(200).json({
    graph,
  })
})

router.post('/adaptive/recommendation', (req, res) => {
  const userId = sanitizeInput(req.body?.userId)
  const grade = parseGrade(req.body?.grade)
  const completedSkills = parseCompletedSkills(req.body?.completedSkills)
  const learningMode = parseLearningMode(req.body?.learningMode, LEARNING_MODES.CURRICULUM)
  const domain = sanitizeInput(req.body?.domain)
  if (!userId) {
    res.status(400).json({
      error: 'userId es obligatorio.',
    })
    return
  }

  const recommendation = buildAdaptiveRecommendation({
    userId,
    grade,
    completedSkills,
    learningMode,
    domain,
  })
  res.status(200).json({
    recommendation,
  })
})

router.post('/evaluation/generate', (req, res) => {
  const grade = parseGrade(req.body?.grade)
  const mode = sanitizeInput(req.body?.mode)
  const userId = sanitizeInput(req.body?.userId)
  const blueprint = req.body?.blueprint && typeof req.body.blueprint === 'object' ? req.body.blueprint : {}

  if (!grade) {
    res.status(400).json({
      error: 'grade es obligatorio.',
    })
    return
  }

  try {
    const evaluation = generateAdaptiveEvaluation({
      grade,
      mode,
      blueprint,
    })

    if (userId) {
      for (const question of evaluation.questions) {
        const enrichedQuestion = {
          ...question,
          gradeId: evaluation.gradeId,
          lessonId: `evaluation-${evaluation.mode}`,
          lessonTitle: evaluation.title,
          problemMix: question.mixTag || 'mixed',
        }
        registerGeneratedQuestion({
          userId,
          question: enrichedQuestion,
          examMode: !evaluation.rules?.aiHelpAllowed,
        })
        registerQuestionGeneratedEvent({
          userId,
          question: enrichedQuestion,
          lessonContext: {
            problemMix: enrichedQuestion.problemMix,
            lessonId: enrichedQuestion.lessonId,
          },
        })
      }
    }

    res.status(200).json({
      evaluation: {
        ...evaluation,
        questions: evaluation.questions.map((question) => toPublicQuestion(question)),
      },
    })
  } catch (error) {
    res.status(500).json({
      error: sanitizeInput(error?.message) || 'No se pudo generar la evaluacion.',
    })
  }
})

router.post('/question/generate', async (req, res) => {
  const userId = sanitizeInput(req.body?.userId)
  const grade = parseGrade(req.body?.grade)
  const topic = sanitizeInput(req.body?.topic)
  const difficulty = Number(req.body?.difficulty || 1)
  const examMode = Boolean(req.body?.examMode)
  const learningMode = parseLearningMode(req.body?.learningMode, LEARNING_MODES.CURRICULUM)
  const gradeId = sanitizeInput(req.body?.gradeId)
  const lessonId = sanitizeInput(req.body?.lessonId)
  const lessonTitle = sanitizeInput(req.body?.lessonTitle)
  const questionNumber = Number(req.body?.questionNumber || 1)
  const totalQuestions = Number(req.body?.totalQuestions || 1)
  const lessonSkills = Array.isArray(req.body?.lessonSkills)
    ? req.body.lessonSkills.map((skill) => sanitizeInput(skill)).filter(Boolean)
    : []
  const lessonSubtopics = Array.isArray(req.body?.lessonSubtopics)
    ? req.body.lessonSubtopics.map((subtopic) => sanitizeInput(subtopic)).filter(Boolean)
    : []
  const problemMix = sanitizeInput(req.body?.problemMix)
  const questionCount = Number(req.body?.questionCount || 0)

  if (!userId || !grade || !topic) {
    res.status(400).json({
      error: 'userId, grade y topic son obligatorios.',
    })
    return
  }

  try {
    const blockedFingerprints = getBlockedFingerprints(userId)

    // ─── DB-First: buscar problema real en PostgreSQL ───────────────────────
    const dbProblem = await findRealProblemForTopic({
      topic,
      difficulty,
      excludedIds: blockedFingerprints,
    });

    const question = dbProblem ?? generateQuestion({
      grade,
      topic,
      difficulty,
      lessonContext: {
        lessonId,
        lessonTitle,
        lessonSkills,
        lessonSubtopics,
        problemMix,
        questionCount: Number.isFinite(questionCount) && questionCount > 0 ? Math.floor(questionCount) : undefined,
        questionNumber,
        totalQuestions,
      },
      excludedFingerprints: blockedFingerprints,
    })

    const enrichedQuestion = {
      ...question,
      gradeId: toGradeId(gradeId || grade),
      lessonId,
      lessonTitle,
      problemMix: parseMix(problemMix || 'mixed'),
      lessonSkills,
      lessonSubtopics,
      learningMode,
    }

    const { state } = registerGeneratedQuestion({
      userId,
      question: enrichedQuestion,
      examMode,
    })
    if (learningMode !== LEARNING_MODES.REVIEW) {
      registerQuestionGeneratedEvent({
        userId,
        question: enrichedQuestion,
        lessonContext: {
          problemMix: enrichedQuestion.problemMix,
          lessonId,
          learningMode,
        },
      })
    }

    res.status(200).json({
      question: toPublicQuestion(enrichedQuestion),
      learningMode,
      state: getPublicQuestionState(state),
      maxAttempts: MAX_ATTEMPTS,
      flow: QUESTION_STATE_FLOW,
      source: dbProblem ? 'database' : 'generated',  // INFO para el frontend
    })
  } catch (error) {
    res.status(500).json({
      error: sanitizeInput(error?.message) || 'No se pudo generar la pregunta.',
    })
  }
})

router.post('/question/state', (req, res) => {
  const userId = sanitizeInput(req.body?.userId)
  const questionHash = sanitizeInput(req.body?.questionHash)

  if (!userId || !questionHash) {
    res.status(400).json({
      error: 'userId y questionHash son obligatorios.',
    })
    return
  }

  const state = getQuestionState({ userId, questionHash })
  if (!state) {
    res.status(404).json({
      error: 'No existe estado para la pregunta solicitada.',
    })
    return
  }

  res.status(200).json({
    state: getPublicQuestionState(state),
    maxAttempts: MAX_ATTEMPTS,
  })
})

router.post('/question/help', async (req, res) => {
  const userId = sanitizeInput(req.body?.userId)
  const questionHash = sanitizeInput(req.body?.questionHash)
  const requestedMode = sanitizeInput(req.body?.mode).toLowerCase() === 'full' ? 'full' : 'hint'
  const previousExplanation = sanitizeInput(req.body?.previousExplanation)
  const lastStudentAnswer = sanitizeInput(req.body?.lastStudentAnswer)
  const studentAttempts = parseOptionalCount(req.body?.studentAttempts)
  const errorCount = parseOptionalCount(req.body?.errorCount)
  const correctStreak = parseOptionalCount(req.body?.correctStreak)
  const requestedLevel = parseTutorLevel(req.body?.level)

  if (!userId || !questionHash) {
    res.status(400).json({
      error: 'userId y questionHash son obligatorios.',
    })
    return
  }

  const storedQuestion = getStoredQuestion({ userId, questionHash })
  if (!storedQuestion) {
    res.status(404).json({
      error: 'No existe una pregunta activa con ese hash para el usuario.',
    })
    return
  }

  if (storedQuestion.examMode) {
    res.status(403).json({
      error: 'La ayuda IA esta bloqueada durante examenes finales.',
    })
    return
  }

  const helpEvent = registerHelpRequest({
    userId,
    questionHash,
    requestedMode,
  })

  if (helpEvent.event === 'locked') {
    res.status(423).json({
      error: 'La pregunta esta bloqueada.',
      state: getPublicQuestionState(helpEvent.state),
    })
    return
  }

  const stateAttempts = parseOptionalCount(helpEvent?.state?.attempts) ?? 0
  const aiResult = await requestTutorHelp({
    question: storedQuestion.question,
    grade: storedQuestion.grade,
    topic: storedQuestion.topic,
    mode: helpEvent.mode,
    level: requestedLevel || undefined,
    difficulty: storedQuestion.difficulty,
    previousExplanation,
    studentAttempts: studentAttempts ?? stateAttempts,
    lastStudentAnswer,
    errorCount: errorCount ?? stateAttempts,
    correctStreak: correctStreak ?? 0,
    correctAnswer: storedQuestion.correctAnswer,
  })

  res.status(200).json({
    mode: helpEvent.mode,
    answer: aiResult.answer,
    source: aiResult.source,
    fallbackReason: aiResult.fallbackReason,
    state: getPublicQuestionState(helpEvent.state),
    xpAwarded: 0,
    ...(helpEvent.mode === 'full' ? { correctAnswer: storedQuestion.correctAnswer } : {}),
  })
})

router.post('/question/chat', async (req, res) => {
  const userId = sanitizeInput(req.body?.userId)
  const questionHash = sanitizeInput(req.body?.questionHash)
  const message = sanitizeInput(req.body?.message)
  const previousExplanation = sanitizeInput(req.body?.previousExplanation)
  const lastStudentAnswer = sanitizeInput(req.body?.lastStudentAnswer)
  const studentAttempts = parseOptionalCount(req.body?.studentAttempts)
  const errorCount = parseOptionalCount(req.body?.errorCount)
  const correctStreak = parseOptionalCount(req.body?.correctStreak)
  const requestedLevel = parseTutorLevel(req.body?.level)
  const history = parseChatHistory(req.body?.history)

  if (!userId || !questionHash) {
    res.status(400).json({
      error: 'userId y questionHash son obligatorios.',
    })
    return
  }

  if (!message) {
    res.status(400).json({
      error: 'message es obligatorio.',
    })
    return
  }

  const storedQuestion = getStoredQuestion({ userId, questionHash })
  if (!storedQuestion) {
    res.status(404).json({
      error: 'No existe una pregunta activa con ese hash para el usuario.',
    })
    return
  }

  if (storedQuestion.examMode) {
    res.status(403).json({
      error: 'El chat del profesor virtual esta bloqueado durante examenes finales.',
    })
    return
  }

  const intent = classifyTutorIntent(message)
  const interaction = registerChatInteraction({
    userId,
    questionHash,
    intent,
    conceptualPenaltyPct: 10,
  })

  if (interaction.event === 'locked') {
    res.status(423).json({
      error: 'La pregunta esta bloqueada.',
      state: getPublicQuestionState(interaction.state),
    })
    return
  }

  const stateAttempts = parseOptionalCount(interaction?.state?.attempts) ?? 0
  const allowFinalAnswer = intent === CHAT_INTENTS.FINAL_ANSWER
  const aiResult = await requestTutorChat({
    question: storedQuestion.question,
    grade: storedQuestion.grade,
    topic: storedQuestion.topic,
    level: requestedLevel || undefined,
    difficulty: storedQuestion.difficulty,
    previousExplanation,
    studentAttempts: studentAttempts ?? stateAttempts,
    lastStudentAnswer,
    errorCount: errorCount ?? stateAttempts,
    correctStreak: correctStreak ?? 0,
    studentMessage: message,
    chatHistory: history,
    intent,
    allowFinalAnswer,
    correctAnswer: storedQuestion.correctAnswer,
  })

  const blockedByPolicy = interaction.event === 'blocked-final-answer'
  const currentPenaltyPct = Number(interaction?.state?.helpPenaltyPct || 0)
  const responseMessage = blockedByPolicy
    ? 'La pregunta se bloqueo por solicitud de respuesta final. XP de esta pregunta = 0.'
    : currentPenaltyPct > 0
      ? `Chat activo. Ajuste acumulado de XP en esta pregunta: -${currentPenaltyPct}%.`
      : 'Chat activo.'

  res.status(200).json({
    intent: aiResult.intent,
    answer: aiResult.answer,
    source: aiResult.source,
    fallbackReason: aiResult.fallbackReason,
    blockedByPolicy,
    message: responseMessage,
    policy: {
      conceptualPenaltyPct: 10,
      currentPenaltyPct,
      finalAnswerBlocksQuestion: true,
    },
    state: getPublicQuestionState(interaction.state),
    ...(blockedByPolicy ? { correctAnswer: storedQuestion.correctAnswer } : {}),
  })
})

router.post('/question/submit', async (req, res) => {
  const userId = sanitizeInput(req.body?.userId)
  const questionHash = sanitizeInput(req.body?.questionHash)
  const answer = req.body?.answer
  const elapsedTimeMs = Number(req.body?.elapsedTimeMs || 0)
  const requestedMix = parseMix(req.body?.problemMix)
  const explicitSkillId = sanitizeInput(req.body?.skillId)
  const requestedLearningMode = sanitizeInput(req.body?.learningMode)

  if (!userId || !questionHash) {
    res.status(400).json({
      error: 'userId y questionHash son obligatorios.',
    })
    return
  }

  const storedQuestion = getStoredQuestion({ userId, questionHash })
  if (!storedQuestion) {
    res.status(404).json({
      error: 'No existe una pregunta activa con ese hash para el usuario.',
    })
    return
  }

  const learningMode = requestedLearningMode
    ? parseLearningMode(requestedLearningMode, LEARNING_MODES.CURRICULUM)
    : parseLearningMode(storedQuestion?.learningMode, LEARNING_MODES.CURRICULUM)
  const progressEnabled = isMasteryTrackingMode(learningMode)

  const currentState = getQuestionState({ userId, questionHash })
  if (currentState?.locked) {
    res.status(423).json({
      error: 'La pregunta esta bloqueada.',
      state: getPublicQuestionState(currentState),
    })
    return
  }

  const correct = isAnswerCorrect(storedQuestion, answer)
  const attemptResult = submitAttempt({
    userId,
    questionHash,
    isCorrect: correct,
    maxAttempts: MAX_ATTEMPTS,
  })

  const conceptualError = classifyConceptualError({
    question: storedQuestion,
    submittedAnswer: answer,
    isCorrect: correct,
    attempts: attemptResult?.state?.attempts,
    elapsedTimeMs,
  })
  const skillId = explicitSkillId || buildSkillIdFromQuestion(storedQuestion)
  const retentionState = progressEnabled
    ? registerSkillObservation({
        userId,
        skillId,
        correct,
        difficulty: Number(storedQuestion?.difficulty || 1),
        elapsedTimeMs,
      })
    : null
  if (progressEnabled) {
    registerAttemptAnalyticsEvent({
      userId,
      question: storedQuestion,
      correct,
      assisted: attemptResult?.state?.assisted,
      elapsedTimeMs,
      errorType: conceptualError.type,
      requestedMix: requestedMix || storedQuestion?.problemMix || 'mixed',
    })
  }
  const masteryState = updateMastery(userId, skillId, {
    isCorrect: correct,
    elapsedTimeMs,
    difficultyLevel: Number(storedQuestion?.difficulty || 1),
    errorType: conceptualError.type,
    assisted: attemptResult?.state?.assisted,
    mode: learningMode,
  })

  if (attemptResult.event === 'correct') {
    const helpPenaltyPct = Number(attemptResult?.state?.helpPenaltyPct || 0)
    const xpAwarded = progressEnabled
      ? calculateXP({
          difficulty: storedQuestion.difficulty,
          attempts: attemptResult.state.attempts,
          assisted: attemptResult.state.assisted,
          helpPenaltyPct,
        })
      : 0
    const penaltyNote =
      helpPenaltyPct > 0 ? ` (ajuste por ayuda en chat: -${Math.floor(helpPenaltyPct)}%)` : ''
    const successMessage = progressEnabled
      ? xpAwarded > 0
        ? `Correcto. +${xpAwarded} XP${penaltyNote}`
        : `Correcto. XP = 0${penaltyNote}`
      : 'Correcto en modo repaso. No otorga XP ni progreso.'

    res.status(200).json({
      correct: true,
      message: successMessage,
      xpAwarded,
      learningMode,
      errorClassification: conceptualError,
      retention: retentionState,
      mastery: masteryState,
      state: getPublicQuestionState(attemptResult.state),
    })
    return
  }

  if (attemptResult.event === 'retry') {
    res.status(200).json({
      correct: false,
      message: progressEnabled ? 'Sigue intentando, vas bien. Revisa tus pasos.' : 'Modo repaso: intenta nuevamente.',
      xpAwarded: 0,
      learningMode,
      errorClassification: conceptualError,
      retention: retentionState,
      mastery: masteryState,
      state: getPublicQuestionState(attemptResult.state),
    })
    return
  }

  if (attemptResult.event === 'max-attempts') {
    const attemptCount = parseOptionalCount(attemptResult?.state?.attempts) ?? MAX_ATTEMPTS
    const aiResult = await requestTutorHelp({
      question: storedQuestion.question,
      grade: storedQuestion.grade,
      topic: storedQuestion.topic,
      mode: 'full',
      difficulty: storedQuestion.difficulty,
      studentAttempts: attemptCount,
      lastStudentAnswer: sanitizeInput(answer),
      errorCount: attemptCount,
      correctAnswer: storedQuestion.correctAnswer,
    })

    res.status(200).json({
      correct: false,
      maxAttemptsReached: true,
      message: 'Se activo explicacion completa. Esta pregunta queda bloqueada y no otorga XP.',
      xpAwarded: 0,
      learningMode,
      errorClassification: conceptualError,
      retention: retentionState,
      mastery: masteryState,
      answer: aiResult.answer,
      source: aiResult.source,
      fallbackReason: aiResult.fallbackReason,
      correctAnswer: storedQuestion.correctAnswer,
      state: getPublicQuestionState(attemptResult.state),
    })
    return
  }

  res.status(423).json({
    correct: false,
    message: 'La pregunta esta bloqueada.',
    xpAwarded: 0,
    learningMode,
    errorClassification: conceptualError,
    retention: retentionState,
    mastery: masteryState,
    state: getPublicQuestionState(attemptResult.state),
  })
})

router.post('/question/reset', (req, res) => {
  const userId = sanitizeInput(req.body?.userId)
  const questionHash = sanitizeInput(req.body?.questionHash)

  if (!userId || !questionHash) {
    res.status(400).json({
      error: 'userId y questionHash son obligatorios.',
    })
    return
  }

  resetQuestionState({ userId, questionHash })
  res.status(200).json({
    ok: true,
  })
})

router.post('/final-exam/generate', (req, res) => {
  const grade = parseGrade(req.body?.grade)
  const userId = sanitizeInput(req.body?.userId)
  const questionCount = Number(req.body?.questionCount)
  const examMode = sanitizeInput(req.body?.examMode)

  if (!grade) {
    res.status(400).json({
      error: 'grade es obligatorio.',
    })
    return
  }

  try {
    const exam = generateFinalExam(grade, {
      questionCount: Number.isFinite(questionCount) ? questionCount : undefined,
      examMode: examMode || undefined,
    })

    if (userId) {
      for (const question of exam.questions) {
        const enrichedQuestion = {
          ...question,
          gradeId: exam.gradeId,
          lessonId: 'final-exam',
          lessonTitle: exam.title,
          problemMix: question.mixTag || 'mixed',
        }
        registerGeneratedQuestion({
          userId,
          question: enrichedQuestion,
          examMode: true,
        })
        registerQuestionGeneratedEvent({
          userId,
          question: enrichedQuestion,
          lessonContext: {
            problemMix: enrichedQuestion.problemMix,
            lessonId: 'final-exam',
          },
        })
      }
    }

    res.status(200).json({
      exam: {
        ...exam,
        questions: exam.questions.map((question) => toPublicQuestion(question)),
      },
      message: 'Examen final generado. Ayuda IA bloqueada para todas las preguntas.',
    })
  } catch (error) {
    res.status(500).json({
      error: sanitizeInput(error?.message) || 'No se pudo generar el examen final.',
    })
  }
})

router.post('/retention/profile', (req, res) => {
  const userId = sanitizeInput(req.body?.userId)
  if (!userId) {
    res.status(400).json({
      error: 'userId es obligatorio.',
    })
    return
  }

  const profile = getUserRetentionProfile(userId)
  res.status(200).json({
    userId,
    summary: getRetentionSummary(userId),
    profile,
  })
})

router.post('/retention/due', (req, res) => {
  const userId = sanitizeInput(req.body?.userId)
  const limit = Number(req.body?.limit || 10)
  if (!userId) {
    res.status(400).json({
      error: 'userId es obligatorio.',
    })
    return
  }

  res.status(200).json({
    userId,
    due: getDueSkillsForReview(userId, limit),
  })
})

router.post('/analytics/student', (req, res) => {
  const userId = sanitizeInput(req.body?.userId)
  if (!userId) {
    res.status(400).json({
      error: 'userId es obligatorio.',
    })
    return
  }

  const analytics = getUserAnalyticsSummary(userId)
  const retention = getRetentionSummary(userId)
  const predictive = summarizePredictionPayload({
    analyticsSummary: analytics,
    retentionSummary: retention,
  })

  res.status(200).json({
    userId,
    analytics,
    retention,
    predictive,
  })
})

router.post('/analytics/teacher', (req, res) => {
  const userIds = Array.isArray(req.body?.userIds) ? req.body.userIds.map((item) => sanitizeInput(item)).filter(Boolean) : []
  if (!userIds.length) {
    res.status(400).json({
      error: 'userIds es obligatorio y debe ser un arreglo no vacio.',
    })
    return
  }

  const students = userIds.map((userId) => ({
    userId,
    analytics: getUserAnalyticsSummary(userId),
    retention: getRetentionSummary(userId),
  }))
  const totalAttempts = students.reduce((acc, item) => acc + Number(item.analytics?.totals?.attempts || 0), 0)
  const averageDominio = students.reduce((acc, item) => acc + Number(item.analytics?.dominioGlobal || 0), 0) / students.length
  const averageAbstraction =
    students.reduce((acc, item) => acc + Number(item.analytics?.indiceAbstraccion || 0), 0) / students.length

  res.status(200).json({
    cohort: {
      students: students.length,
      totalAttempts,
      averageDominioGlobal: Number(averageDominio.toFixed(2)),
      averageIndiceAbstraccion: Number(averageAbstraction.toFixed(2)),
    },
    students,
  })
})

router.get('/analytics/admin', (req, res) => {
  res.status(200).json({
    admin: getAdministrativeAnalytics(),
  })
})

router.get('/analytics/ranking', (req, res) => {
  const limit = Number(req.query?.limit || 20)
  res.status(200).json({
    ranking: getAbstractionRanking(limit),
  })
})

router.post('/predictive/outcomes', (req, res) => {
  const userId = sanitizeInput(req.body?.userId)
  if (userId) {
    const analytics = getUserAnalyticsSummary(userId)
    const retention = getRetentionSummary(userId)
    res.status(200).json({
      userId,
      predictive: summarizePredictionPayload({
        analyticsSummary: analytics,
        retentionSummary: retention,
      }),
    })
    return
  }

  const predictive = estimatePredictiveOutcomes({
    accuracyRate: req.body?.accuracyRate,
    assistanceRate: req.body?.assistanceRate,
    retentionIndex: req.body?.retentionIndex,
    stabilityRate: req.body?.stabilityRate,
    abstractionIndex: req.body?.abstractionIndex,
    averageDifficulty: req.body?.averageDifficulty,
  })

  res.status(200).json({
    predictive,
  })
})

router.post('/level/update', (req, res) => {
  const levelState = updateUserLevel({
    currentDifficulty: req.body?.currentDifficulty,
    accuracyRate: req.body?.accuracyRate,
    averageTimeMs: req.body?.averageTimeMs,
    streak: req.body?.streak,
  })

  res.status(200).json(levelState)
})

router.post('/master-context', (req, res) => {
  const userId = sanitizeInput(req.body?.userId)
  const grade = parseGrade(req.body?.grade)
  const completedSkills = parseCompletedSkills(req.body?.completedSkills)

  const recommendation = userId
    ? buildAdaptiveRecommendation({
        userId,
        grade,
        completedSkills,
      })
    : null

  const response = {
    product: {
      name: 'EliteMath App',
      mode: 'alto-rendimiento',
      aiProvider: 'ollama',
    },
    modules: {
      domainGraph: Boolean(true),
      adaptiveEngine: Boolean(true),
      evaluationEngine: Boolean(true),
      analyticsEngine: Boolean(true),
      conceptualErrorLayer: Boolean(true),
      retentionLayer: Boolean(true),
      predictiveLayer: Boolean(true),
      gamificationStructured: Boolean(true),
    },
    recommendation,
    curriculum: {
      grades: CURRICULUM_GRADES.length,
      branches: CURRICULUM_BRANCHES.length,
      selectedGrade: grade || null,
    },
  }

  res.status(200).json(response)
})

export default router
