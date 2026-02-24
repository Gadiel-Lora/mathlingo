import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import { randomUUID } from 'node:crypto'
import net from 'node:net'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const serverFilePath = fileURLToPath(import.meta.url)
const serverDir = dirname(serverFilePath)
const envPath = resolve(serverDir, '.env')
const dotenvResult = dotenv.config({ path: envPath })

const app = express()
const port = Number(process.env.PORT || 4000)
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

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
    ...(reason ? { fallbackReason: reason } : {}),
  }
}

const sendFallbackResponse = ({ res, question, lessonContext, requestId, reason, status = 200, details = null }) => {
  if (details) {
    console.warn(`[ai-help][${requestId}] Fallback reason=${reason}`, details)
  } else {
    console.warn(`[ai-help][${requestId}] Fallback reason=${reason}`)
  }
  return res.status(status).json(
    buildFallbackPayload({
      question,
      lessonContext,
      requestId,
      reason,
    }),
  )
}

app.post('/api/ai-help', (req, res) => {
  const requestId = randomUUID()
  const question = String(req.body?.question ?? '').trim()
  const lessonContext = String(req.body?.lessonContext ?? '').trim()

  console.log(
    `[ai-help][${requestId}] Request received origin=${req.headers.origin || 'unknown'} questionLength=${question.length} contextLength=${lessonContext.length}`,
  )

  if (!question) {
    return sendFallbackResponse({
      res,
      question,
      lessonContext,
      requestId,
      reason: 'missing_question',
    })
  }

  return sendFallbackResponse({
    res,
    question,
    lessonContext,
    requestId,
    reason: 'free_fallback_mode',
  })
})

app.use((error, req, res, next) => {
  if (res.headersSent) {
    next(error)
    return
  }

  if (error?.type === 'entity.parse.failed') {
    console.error('[backend] Invalid JSON body:', error.message)
    if (req.path === '/api/ai-help') {
      return sendFallbackResponse({
        res,
        question: 'JSON invalido',
        lessonContext: '',
        requestId: randomUUID(),
        reason: 'invalid_json',
      })
    }
    res.status(400).json({ error: 'El body debe ser JSON valido.' })
    return
  }

  if (String(error?.message || '').startsWith('CORS blocked origin:')) {
    console.error('[backend] CORS error:', error.message)
    if (req.path === '/api/ai-help') {
      return sendFallbackResponse({
        res,
        question: 'No fue posible completar la solicitud por CORS.',
        lessonContext: '',
        requestId: randomUUID(),
        reason: 'cors_blocked',
        status: 403,
      })
    }
    res.status(403).json({ error: error.message })
    return
  }

  console.error('[backend] Unhandled error:', error)
  if (req.path === '/api/ai-help') {
    return sendFallbackResponse({
      res,
      question: 'No fue posible completar la solicitud.',
      lessonContext: '',
      requestId: randomUUID(),
      reason: 'unhandled_backend_error',
      details: { message: error?.message || 'Unknown error' },
    })
  }

  res.status(500).json({ error: 'Error interno del backend.' })
})

const ensurePortAvailable = (targetPort) => {
  return new Promise((resolve, reject) => {
    const tester = net.createServer()

    tester.once('error', (error) => {
      tester.close()
      if (error?.code === 'EADDRINUSE') {
        reject(new Error(`Port ${targetPort} is already in use by another process.`))
        return
      }
      reject(error)
    })

    tester.once('listening', () => {
      tester.close((closeError) => {
        if (closeError) {
          reject(closeError)
          return
        }
        resolve()
      })
    })

    tester.listen(targetPort, '0.0.0.0')
  })
}

const startServer = async () => {
  console.log(`[backend] Boot file: ${serverFilePath}`)
  console.log(`[backend] Env file: ${envPath}`)
  console.log(`[backend] Boot cwd: ${process.cwd()}`)
  console.log(`[backend] dotenv loaded: ${!dotenvResult.error}`)
  if (dotenvResult.error) {
    console.error(`[backend] dotenv error: ${dotenvResult.error.message}`)
  }
  console.log('[backend] AI mode: gratuito fallback (sin OpenAI)')
  console.log(`[backend] Target port: ${port}`)
  console.log(`[backend] Allowed frontend origins: ${allowedOrigins.join(', ')}`)

  try {
    await ensurePortAvailable(port)
  } catch (error) {
    console.error(`[backend] Startup blocked: ${error.message}`)
    process.exit(1)
  }

  const server = app.listen(port, () => {
    console.log(`[backend] AI server running on port ${port}`)
  })

  server.on('error', (error) => {
    if (error?.code === 'EADDRINUSE') {
      console.error(`[backend] Startup failed: port ${port} already in use.`)
    } else {
      console.error('[backend] Startup failed with server error:', error)
    }
    process.exit(1)
  })
}

void startServer()
