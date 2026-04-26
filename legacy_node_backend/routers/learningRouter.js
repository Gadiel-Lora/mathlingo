import { Router } from 'express'

import prisma from '../lib/prismaClient.js'
import { requireAuth } from '../middlewares/authMiddleware.js'
import { emitPedagogicalEvent } from '../services/n8nService.js'
import {
  buildLearningOverview,
  fetchCurriculumBranches,
  fetchCurriculumGrade,
  fetchCurriculumGrades,
  persistStudentResponseEvent,
  updateSelectedPath,
} from '../services/learningBlueprintService.js'

const router = Router()

const sanitize = (value) => String(value ?? '').trim()
const normalizePathType = (value) => {
  const normalized = sanitize(value).toUpperCase()
  if (['AUTONOMO', 'AUTONOMOUS', 'AUTO'].includes(normalized)) return 'AUTONOMOUS'
  if (['HYBRID', 'HIBRIDO'].includes(normalized)) return 'HYBRID'
  return 'GRADE'
}

router.get('/curriculum', async (req, res) => {
  const gradeId = sanitize(req.query?.grade)
  const grade = gradeId ? await fetchCurriculumGrade(gradeId) : null
  if (gradeId && !grade) {
    res.status(404).json({ error: `No existe curriculum para grade=${gradeId}.` })
    return
  }

  if (grade) {
    res.status(200).json({ grade })
    return
  }

  const grades = await fetchCurriculumGrades()
  res.status(200).json({ grades, totalGrades: grades.length })
})

router.get('/branches', async (_req, res) => {
  const branches = await fetchCurriculumBranches()
  res.status(200).json({ branches, totalBranches: branches.length })
})

router.get('/branches/:id', async (req, res) => {
  const branchId = sanitize(req.params?.id).toLowerCase()
  const branches = await fetchCurriculumBranches()
  const branch = branches.find((item) => String(item.id).toLowerCase() === branchId) || null

  if (!branch) {
    res.status(404).json({ error: `No existe rama academica para id=${branchId}.` })
    return
  }

  res.status(200).json({ branch })
})

router.get('/overview', requireAuth, async (req, res) => {
  const overview = await buildLearningOverview(req.user.id)
  if (!overview) {
    res.status(404).json({ error: 'No existe perfil academico para este usuario.' })
    return
  }

  res.status(200).json({ overview })
})

router.post('/path', requireAuth, async (req, res) => {
  const selectedPathType = normalizePathType(req.body?.selectedPathType)
  const user = await updateSelectedPath({ userId: req.user.id, selectedPathType })
  if (!user) {
    res.status(404).json({ error: 'Usuario no encontrado para actualizar la ruta.' })
    return
  }

  res.status(200).json({ ok: true, selectedPathType: user.selectedPathType, learningPathId: user.learningPathId })
})

router.post('/events/answer', requireAuth, async (req, res) => {
  const result = await persistStudentResponseEvent({
    userId: req.user.id,
    skillId: sanitize(req.body?.skillId) || null,
    lessonId: sanitize(req.body?.lessonId) || null,
    problemId: sanitize(req.body?.problemId) || null,
    problemFingerprint: sanitize(req.body?.problemFingerprint || req.body?.questionHash || `${Date.now()}`),
    answer: sanitize(req.body?.answer),
    normalizedAnswer: sanitize(req.body?.normalizedAnswer) || null,
    isCorrect: Boolean(req.body?.isCorrect),
    attemptNumber: Number(req.body?.attemptNumber || 1),
    xpGained: Number(req.body?.xpGained || 0),
    timeTaken: Number(req.body?.timeTaken || 0),
    learningPathType: normalizePathType(req.body?.learningPathType),
    tutorUsed: Boolean(req.body?.tutorUsed),
    context: req.body?.context && typeof req.body.context === 'object' ? req.body.context : {},
  })

  res.status(200).json(result)
})

router.post('/events/hint', requireAuth, async (req, res) => {
  const response = await emitPedagogicalEvent({
    userId: req.user.id,
    type: 'HINT_REQUESTED',
    skillId: sanitize(req.body?.skillId) || null,
    lessonId: sanitize(req.body?.lessonId) || null,
    payload: req.body?.context && typeof req.body.context === 'object' ? req.body.context : {},
  })

  res.status(200).json({ ok: true, response })
})

router.post('/events/lesson-completed', requireAuth, async (req, res) => {
  const lessonId = sanitize(req.body?.lessonId)
  if (!lessonId) {
    res.status(400).json({ error: 'lessonId es obligatorio.' })
    return
  }

  await prisma.userLessonState.upsert({
    where: { userId_lessonId: { userId: req.user.id, lessonId } },
    update: {
      status: 'COMPLETED',
      completedAt: new Date(),
      lastProblemAt: new Date(),
      masteryPercentage: Number(req.body?.masteryPercentage || 100),
      gradeGateSatisfied: true,
    },
    create: {
      userId: req.user.id,
      lessonId,
      status: 'COMPLETED',
      completedAt: new Date(),
      unlockedAt: new Date(),
      lastProblemAt: new Date(),
      masteryPercentage: Number(req.body?.masteryPercentage || 100),
      gradeGateSatisfied: true,
    },
  })

  const response = await emitPedagogicalEvent({
    userId: req.user.id,
    type: 'LESSON_COMPLETED',
    skillId: sanitize(req.body?.skillId) || null,
    lessonId,
    payload: req.body?.context && typeof req.body.context === 'object' ? req.body.context : {},
  })

  res.status(200).json({ ok: true, response })
})

export default router
