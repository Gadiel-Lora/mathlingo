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
const ollamaBaseUrl = 'http://localhost:11434'
const ollamaGenerateUrl = `${ollamaBaseUrl}/api/generate`
const ollamaModel = 'llama3'
const ollamaTimeoutMs = 10000
const ollamaTemperature = Number(process.env.OLLAMA_TEMPERATURE || 0.2)

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

app.use(cors(corsOptions))
app.options('/api/ai-help', cors(corsOptions))
app.use(express.json({ limit: '1mb' }))

const sanitizeInput = (value) => String(value ?? '').trim()

const parseNumber = (value) => {
  const normalized = sanitizeInput(value).replace(',', '.')
  if (!normalized) return null
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

const formatNumber = (value) => {
  if (!Number.isFinite(value)) return 'NaN'
  if (Number.isInteger(value)) return String(value)
  return String(Number(value.toFixed(6)))
}

const detectArithmeticExpression = (text) => {
  const source = sanitizeInput(text)
  if (!source) return null

  const match = source.match(/(-?\d+(?:[.,]\d+)?)\s*([+\-*/^xX])\s*(-?\d+(?:[.,]\d+)?)/)
  if (!match) return null

  const left = parseNumber(match[1])
  const right = parseNumber(match[3])
  if (left === null || right === null) return null

  const symbolMap = {
    x: '*',
    X: '*',
  }
  const operator = symbolMap[match[2]] || match[2]

  if (!['+', '-', '*', '/', '^'].includes(operator)) return null

  return {
    left,
    right,
    operator,
    rawExpression: `${match[1]} ${match[2]} ${match[3]}`,
  }
}

const solveArithmetic = ({ left, right, operator, rawExpression }) => {
  let result = null
  let error = null
  let operation = 'operacion'

  if (operator === '+') {
    operation = 'suma'
    result = left + right
  } else if (operator === '-') {
    operation = 'resta'
    result = left - right
  } else if (operator === '*') {
    operation = 'multiplicacion'
    result = left * right
  } else if (operator === '/') {
    operation = 'division'
    if (right === 0) {
      error = 'No se puede dividir entre 0.'
    } else {
      result = left / right
    }
  } else if (operator === '^') {
    operation = 'potencia'
    result = Math.pow(left, right)
    if (!Number.isFinite(result)) {
      error = 'La potencia produce un resultado demasiado grande.'
    }
  } else {
    error = 'Operacion no soportada.'
  }

  return {
    left,
    right,
    operator,
    operation,
    result,
    error,
    rawExpression,
  }
}

const detectRuleOfThree = (text) => {
  const source = sanitizeInput(text)
  if (!source) return null

  const lowered = source.toLowerCase()
  const hasHint =
    lowered.includes('regla de tres') ||
    lowered.includes('proporcion') ||
    lowered.includes('corresponde') ||
    lowered.includes('como')

  if (!hasHint) return null

  const values = [...source.matchAll(/-?\d+(?:[.,]\d+)?/g)]
    .map((match) => parseNumber(match[0]))
    .filter((value) => value !== null)

  if (values.length < 3) return null

  const [a, b, c] = values
  if (a === 0) {
    return { a, b, c, result: null, error: 'El primer valor no puede ser 0 para aplicar regla de tres.' }
  }

  const result = (b * c) / a
  return { a, b, c, result, error: null }
}

const detectPercentage = (text) => {
  const source = sanitizeInput(text)
  if (!source) return null

  const patterns = [
    /(-?\d+(?:[.,]\d+)?)\s*%\s*(?:de|del)\s*(-?\d+(?:[.,]\d+)?)/i,
    /(-?\d+(?:[.,]\d+)?)\s*por\s*ciento\s*(?:de|del)\s*(-?\d+(?:[.,]\d+)?)/i,
  ]

  for (const pattern of patterns) {
    const match = source.match(pattern)
    if (!match) continue

    const percent = parseNumber(match[1])
    const base = parseNumber(match[2])
    if (percent === null || base === null) continue

    return {
      percent,
      base,
      result: (percent / 100) * base,
    }
  }

  return null
}

const detectTopicKeyword = (text) => {
  const source = sanitizeInput(text).toLowerCase()
  if (!source) return null

  if (source.includes('fraccion')) return 'fracciones'
  if (source.includes('proporcion')) return 'proporciones'
  if (source.includes('ecuacion')) return 'ecuacion'
  if (source.includes('porcentaje')) return 'porcentaje'
  if (source.includes('geometria')) return 'geometria'

  return null
}

const buildStepByStepExplanation = ({
  mode,
  question,
  lessonContext,
  arithmetic = null,
  ruleOfThree = null,
  percentage = null,
  topic = null,
}) => {
  const safeQuestion = sanitizeInput(question) || 'pregunta no especificada'
  const safeContext = sanitizeInput(lessonContext)

  if (mode === 'arithmetic' && arithmetic) {
    const symbolMap = {
      '+': '+',
      '-': '-',
      '*': 'x',
      '/': '/',
      '^': '^',
    }
    const symbol = symbolMap[arithmetic.operator] || arithmetic.operator

    if (arithmetic.error) {
      return [
        `Problema detectado: ${arithmetic.rawExpression}.`,
        `Paso 1: Identifico una ${arithmetic.operation}.`,
        `Paso 2: Se detecta este problema: ${arithmetic.error}`,
        'Resultado: no se puede resolver con los valores dados.',
      ].join('\n')
    }

    return [
      `Problema detectado: ${arithmetic.rawExpression}.`,
      `Paso 1: Identifico una ${arithmetic.operation}.`,
      `Paso 2: Sustituyo valores: ${formatNumber(arithmetic.left)} ${symbol} ${formatNumber(arithmetic.right)}.`,
      `Paso 3: Calculo el resultado: ${formatNumber(arithmetic.result)}.`,
      `Resultado final: ${formatNumber(arithmetic.result)}.`,
    ].join('\n')
  }

  if (mode === 'rule_of_three' && ruleOfThree) {
    if (ruleOfThree.error) {
      return [
        `Pregunta: ${safeQuestion}.`,
        'Paso 1: Intento aplicar regla de tres.',
        `Paso 2: ${ruleOfThree.error}`,
        'Resultado: no se puede resolver hasta corregir los datos.',
      ].join('\n')
    }

    return [
      `Pregunta: ${safeQuestion}.`,
      `Paso 1: Identifico proporcion: ${formatNumber(ruleOfThree.a)} -> ${formatNumber(ruleOfThree.b)} y ${formatNumber(ruleOfThree.c)} -> x.`,
      `Paso 2: Aplico formula: x = (${formatNumber(ruleOfThree.b)} x ${formatNumber(ruleOfThree.c)}) / ${formatNumber(ruleOfThree.a)}.`,
      `Paso 3: Calculo x = ${formatNumber(ruleOfThree.result)}.`,
      `Resultado final: x = ${formatNumber(ruleOfThree.result)}.`,
    ].join('\n')
  }

  if (mode === 'percentage' && percentage) {
    const decimal = percentage.percent / 100
    return [
      `Pregunta: ${safeQuestion}.`,
      `Paso 1: Convierto porcentaje a decimal: ${formatNumber(percentage.percent)}% = ${formatNumber(decimal)}.`,
      `Paso 2: Multiplico por la base: ${formatNumber(decimal)} x ${formatNumber(percentage.base)}.`,
      `Paso 3: Resultado: ${formatNumber(percentage.result)}.`,
      `Resultado final: ${formatNumber(percentage.percent)}% de ${formatNumber(percentage.base)} es ${formatNumber(percentage.result)}.`,
    ].join('\n')
  }

  if (mode === 'topic' && topic) {
    const topicMap = {
      fracciones: [
        'Tema detectado: fracciones.',
        'Paso 1: Verifica que los denominadores sean distintos de 0.',
        'Paso 2: Usa denominador comun para sumar o restar.',
        'Paso 3: Simplifica el resultado final.',
      ],
      proporciones: [
        'Tema detectado: proporciones.',
        'Paso 1: Escribe la relacion entre magnitudes.',
        'Paso 2: Define si la proporcion es directa o inversa.',
        'Paso 3: Despeja la variable faltante.',
      ],
      ecuacion: [
        'Tema detectado: ecuacion.',
        'Paso 1: Agrupa terminos semejantes.',
        'Paso 2: Aplica operaciones inversas en ambos lados.',
        'Paso 3: Despeja la variable y verifica.',
      ],
      porcentaje: [
        'Tema detectado: porcentaje.',
        'Paso 1: Convierte porcentaje a decimal (divide entre 100).',
        'Paso 2: Multiplica por la cantidad base.',
        'Paso 3: Interpreta el resultado en contexto.',
      ],
      geometria: [
        'Tema detectado: geometria.',
        'Paso 1: Identifica la figura y los datos dados.',
        'Paso 2: Elige la formula adecuada.',
        'Paso 3: Sustituye unidades correctas y calcula.',
      ],
    }

    const lines = topicMap[topic] || [
      'Tema matematico detectado.',
      'Paso 1: Organiza los datos.',
      'Paso 2: Identifica la operacion o formula.',
      'Paso 3: Resuelve y verifica.',
    ]

    return [
      `Pregunta: ${safeQuestion}.`,
      ...lines,
      ...(safeContext ? [`Contexto de leccion: ${safeContext}.`] : []),
    ].join('\n')
  }

  return [
    `Pregunta: ${safeQuestion}.`,
    'No detecte una operacion exacta para resolver automaticamente.',
    'Guia sugerida:',
    '1) Escribe la operacion con numeros y simbolos claros.',
    '2) Indica si es suma, resta, multiplicacion, division, porcentaje o regla de tres.',
    '3) Agrega datos concretos para poder resolver paso a paso.',
    ...(safeContext ? [`Contexto recibido: ${safeContext}.`] : []),
  ].join('\n')
}

const buildMathFallbackAnswer = ({ question, lessonContext }) => {
  const safeQuestion = sanitizeInput(question) || 'pregunta no especificada'
  const safeContext = sanitizeInput(lessonContext)
  const analysisText = `${safeQuestion}\n${safeContext}`.trim()

  const percentage = detectPercentage(analysisText)
  if (percentage) {
    return buildStepByStepExplanation({
      mode: 'percentage',
      question: safeQuestion,
      lessonContext: safeContext,
      percentage,
    })
  }

  const ruleOfThree = detectRuleOfThree(analysisText)
  if (ruleOfThree) {
    return buildStepByStepExplanation({
      mode: 'rule_of_three',
      question: safeQuestion,
      lessonContext: safeContext,
      ruleOfThree,
    })
  }

  const arithmeticExpression = detectArithmeticExpression(analysisText)
  if (arithmeticExpression) {
    const arithmetic = solveArithmetic(arithmeticExpression)
    return buildStepByStepExplanation({
      mode: 'arithmetic',
      question: safeQuestion,
      lessonContext: safeContext,
      arithmetic,
    })
  }

  const topic = detectTopicKeyword(analysisText)
  if (topic) {
    return buildStepByStepExplanation({
      mode: 'topic',
      question: safeQuestion,
      lessonContext: safeContext,
      topic,
    })
  }

  return buildStepByStepExplanation({
    mode: 'general',
    question: safeQuestion,
    lessonContext: safeContext,
  })
}

const buildFallbackPayload = ({ answer, requestId, fallbackReason }) => ({
  answer,
  source: 'fallback',
  requestId,
  fallbackReason,
})

const sendFallbackResponse = ({ res, answer, requestId, reason, status = 200, details = null }) => {
  const safeAnswer = sanitizeInput(answer) || 'No fue posible generar una explicacion.'
  const safeReason = sanitizeInput(reason) || 'fallback_default'

  if (details) {
    console.warn(`[ai-help][${requestId}] Fallback reason=${safeReason}`, details)
  } else {
    console.warn(`[ai-help][${requestId}] Fallback reason=${safeReason}`)
  }

  return res.status(status).json(
    buildFallbackPayload({
      answer: safeAnswer,
      requestId,
      fallbackReason: safeReason,
    }),
  )
}

const buildTutorPrompt = (question, lessonContext) => {
  const safeQuestion = sanitizeInput(question) || 'pregunta no especificada'
  const safeContext = sanitizeInput(lessonContext)

  return [
    'Eres un tutor experto en matematicas.',
    'Nivel: educacion basica y secundaria.',
    'Estilo: claro, estructurado, pedagogico y directo.',
    '',
    'Reglas obligatorias:',
    '1) Explica siempre paso a paso con lista numerada.',
    '2) Nunca des solo el resultado final.',
    '3) Usa lenguaje sencillo.',
    '4) Si la pregunta es una operacion simple, igual explica los pasos.',
    '5) Si la pregunta es conceptual, explica el concepto y agrega un ejemplo corto.',
    '6) Evita respuestas largas, texto redundante o explicaciones abstractas sin ejemplo.',
    '',
    'Formato obligatorio de salida:',
    'Paso 1: ...',
    'Paso 2: ...',
    'Resultado: ...',
    'Resumen: ...',
    '',
    safeContext ? `Contexto de leccion: ${safeContext}` : 'Contexto de leccion: no disponible.',
    `Pregunta del estudiante: ${safeQuestion}`,
  ].join('\n')
}

const createOllamaError = (type, message, details = null) => {
  const error = new Error(message)
  error.type = type
  error.details = details
  return error
}

const normalizeOllamaError = (error) => {
  if (error?.type) {
    return error
  }

  if (error?.name === 'AbortError') {
    return createOllamaError('timeout', `Ollama timeout after ${ollamaTimeoutMs} ms`)
  }

  const message = String(error?.message || '').toLowerCase()
  const code = error?.cause?.code || error?.code || null
  if (
    ['ECONNREFUSED', 'ENOTFOUND', 'EHOSTUNREACH', 'ECONNRESET'].includes(code) ||
    message.includes('fetch failed')
  ) {
    return createOllamaError('ollama_not_running', 'Ollama no esta disponible.', {
      code,
      message: error?.message || 'fetch failed',
    })
  }

  return createOllamaError('request_failed', error?.message || 'Ollama request failed.', {
    code,
    cause: error?.cause ? String(error.cause) : null,
  })
}

const callOllama = async (question, lessonContext) => {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), ollamaTimeoutMs)

  try {
    const response = await fetch(ollamaGenerateUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: ollamaModel,
        prompt: buildTutorPrompt(question, lessonContext),
        stream: false,
        options: {
          temperature: ollamaTemperature,
        },
      }),
      signal: controller.signal,
    })

    const rawBody = await response.text()
    let payload = null

    if (rawBody) {
      try {
        payload = JSON.parse(rawBody)
      } catch (parseError) {
        throw createOllamaError('invalid_json', 'Ollama devolvio JSON invalido.', {
          status: response.status,
          parseError: parseError.message,
        })
      }
    }

    if (!response.ok) {
      const errorText = String(payload?.error || rawBody || '').toLowerCase()
      if (
        /model/.test(errorText) &&
        (/not found/.test(errorText) || /missing/.test(errorText) || /pull/.test(errorText))
      ) {
        throw createOllamaError('model_not_installed', `Modelo ${ollamaModel} no instalado en Ollama.`, {
          status: response.status,
          ollamaError: payload?.error || rawBody || null,
        })
      }

      throw createOllamaError('http_error', `Ollama HTTP ${response.status}.`, {
        status: response.status,
        ollamaError: payload?.error || rawBody || null,
      })
    }

    if (typeof payload?.error === 'string' && payload.error.trim()) {
      const errorText = payload.error.toLowerCase()
      if (
        /model/.test(errorText) &&
        (/not found/.test(errorText) || /missing/.test(errorText) || /pull/.test(errorText))
      ) {
        throw createOllamaError('model_not_installed', `Modelo ${ollamaModel} no instalado en Ollama.`, {
          ollamaError: payload.error,
        })
      }
      throw createOllamaError('ollama_error', payload.error, {
        ollamaError: payload.error,
      })
    }

    const answer = typeof payload?.response === 'string' ? payload.response.trim() : ''
    if (!answer) {
      throw createOllamaError('empty_response', 'Ollama devolvio respuesta vacia.', {
        payloadKeys: payload ? Object.keys(payload) : [],
      })
    }

    return answer
  } catch (error) {
    throw normalizeOllamaError(error)
  } finally {
    clearTimeout(timeoutId)
  }
}

app.post('/api/ai-help', async (req, res) => {
  const requestId = randomUUID()
  const question = sanitizeInput(req.body?.question)
  const lessonContext = sanitizeInput(req.body?.lessonContext)

  console.log(
    `[ai-help][${requestId}] Request received origin=${req.headers.origin || 'unknown'} questionLength=${question.length} contextLength=${lessonContext.length}`,
  )

  if (!question) {
    return sendFallbackResponse({
      res,
      answer: 'Necesito una pregunta para ayudarte. Escribe una operacion matematica concreta.',
      requestId,
      reason: 'missing_question',
    })
  }

  console.log(
    `[ai-help][${requestId}] Intentando Ollama model=${ollamaModel} url=${ollamaGenerateUrl} timeoutMs=${ollamaTimeoutMs}`,
  )

  try {
    const answer = await callOllama(question, lessonContext)
    console.log(`[ai-help][${requestId}] Ollama OK`)
    return res.status(200).json({
      answer,
      source: 'ollama',
      requestId,
    })
  } catch (error) {
    console.warn(`[ai-help][${requestId}] Ollama fallo -> fallback`, {
      type: error?.type || 'unknown',
      message: error?.message || 'unknown',
      details: error?.details || null,
    })

    return sendFallbackResponse({
      res,
      answer: buildMathFallbackAnswer({ question, lessonContext }),
      requestId,
      reason: 'ollama_unavailable',
      details: {
        ollamaErrorType: error?.type || 'unknown',
        ollamaMessage: error?.message || 'unknown',
      },
    })
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
      return sendFallbackResponse({
        res,
        answer:
          'No pude leer el JSON enviado. Usa el formato { "question": "...", "lessonContext": "..." }.',
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
        answer: 'Solicitud bloqueada por CORS para este origen.',
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
      answer: 'No fue posible completar la solicitud en este momento.',
      requestId: randomUUID(),
      reason: 'unhandled_backend_error',
      details: { message: error?.message || 'Unknown error' },
      status: 500,
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
  console.log(`[backend] AI mode: ollama (${ollamaModel}) -> fallback matematico local`)
  console.log(`[backend] Ollama endpoint: ${ollamaGenerateUrl}`)
  console.log(`[backend] Ollama timeout: ${ollamaTimeoutMs} ms`)
  console.log(`[backend] Ollama temperature: ${ollamaTemperature}`)
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
