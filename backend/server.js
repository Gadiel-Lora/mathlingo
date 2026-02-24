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

const ollamaBaseUrl = String(process.env.OLLAMA_URL || 'http://localhost:11434')
  .trim()
  .replace(/\/+$/, '')
const ollamaModel = String(process.env.OLLAMA_MODEL || 'llama3').trim() || 'llama3'
const ollamaTimeoutMs = Number(process.env.OLLAMA_TIMEOUT_MS || 10000)
const ollamaGenerateUrl = `${ollamaBaseUrl}/api/generate`

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
  if (!normalized) {
    return null
  }
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

const formatNumber = (value) => {
  if (!Number.isFinite(value)) {
    return 'NaN'
  }
  if (Number.isInteger(value)) {
    return String(value)
  }
  return String(Number(value.toFixed(6)))
}

const detectPercentage = (text) => {
  const source = sanitizeInput(text)
  if (!source) {
    return null
  }

  const patterns = [
    /(-?\d+(?:[.,]\d+)?)\s*%\s*(?:de|del|sobre)\s*(-?\d+(?:[.,]\d+)?)/i,
    /(-?\d+(?:[.,]\d+)?)\s*por\s*ciento\s*(?:de|del|sobre)\s*(-?\d+(?:[.,]\d+)?)/i,
  ]

  for (const pattern of patterns) {
    const match = source.match(pattern)
    if (!match) {
      continue
    }

    const percent = parseNumber(match[1])
    const base = parseNumber(match[2])
    if (percent === null || base === null) {
      continue
    }

    return {
      percent,
      base,
      result: (percent / 100) * base,
    }
  }

  return null
}

const detectRuleOfThree = (text) => {
  const source = sanitizeInput(text)
  if (!source) {
    return null
  }

  const lowered = source.toLowerCase()
  const hasRuleHint =
    lowered.includes('regla de tres') ||
    lowered.includes('proporcion') ||
    lowered.includes('corresponde') ||
    lowered.includes('si ') ||
    lowered.includes('como')

  if (!hasRuleHint) {
    return null
  }

  const values = [...source.matchAll(/-?\d+(?:[.,]\d+)?/g)]
    .map((match) => parseNumber(match[0]))
    .filter((value) => value !== null)

  if (values.length < 3) {
    return null
  }

  const [a, b, c] = values
  if (a === 0) {
    return { a, b, c, result: null, error: 'El primer valor no puede ser 0 en regla de tres.' }
  }

  return {
    a,
    b,
    c,
    result: (b * c) / a,
    error: null,
  }
}

const detectArithmeticExpression = (text) => {
  const source = sanitizeInput(text)
  if (!source) {
    return null
  }

  const match = source.match(/(-?\d+(?:[.,]\d+)?)\s*([+\-*/^xX])\s*(-?\d+(?:[.,]\d+)?)/)
  if (!match) {
    return null
  }

  const left = parseNumber(match[1])
  const right = parseNumber(match[3])
  if (left === null || right === null) {
    return null
  }

  const symbolMap = {
    x: '*',
    X: '*',
  }

  const operator = symbolMap[match[2]] || match[2]
  if (!['+', '-', '*', '/', '^'].includes(operator)) {
    return null
  }

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
      error = 'La potencia produce un resultado no finito.'
    }
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

const detectLinearEquation = (text) => {
  const compact = sanitizeInput(text).toLowerCase().replace(/\s+/g, '').replace(/,/g, '.')
  if (!compact) {
    return null
  }

  const match = compact.match(/^([+-]?\d*(?:\.\d+)?)x([+-]\d+(?:\.\d+)?)?=([+-]?\d+(?:\.\d+)?)$/)
  if (!match) {
    return null
  }

  let coefficientText = match[1]
  if (coefficientText === '' || coefficientText === '+') {
    coefficientText = '1'
  } else if (coefficientText === '-') {
    coefficientText = '-1'
  }

  const coefficient = Number(coefficientText)
  const offset = match[2] ? Number(match[2]) : 0
  const target = Number(match[3])

  if (!Number.isFinite(coefficient) || !Number.isFinite(offset) || !Number.isFinite(target) || coefficient === 0) {
    return null
  }

  const isolated = target - offset
  const x = isolated / coefficient

  return {
    coefficient,
    offset,
    target,
    isolated,
    x,
  }
}

const detectTopicKeyword = (text) => {
  const source = sanitizeInput(text).toLowerCase()
  if (!source) {
    return null
  }

  if (source.includes('fraccion')) {
    return 'fracciones'
  }
  if (source.includes('proporcion')) {
    return 'proporciones'
  }
  if (source.includes('ecuacion') || source.includes('despeja')) {
    return 'ecuaciones'
  }
  if (source.includes('porcentaje')) {
    return 'porcentajes'
  }
  if (source.includes('area') || source.includes('perimetro') || source.includes('geometria')) {
    return 'geometria'
  }

  return null
}

const buildTopicHint = (topic) => {
  if (topic === 'fracciones') {
    return 'Pista: busca denominador comun antes de sumar o restar fracciones.'
  }
  if (topic === 'proporciones') {
    return 'Pista: confirma si la proporcion es directa o inversa antes de despejar.'
  }
  if (topic === 'ecuaciones') {
    return 'Pista: aplica la misma operacion en ambos lados para despejar la variable.'
  }
  if (topic === 'porcentajes') {
    return 'Pista: convertir porcentaje a decimal suele simplificar el calculo.'
  }
  if (topic === 'geometria') {
    return 'Pista: identifica formula y unidades antes de sustituir valores.'
  }
  return 'Pista: identifica datos, operacion y objetivo antes de calcular.'
}

const buildMathFallbackAnswer = ({ question, lessonContext }) => {
  const safeQuestion = sanitizeInput(question) || 'pregunta no especificada'
  const safeContext = sanitizeInput(lessonContext)
  const combinedText = `${safeQuestion}\n${safeContext}`.trim()

  const percentage = detectPercentage(combinedText)
  if (percentage) {
    const decimal = percentage.percent / 100
    return [
      `Pregunta: ${safeQuestion}.`,
      `Paso 1: ${formatNumber(percentage.percent)}% = ${formatNumber(decimal)} en decimal.`,
      `Paso 2: multiplica ${formatNumber(decimal)} x ${formatNumber(percentage.base)}.`,
      `Paso 3: resultado = ${formatNumber(percentage.result)}.`,
      ...(safeContext ? [`Contexto: ${safeContext}.`] : []),
    ].join('\n')
  }

  const ruleOfThree = detectRuleOfThree(combinedText)
  if (ruleOfThree) {
    if (ruleOfThree.error) {
      return [
        `Pregunta: ${safeQuestion}.`,
        'Detecte regla de tres.',
        `Error: ${ruleOfThree.error}`,
        ...(safeContext ? [`Contexto: ${safeContext}.`] : []),
      ].join('\n')
    }

    return [
      `Pregunta: ${safeQuestion}.`,
      'Detecte regla de tres.',
      `Paso 1: plantea ${formatNumber(ruleOfThree.a)} -> ${formatNumber(ruleOfThree.b)} y ${formatNumber(ruleOfThree.c)} -> x.`,
      `Paso 2: x = (${formatNumber(ruleOfThree.b)} x ${formatNumber(ruleOfThree.c)}) / ${formatNumber(ruleOfThree.a)}.`,
      `Paso 3: x = ${formatNumber(ruleOfThree.result)}.`,
      ...(safeContext ? [`Contexto: ${safeContext}.`] : []),
    ].join('\n')
  }

  const arithmeticExpression = detectArithmeticExpression(combinedText)
  if (arithmeticExpression) {
    const solved = solveArithmetic(arithmeticExpression)
    if (solved.error) {
      return [
        `Problema detectado: ${solved.rawExpression}.`,
        `Operacion: ${solved.operation}.`,
        `Error: ${solved.error}`,
        ...(safeContext ? [`Contexto: ${safeContext}.`] : []),
      ].join('\n')
    }

    const symbolMap = { '+': '+', '-': '-', '*': 'x', '/': '/', '^': '^' }
    const symbol = symbolMap[solved.operator] || solved.operator

    return [
      `Problema detectado: ${solved.rawExpression}.`,
      `Paso 1: identifica la ${solved.operation}.`,
      `Paso 2: sustituye ${formatNumber(solved.left)} ${symbol} ${formatNumber(solved.right)}.`,
      `Paso 3: resultado = ${formatNumber(solved.result)}.`,
      ...(safeContext ? [`Contexto: ${safeContext}.`] : []),
    ].join('\n')
  }

  const linearEquation = detectLinearEquation(combinedText)
  if (linearEquation) {
    const offsetSymbol = linearEquation.offset >= 0 ? '-' : '+'
    return [
      `Pregunta: ${safeQuestion}.`,
      'Detecte ecuacion lineal.',
      `Paso 1: pasa termino independiente: ${formatNumber(linearEquation.target)} ${offsetSymbol} ${formatNumber(Math.abs(linearEquation.offset))} = ${formatNumber(linearEquation.isolated)}.`,
      `Paso 2: divide por ${formatNumber(linearEquation.coefficient)}.`,
      `Paso 3: x = ${formatNumber(linearEquation.x)}.`,
      ...(safeContext ? [`Contexto: ${safeContext}.`] : []),
    ].join('\n')
  }

  const topic = detectTopicKeyword(combinedText)
  const hint = buildTopicHint(topic)

  return [
    `Pregunta: ${safeQuestion}.`,
    hint,
    'Paso 1: separa los datos conocidos.',
    'Paso 2: traduce el enunciado a una expresion matematica.',
    'Paso 3: resuelve y verifica reemplazando el resultado.',
    ...(safeContext ? [`Contexto: ${safeContext}.`] : []),
  ].join('\n')
}

const buildFallbackPayload = ({ answer, requestId, fallbackReason }) => {
  return {
    answer,
    source: 'fallback',
    requestId,
    fallbackReason,
  }
}

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

const buildOllamaPrompt = (question, lessonContext) => {
  const safeQuestion = sanitizeInput(question)
  const safeContext = sanitizeInput(lessonContext)

  return [
    'Eres un tutor de matematicas para estudiantes de habla hispana.',
    'Responde en espanol claro con pasos numerados.',
    safeContext ? `Contexto de la leccion: ${safeContext}` : 'Contexto de la leccion: no disponible.',
    `Pregunta del estudiante: ${safeQuestion}`,
    'Si faltan datos, dilo de forma breve y pide la informacion minima necesaria.',
  ].join('\n')
}

const createOllamaError = (type, message, details = {}) => {
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

  const code = error?.cause?.code || error?.code || null
  if (['ECONNREFUSED', 'ENOTFOUND', 'EHOSTUNREACH', 'ECONNRESET'].includes(code)) {
    return createOllamaError('ollama_not_running', 'Could not connect to Ollama.', {
      code,
      message: error?.message || 'fetch failed',
    })
  }

  const message = String(error?.message || 'Unknown Ollama error')
  if (message.toLowerCase().includes('fetch failed')) {
    return createOllamaError('ollama_not_running', 'Could not connect to Ollama.', {
      code,
      message,
    })
  }

  return createOllamaError('request_failed', message, {
    code,
    cause: error?.cause ? String(error.cause) : null,
  })
}

const callOllama = async (question, lessonContext) => {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => {
    controller.abort()
  }, ollamaTimeoutMs)

  try {
    const response = await fetch(ollamaGenerateUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: ollamaModel,
        prompt: buildOllamaPrompt(question, lessonContext),
        stream: false,
      }),
      signal: controller.signal,
    })

    const rawBody = await response.text()
    let payload = null

    if (rawBody) {
      try {
        payload = JSON.parse(rawBody)
      } catch (parseError) {
        throw createOllamaError('invalid_json', 'Ollama returned invalid JSON.', {
          status: response.status,
          rawBody,
          parseError: parseError.message,
        })
      }
    }

    if (!response.ok) {
      const ollamaErrorText = String(payload?.error || rawBody || '').toLowerCase()
      if (
        /model/.test(ollamaErrorText) &&
        (/not found/.test(ollamaErrorText) || /pull/.test(ollamaErrorText) || /missing/.test(ollamaErrorText))
      ) {
        throw createOllamaError('model_not_installed', `Model "${ollamaModel}" is not installed in Ollama.`, {
          status: response.status,
          ollamaError: payload?.error || rawBody || null,
        })
      }

      throw createOllamaError('http_error', `Ollama HTTP ${response.status}`, {
        status: response.status,
        ollamaError: payload?.error || rawBody || null,
      })
    }

    if (typeof payload?.error === 'string' && payload.error.trim()) {
      const normalizedError = payload.error.toLowerCase()
      if (
        /model/.test(normalizedError) &&
        (/not found/.test(normalizedError) || /pull/.test(normalizedError) || /missing/.test(normalizedError))
      ) {
        throw createOllamaError('model_not_installed', `Model "${ollamaModel}" is not installed in Ollama.`, {
          ollamaError: payload.error,
        })
      }

      throw createOllamaError('ollama_error', payload.error, { ollamaError: payload.error })
    }

    const answer = typeof payload?.response === 'string' ? payload.response.trim() : ''
    if (!answer) {
      throw createOllamaError('empty_response', 'Ollama returned an empty response.', {
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
      answer: 'Necesito una pregunta para ayudarte. Escribe una consulta matematica concreta.',
      requestId,
      reason: 'missing_question',
    })
  }

  console.log(
    `[ai-help][${requestId}] Intentando Ollama model=${ollamaModel} url=${ollamaGenerateUrl} timeoutMs=${ollamaTimeoutMs}`,
  )

  try {
    const ollamaAnswer = await callOllama(question, lessonContext)
    console.log(`[ai-help][${requestId}] Ollama OK`)

    return res.status(200).json({
      answer: ollamaAnswer,
      source: 'ollama',
      requestId,
    })
  } catch (error) {
    console.warn(`[ai-help][${requestId}] Ollama fallo -> fallback`, {
      type: error?.type || 'unknown',
      message: error?.message || 'unknown',
      details: error?.details || null,
    })

    const fallbackAnswer = buildMathFallbackAnswer({ question, lessonContext })

    return sendFallbackResponse({
      res,
      answer: fallbackAnswer,
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
          'No pude leer el JSON enviado. Verifica el formato y vuelve a intentar con { "question": "...", "lessonContext": "..." }.',
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

  console.log(`[backend] AI mode: ollama (${ollamaModel}) -> fallback local (sin OpenAI)`)
  console.log(`[backend] Ollama URL: ${ollamaGenerateUrl}`)
  console.log(`[backend] Ollama timeout: ${ollamaTimeoutMs} ms`)
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
