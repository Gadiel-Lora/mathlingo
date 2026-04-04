import { Router } from 'express'

import prisma from '../lib/prismaClient.js'
import { verifyN8nSecret } from '../services/n8nService.js'

const router = Router()

const sanitize = (value) => String(value ?? '').trim()

const ensureSecret = (req, res, next) => {
  const configured = Boolean(String(process.env.N8N_WEBHOOK_SECRET || '').trim())
  if (!configured) {
    next()
    return
  }

  const provided = req.headers['x-mathlingo-webhook-secret']
  if (!verifyN8nSecret(provided)) {
    res.status(401).json({ error: 'Secret de webhook invalido.' })
    return
  }

  next()
}

const persistTutorFeedback = async ({ type, payload }) => {
  const userId = sanitize(payload?.userId || payload?.studentId)
  const eventId = sanitize(payload?.eventId)
  const lessonId = sanitize(payload?.lessonId) || null
  const skillId = sanitize(payload?.skillId) || null
  const tutorResponse = sanitize(payload?.tutorResponse || payload?.response)

  if (!userId || !tutorResponse) {
    return { error: 'userId/studentId y tutorResponse son obligatorios.' }
  }

  const conversation = await prisma.tutorConversation.create({
    data: {
      userId,
      problem: sanitize(payload?.problem || payload?.prompt || 'Contexto no especificado'),
      studentAnswer: sanitize(payload?.studentAnswer || payload?.lastStudentAnswer || ''),
      attemptCount: Number(payload?.attemptCount || payload?.studentAttempts || 0),
      tutorResponse,
      pedagogicalFocus: sanitize(payload?.pedagogicalFocus || type),
      vibe: sanitize(payload?.vibe || 'socratico'),
      provider: 'N8N',
      interventionLevel: sanitize(payload?.interventionLevel || 'SUBTLE').toUpperCase(),
      skillId,
      lessonId,
    },
  })

  const intervention = await prisma.tutorIntervention.create({
    data: {
      userId,
      skillId,
      lessonId,
      pedagogicalEventId: eventId || null,
      provider: 'N8N',
      level: sanitize(payload?.interventionLevel || (type === 'diagnostic' ? 'DIAGNOSTIC' : 'CONCEPTUAL')).toUpperCase(),
      prompt: sanitize(payload?.prompt || payload?.problem || 'Sin prompt explicito'),
      response: tutorResponse,
    },
  })

  if (eventId) {
    await prisma.pedagogicalEvent.update({
      where: { id: eventId },
      data: {
        deliveryStatus: 'ACKNOWLEDGED',
        processedAt: new Date(),
      },
    }).catch(() => null)
  }

  return { conversation, intervention }
}

router.get('/health', (_req, res) => {
  res.status(200).json({ ok: true, service: 'n8n-callbacks' })
})

router.post('/tutor-feedback', ensureSecret, async (req, res) => {
  const result = await persistTutorFeedback({ type: 'feedback', payload: req.body })
  if (result.error) {
    res.status(400).json({ error: result.error })
    return
  }

  res.status(200).json({ ok: true, result })
})

router.post('/diagnostic-feedback', ensureSecret, async (req, res) => {
  const result = await persistTutorFeedback({ type: 'diagnostic', payload: req.body })
  if (result.error) {
    res.status(400).json({ error: result.error })
    return
  }

  res.status(200).json({ ok: true, result })
})

export default router
