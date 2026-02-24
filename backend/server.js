import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import { randomUUID } from 'node:crypto'
import OpenAI from 'openai'

dotenv.config()

const app = express()
const port = Number(process.env.PORT || 4000)
const openAIModel = process.env.OPENAI_MODEL || 'gpt-4o-mini'
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const corsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
      return
    }

    callback(new Error(`CORS blocked origin: ${origin}`))
  },
  methods: ['POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
}

app.use((req, res, next) => {
  const startedAt = Date.now()
  res.on('finish', () => {
    console.log(
      `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${Date.now() - startedAt} ms)`,
    )
  })
  next()
})

app.use(
  cors(corsOptions),
)
app.options('/api/ai-help', cors(corsOptions))
app.use(express.json({ limit: '1mb' }))

const getOpenAIErrorDetails = (error) => {
  return {
    status: Number(error?.status) || null,
    code: error?.code || error?.error?.code || null,
    type: error?.type || error?.error?.type || null,
    message: String(error?.error?.message || error?.message || 'Unknown OpenAI error.'),
    requestId: error?.requestID || null,
  }
}

const getFallbackReasonFromOpenAIError = (details) => {
  if (details.status === 429 || details.code === 'insufficient_quota') {
    return 'openai_quota_or_rate_limit'
  }

  if (details.status && details.status >= 500) {
    return 'openai_provider_error'
  }

  return 'openai_request_failed'
}

const buildFallbackAnswer = ({ question, lessonContext }) => {
  const safeQuestion = String(question || '').trim() || 'pregunta no especificada'
  const safeContext = String(lessonContext || '').trim()
  const contextLine = safeContext ? ` Contexto disponible: ${safeContext}.` : ''

  return `Esta es una explicacion basica para la pregunta: ${safeQuestion}.${contextLine} Revisa los datos, identifica la operacion y resuelve paso a paso.`
}

const buildFallbackPayload = ({ question, lessonContext, requestId, reason }) => {
  return {
    answer: buildFallbackAnswer({ question, lessonContext }),
    requestId,
    source: 'fallback',
    fallbackReason: reason,
  }
}

app.post('/api/ai-help', async (req, res) => {
  const requestId = randomUUID()
  const question = String(req.body?.question ?? '').trim()
  const lessonContext = String(req.body?.lessonContext ?? '').trim()

  const sendFallback = ({ reason, details }) => {
    const payload = buildFallbackPayload({ question, lessonContext, requestId, reason })
    if (details) {
      console.warn(`[ai-help][${requestId}] Fallback enabled reason=${reason}`, details)
    } else {
      console.warn(`[ai-help][${requestId}] Fallback enabled reason=${reason}`)
    }
    return res.status(200).json(payload)
  }

  console.log(
    `[ai-help][${requestId}] Request received origin=${req.headers.origin || 'unknown'} questionLength=${question.length} contextLength=${lessonContext.length}`,
  )

  if (!question) {
    return sendFallback({ reason: 'missing_question' })
  }

  if (!process.env.OPENAI_API_KEY) {
    return sendFallback({ reason: 'missing_openai_api_key' })
  }

  try {
    console.log(`[ai-help][${requestId}] Sending request to OpenAI model=${openAIModel}`)
    const completion = await client.chat.completions.create({
      model: openAIModel,
      temperature: 0.4,
      messages: [
        {
          role: 'system',
          content: 'Eres un tutor experto en matematicas que explica paso a paso.',
        },
        {
          role: 'user',
          content: `Contexto de leccion:\n${lessonContext || 'Sin contexto'}\n\nPregunta:\n${question}`,
        },
      ],
    })

    const answer = completion.choices?.[0]?.message?.content?.trim()
    if (!answer) {
      return sendFallback({ reason: 'empty_openai_answer' })
    }

    console.log(`[ai-help][${requestId}] OpenAI response ok answerLength=${answer.length} model=${openAIModel}`)
    return res.status(200).json({
      answer,
      requestId,
      source: 'openai',
    })
  } catch (error) {
    const details = getOpenAIErrorDetails(error)
    const reason = getFallbackReasonFromOpenAIError(details)
    console.error(`[ai-help][${requestId}] OpenAI request failed`, details)
    return sendFallback({ reason, details })
  }
})

app.use((error, req, res, next) => {
  if (res.headersSent) {
    next(error)
    return
  }

  if (error?.type === 'entity.parse.failed') {
    console.error('[backend] Invalid JSON body:', error.message)
    if (req.path === '/api/ai-help') {
      const requestId = randomUUID()
      console.warn(`[ai-help][${requestId}] Fallback enabled reason=invalid_json`)
      res.status(200).json(
        buildFallbackPayload({
          question: 'JSON invalido',
          lessonContext: '',
          requestId,
          reason: 'invalid_json',
        }),
      )
      return
    }
    res.status(400).json({ error: 'El body debe ser JSON valido.' })
    return
  }

  if (String(error?.message || '').startsWith('CORS blocked origin:')) {
    console.error('[backend] CORS error:', error.message)
    if (req.path === '/api/ai-help') {
      const requestId = randomUUID()
      console.warn(`[ai-help][${requestId}] Fallback enabled reason=cors_blocked`)
      res.status(403).json(
        buildFallbackPayload({
          question: 'No fue posible completar la solicitud por CORS.',
          lessonContext: '',
          requestId,
          reason: 'cors_blocked',
        }),
      )
      return
    }
    res.status(403).json({ error: error.message })
    return
  }

  console.error('[backend] Unhandled error:', error)
  if (req.path === '/api/ai-help') {
    const requestId = randomUUID()
    console.warn(`[ai-help][${requestId}] Fallback enabled reason=unhandled_backend_error`)
    res.status(200).json(
      buildFallbackPayload({
        question: 'No fue posible completar la solicitud.',
        lessonContext: '',
        requestId,
        reason: 'unhandled_backend_error',
      }),
    )
    return
  }

  res.status(500).json({ error: 'Error interno del backend.' })
})

app.listen(port, () => {
  console.log(`[backend] AI server running on port ${port}`)
  console.log(`[backend] Allowed frontend origins: ${allowedOrigins.join(', ')}`)
})
