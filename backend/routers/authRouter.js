import { Router } from 'express'

import prisma from '../lib/prismaClient.js'
import { requireAuth } from '../middlewares/authMiddleware.js'
import { buildLearningOverview, resolveLearningPathId } from '../services/learningBlueprintService.js'

const router = Router()

const sanitize = (value) => String(value ?? '').trim()
const lessonProgressId = (gradeId, topicId, lessonId) => `${gradeId}:${topicId}:${lessonId}`
const normalizePathType = (value) => {
  const normalized = sanitize(value).toUpperCase()
  if (['AUTONOMO', 'AUTONOMOUS', 'AUTO'].includes(normalized)) return 'AUTONOMOUS'
  if (['HYBRID', 'HIBRIDO'].includes(normalized)) return 'HYBRID'
  return 'GRADE'
}

router.post('/sync', requireAuth, async (req, res) => {
  try {
    const { id, email, app_metadata: appMetadata = {}, identities = [] } = req.user
    const fullName = sanitize(req.body?.fullName)
    const gradeId = sanitize(req.body?.gradeId)
    const learningStyle = sanitize(req.body?.learningStyle || 'visual') || 'visual'
    const selectedPathType = normalizePathType(req.body?.selectedPathType)

    if (!fullName || !gradeId) {
      res.status(400).json({ error: 'Faltan datos de nivelacion: nombre o grado.' })
      return
    }

    const gradeExists = await prisma.grade.findUnique({ where: { id: gradeId } })
    if (!gradeExists) {
      res.status(404).json({ error: 'El grado escolar indicado no existe en el motor academico.' })
      return
    }

    const authProvider = sanitize(appMetadata?.provider || identities?.[0]?.provider || 'email') || 'email'
    const learningPathId = await resolveLearningPathId(gradeId, selectedPathType)

    const user = await prisma.user.upsert({
      where: { id },
      update: {
        email,
        fullName,
        gradeId,
        learningStyle,
        language: 'es',
        authProvider,
        selectedPathType,
        learningPathId,
        lastActivityAt: new Date(),
      },
      create: {
        id,
        email,
        fullName,
        gradeId,
        learningStyle,
        language: 'es',
        authProvider,
        selectedPathType,
        learningPathId,
      },
    })

    res.status(200).json({ message: 'Usuario sincronizado correctamente en PostgreSQL', user })
  } catch (error) {
    console.error('[authSync] Error sincronizando usuario:', error)
    res.status(500).json({ error: 'Error interno sincronizando perfil' })
  }
})

router.get('/profile', requireAuth, async (req, res) => {
  try {
    const { id } = req.user

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        grade: true,
        learningPath: true,
        skillProgress: {
          include: { skill: true },
          orderBy: { lastPracticedAt: 'desc' },
          take: 120,
        },
        achievements: {
          include: { achievement: true },
          orderBy: { unlockedAt: 'desc' },
          take: 12,
        },
        lessonStates: {
          include: {
            lesson: {
              select: { id: true, unitId: true, gradeId: true },
            },
          },
          orderBy: { lastProblemAt: 'desc' },
          take: 200,
        },
      },
    })

    if (!user) {
      res.status(404).json({ error: 'Perfil no encontrado. Completa el registro primero.' })
      return
    }

    const overview = await buildLearningOverview(id)
    const problemsSolved = user.skillProgress.reduce((acc, item) => acc + Number(item.problemsSolved || 0), 0)
    const weightedAccuracy = user.skillProgress.reduce((acc, item) => acc + Number(item.accuracy || 0) * Number(item.problemsSolved || 0), 0)
    const accuracy = problemsSolved > 0 ? Math.round(weightedAccuracy / problemsSolved) : 0
    const skillsMastered = user.skillProgress.filter((item) => Number(item.masteryPercentage || 0) >= 80).length
    const completedLessons = user.lessonStates
      .filter((state) => ['COMPLETED', 'MASTERED'].includes(String(state.status || '')))
      .map((state) => lessonProgressId(state.lesson?.gradeId || user.gradeId, state.lesson?.unitId || '', state.lesson?.id || ''))
      .filter(Boolean)

    res.status(200).json({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      grade: user.grade,
      learningPath: user.learningPath,
      selectedPathType: user.selectedPathType,
      authProvider: user.authProvider,
      totalXP: user.totalXP,
      currentLevel: user.currentLevel,
      currentStreak: user.currentStreak,
      lastActivityAt: user.lastActivityAt,
      createdAt: user.createdAt,
      problemsSolved,
      accuracy,
      skillsMastered,
      completedLessons,
      skillProgress: user.skillProgress.map((item) => ({
        skillId: item.skillId,
        skillName: item.skill.name,
        category: item.skill.category,
        domain: item.skill.domain,
        mastery: item.masteryPercentage,
        problemsSolved: item.problemsSolved,
        totalProblems: item.problemsTotal,
        accuracy: Math.round(Number(item.accuracy || 0)),
        failures: item.consecutiveFailures,
      })),
      achievements: user.achievements.map((item) => ({
        id: item.achievementId,
        name: item.achievement.name,
        icon: item.achievement.icon,
        rarity: item.achievement.rarity,
        unlockedAt: item.unlockedAt,
      })),
      overview,
    })
  } catch (error) {
    console.error('[authProfile] Error obteniendo perfil:', error)
    res.status(500).json({ error: 'Error interno obteniendo perfil' })
  }
})

export default router
