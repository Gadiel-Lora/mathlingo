import { Router } from 'express'

import { CURRICULUM_BRANCHES, CURRICULUM_GRADES, getCurriculumBranch, getGradeCurriculum } from '../../curriculum/index.js'
import {
  getBlockedFingerprints,
  getPublicQuestionState,
  getQuestionState,
  getStoredQuestion,
  registerGeneratedQuestion,
  registerHelpRequest,
  resetQuestionState,
  submitAttempt,
} from '../academic/attemptManager.js'
import { generateFinalExam } from '../academic/finalExamGenerator.js'
import { QUESTION_STATE_FLOW } from '../academic/questionStateFlow.js'
import { generateQuestion, isAnswerCorrect, toPublicQuestion } from '../academic/questionEngine.js'
import { requestTutorHelp } from '../academic/tutorAI.js'
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

router.post('/question/generate', (req, res) => {
  const userId = sanitizeInput(req.body?.userId)
  const grade = parseGrade(req.body?.grade)
  const topic = sanitizeInput(req.body?.topic)
  const difficulty = Number(req.body?.difficulty || 1)
  const examMode = Boolean(req.body?.examMode)
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
    const question = generateQuestion({
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

    const { state } = registerGeneratedQuestion({
      userId,
      question,
      examMode,
    })

    res.status(200).json({
      question: toPublicQuestion(question),
      state: getPublicQuestionState(state),
      maxAttempts: MAX_ATTEMPTS,
      flow: QUESTION_STATE_FLOW,
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

  const aiResult = await requestTutorHelp({
    question: storedQuestion.question,
    grade: storedQuestion.grade,
    topic: storedQuestion.topic,
    mode: helpEvent.mode,
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

router.post('/question/submit', async (req, res) => {
  const userId = sanitizeInput(req.body?.userId)
  const questionHash = sanitizeInput(req.body?.questionHash)
  const answer = req.body?.answer

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

  if (attemptResult.event === 'correct') {
    const xpAwarded = calculateXP({
      difficulty: storedQuestion.difficulty,
      attempts: attemptResult.state.attempts,
      assisted: attemptResult.state.assisted,
    })

    res.status(200).json({
      correct: true,
      message: xpAwarded > 0 ? `Correcto. +${xpAwarded} XP` : 'Correcto. XP = 0',
      xpAwarded,
      state: getPublicQuestionState(attemptResult.state),
    })
    return
  }

  if (attemptResult.event === 'retry') {
    res.status(200).json({
      correct: false,
      message: 'Sigue intentando, vas bien. Revisa tus pasos.',
      xpAwarded: 0,
      state: getPublicQuestionState(attemptResult.state),
    })
    return
  }

  if (attemptResult.event === 'max-attempts') {
    const aiResult = await requestTutorHelp({
      question: storedQuestion.question,
      grade: storedQuestion.grade,
      topic: storedQuestion.topic,
      mode: 'full',
      correctAnswer: storedQuestion.correctAnswer,
    })

    res.status(200).json({
      correct: false,
      maxAttemptsReached: true,
      message: 'Se activo explicacion completa. Esta pregunta queda bloqueada y no otorga XP.',
      xpAwarded: 0,
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

  if (!grade) {
    res.status(400).json({
      error: 'grade es obligatorio.',
    })
    return
  }

  try {
    const exam = generateFinalExam(grade, {
      questionCount: Number.isFinite(questionCount) ? questionCount : undefined,
    })

    if (userId) {
      for (const question of exam.questions) {
        registerGeneratedQuestion({
          userId,
          question,
          examMode: true,
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

router.post('/level/update', (req, res) => {
  const levelState = updateUserLevel({
    currentDifficulty: req.body?.currentDifficulty,
    accuracyRate: req.body?.accuracyRate,
    averageTimeMs: req.body?.averageTimeMs,
    streak: req.body?.streak,
  })

  res.status(200).json(levelState)
})

export default router
