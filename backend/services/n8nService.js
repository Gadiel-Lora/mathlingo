import prisma from '../lib/prismaClient.js'

const baseUrl = String(process.env.N8N_BASE_URL || '').trim().replace(/\/+$/, '')
const apiKey = String(process.env.N8N_API_KEY || '').trim()
const sharedSecret = String(process.env.N8N_WEBHOOK_SECRET || '').trim()
const timeoutMs = Number(process.env.N8N_TIMEOUT_MS || 30000)

const webhookPaths = {
  tutor: String(process.env.N8N_WEBHOOK_TUTOR || '/webhook/mathlingo-tutor').trim(),
  learningEvent: String(process.env.N8N_WEBHOOK_LEARNING_EVENT || '/webhook/learning-event').trim(),
  diagnostic: String(process.env.N8N_WEBHOOK_DIAGNOSTIC || '/webhook/diagnostic-trigger').trim(),
  hints: String(process.env.N8N_WEBHOOK_HINTS || '/webhook/hint-request').trim(),
  feedback: String(process.env.N8N_WEBHOOK_FEEDBACK || '/webhook/tutor-feedback').trim(),
}

const routeByEventType = {
  ANSWER_SUBMITTED: 'learningEvent',
  SKILL_FAILED_TWICE: 'diagnostic',
  HINT_REQUESTED: 'hints',
  LESSON_COMPLETED: 'learningEvent',
  MASTERY_UPDATED: 'learningEvent',
  DIAGNOSTIC_TRIGGER: 'diagnostic',
  TUTOR_FEEDBACK: 'feedback',
}

const joinUrl = (path) => `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`

const parseResponseBody = async (response) => {
  const raw = await response.text()
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return { raw }
  }
}

export const verifyN8nSecret = (candidate) => {
  if (!sharedSecret) return false
  return String(candidate || '').trim() === sharedSecret
}

export const createPedagogicalEvent = async ({ userId, type, skillId = null, lessonId = null, problemAttemptId = null, payload = {} }) => {
  return prisma.pedagogicalEvent.create({
    data: {
      userId,
      type,
      skillId,
      lessonId,
      problemAttemptId,
      payload,
      deliveryStatus: 'PENDING',
    },
  })
}

export const dispatchPedagogicalEvent = async (event) => {
  const routeKey = routeByEventType[event.type] || 'learningEvent'
  const path = webhookPaths[routeKey]

  if (!baseUrl || !path) {
    return { skipped: true, reason: 'n8n_not_configured', routeKey }
  }

  const endpoint = joinUrl(path)
  const requestBody = {
    eventId: event.id,
    eventType: event.type,
    createdAt: event.createdAt,
    routeKey,
    payload: event.payload,
  }

  const dispatch = await prisma.n8nDispatch.create({
    data: {
      pedagogicalEventId: event.id,
      workflowKey: routeKey,
      endpoint,
      status: 'PENDING',
      requestBody,
    },
  })

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        ...(sharedSecret ? { 'x-mathlingo-webhook-secret': sharedSecret } : {}),
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    })

    const responseBody = await parseResponseBody(response)
    const status = response.ok ? 'DISPATCHED' : 'FAILED'

    await prisma.n8nDispatch.update({
      where: { id: dispatch.id },
      data: {
        status,
        statusCode: response.status,
        responseBody,
        errorMessage: response.ok ? null : `HTTP ${response.status}`,
      },
    })

    await prisma.pedagogicalEvent.update({
      where: { id: event.id },
      data: {
        deliveryStatus: status,
        processedAt: new Date(),
      },
    })

    return { skipped: false, status, responseBody, routeKey }
  } catch (error) {
    const message = error?.name === 'AbortError' ? `Timeout after ${timeoutMs} ms` : String(error?.message || error)

    await prisma.n8nDispatch.update({
      where: { id: dispatch.id },
      data: {
        status: 'FAILED',
        errorMessage: message,
      },
    })

    await prisma.pedagogicalEvent.update({
      where: { id: event.id },
      data: {
        deliveryStatus: 'FAILED',
        processedAt: new Date(),
      },
    })

    return { skipped: false, status: 'FAILED', error: message, routeKey }
  } finally {
    clearTimeout(timeoutId)
  }
}

export const emitPedagogicalEvent = async (input) => {
  const event = await createPedagogicalEvent(input)
  const dispatch = await dispatchPedagogicalEvent(event)
  return { event, dispatch }
}
