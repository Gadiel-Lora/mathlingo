import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import { randomUUID } from 'node:crypto'
import net from 'node:net'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import academicRouter from './controllers/academicController.js'
import adminRouter from './routers/adminRouter.js'
import authRouter from './routers/authRouter.js'
import learningRouter from './routers/learningRouter.js'
import n8nRouter from './routers/n8nRouter.js'
import { CURRICULUM, getQuestionTypeByDifficulty } from './curriculum.js'
import { requireAuth } from './middlewares/authMiddleware.js';

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

const MAX_ATTEMPTS = 3
const XP_PER_CORRECT = Number(process.env.XP_PER_CORRECT || 10)
const ollamaBaseUrl = String(process.env.OLLAMA_URL || 'http://localhost:11434')
  .trim()
  .replace(/\/+$/, '')
const ollamaGenerateUrl = `${ollamaBaseUrl}/api/generate`
const ollamaModel = String(process.env.OLLAMA_MODEL || 'llama3').trim() || 'llama3'
const ollamaTimeoutMs = Number(process.env.OLLAMA_TIMEOUT_MS || 10000)
const ollamaTemperature = Number(process.env.OLLAMA_TEMPERATURE || 0.2)

const questionStateStore = new Map()

const corsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
      return
    }

    callback(new Error(`CORS blocked origin: ${origin}`))
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-mathlingo-webhook-secret'],
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
app.options('/api/curriculum', cors(corsOptions))
app.options('/api/question/state', cors(corsOptions))
app.options('/api/question/help', cors(corsOptions))
app.options('/api/question/submit', cors(corsOptions))
app.options('/api/learning', cors(corsOptions))
app.options('/api/n8n', cors(corsOptions))
app.use(express.json({ limit: '1mb' }))
app.use('/api/academic', academicRouter)
app.use('/api/admin', adminRouter)
app.use('/api/auth', authRouter)
app.use('/api/learning', learningRouter)
app.use('/api/n8n', n8nRouter)

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

const sanitizeAiAnswer = (value) => {
  return String(value ?? '')
    .replace(/contexto disponible\s*:?/gi, '')
    .replace(/metadata interna\s*:?/gi, '')
    .trim()
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
    return {
      a,
      b,
      c,
      result: null,
      error: 'El primer valor no puede ser 0 para aplicar regla de tres.',
    }
  }

  return {
    a,
    b,
    c,
    result: (b * c) / a,
    error: null,
  }
}

const detectPercentage = (text) => {
  const source = sanitizeInput(text)
  if (!source) return null

  const patterns = [
    /(-?\d+(?:[.,]\d+)?)\s*%\s*(?:de|del|sobre)\s*(-?\d+(?:[.,]\d+)?)/i,
    /(-?\d+(?:[.,]\d+)?)\s*por\s*ciento\s*(?:de|del|sobre)\s*(-?\d+(?:[.,]\d+)?)/i,
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

const buildHintFallbackAnswer = ({ question, lessonContext }) => {
  const safeQuestion = sanitizeInput(question)
  const safeContext = sanitizeInput(lessonContext)
  const analysisText = `${safeQuestion}\n${safeContext}`

  const arithmetic = detectArithmeticExpression(analysisText)
  if (arithmetic) {
    return [
      'Pista: identifica primero la operacion y reescribe los valores con claridad antes de calcular.',
      'Pregunta guiada: que operacion debes hacer primero y por que?',
    ].join('\n')
  }

  const percentage = detectPercentage(analysisText)
  if (percentage) {
    return [
      'Pista: convierte el porcentaje a decimal antes de operar.',
      'Pregunta guiada: cual es el decimal equivalente al porcentaje del enunciado?',
    ].join('\n')
  }

  const ruleOfThree = detectRuleOfThree(analysisText)
  if (ruleOfThree) {
    return [
      'Pista: organiza los datos como proporcion antes de despejar x.',
      'Pregunta guiada: que valores forman la primera razon y cual es la razon con incognita?',
    ].join('\n')
  }

  const topic = detectTopicKeyword(analysisText)
  if (topic === 'fracciones') {
    return [
      'Pista: si hay suma o resta de fracciones, busca un denominador comun.',
      'Pregunta guiada: cual es el minimo comun denominador de las fracciones del problema?',
    ].join('\n')
  }

  if (topic === 'ecuacion') {
    return [
      'Pista: despeja la variable aplicando la misma operacion en ambos lados.',
      'Pregunta guiada: que operacion inversa te acerca a dejar sola la variable?',
    ].join('\n')
  }

  return [
    'Pista: separa datos, objetivo y operacion principal antes de resolver.',
    'Pregunta guiada: que dato necesitas transformar primero para avanzar?',
  ].join('\n')
}

const buildFullFallbackAnswer = ({ question, lessonContext, correctAnswer }) => {
  const safeQuestion = sanitizeInput(question) || 'pregunta no especificada'
  const safeContext = sanitizeInput(lessonContext)
  const safeCorrectAnswer = sanitizeInput(correctAnswer)
  const analysisText = `${safeQuestion}\n${safeContext}`

  const arithmetic = detectArithmeticExpression(analysisText)
  if (arithmetic) {
    const solved = solveArithmetic(arithmetic)
    const computed = solved.error ? 'No se puede resolver con los valores dados.' : formatNumber(solved.result)
    const result = safeCorrectAnswer || computed

    return [
      `Paso 1: identifico una ${solved.operation} en la expresion ${solved.rawExpression}.`,
      `Paso 2: aplico la operacion respetando el orden correcto.${solved.error ? ` ${solved.error}` : ''}`,
      `Resultado: ${result}.`,
      'Resumen: primero identifica la operacion, luego calcula con cuidado y verifica el resultado.',
    ].join('\n')
  }

  const percentage = detectPercentage(analysisText)
  if (percentage) {
    const decimal = percentage.percent / 100
    const computed = formatNumber(percentage.result)
    const result = safeCorrectAnswer || computed

    return [
      `Paso 1: convierto ${formatNumber(percentage.percent)}% a decimal (${formatNumber(decimal)}).`,
      `Paso 2: multiplico ${formatNumber(decimal)} por ${formatNumber(percentage.base)}.`,
      `Resultado: ${result}.`,
      'Resumen: en porcentajes, convertir a decimal simplifica el calculo.',
    ].join('\n')
  }

  const ruleOfThree = detectRuleOfThree(analysisText)
  if (ruleOfThree) {
    const computed = ruleOfThree.error ? 'No se puede resolver con los datos actuales.' : formatNumber(ruleOfThree.result)
    const result = safeCorrectAnswer || computed

    return [
      `Paso 1: organizo la proporcion ${formatNumber(ruleOfThree.a)} : ${formatNumber(ruleOfThree.b)} = ${formatNumber(ruleOfThree.c)} : x.`,
      `Paso 2: despejo con regla de tres directa.${ruleOfThree.error ? ` ${ruleOfThree.error}` : ''}`,
      `Resultado: ${result}.`,
      'Resumen: al ordenar bien la proporcion, despejar la incognita es directo.',
    ].join('\n')
  }

  const topic = detectTopicKeyword(analysisText)
  if (topic === 'ecuacion') {
    return [
      'Paso 1: agrupo terminos semejantes y paso constantes al otro lado.',
      'Paso 2: aplico operaciones inversas para despejar la variable.',
      `Resultado: ${safeCorrectAnswer || 'variable despejada y verificada'}.`,
      'Resumen: despejar consiste en mantener el equilibrio en ambos lados de la igualdad.',
    ].join('\n')
  }

  return [
    `Paso 1: extraigo los datos clave del enunciado (${safeQuestion}).`,
    'Paso 2: elijo la operacion o formula mas adecuada y sustituyo datos.',
    `Resultado: ${safeCorrectAnswer || 'resultado obtenido al completar los pasos con los datos del problema'}.`,
    'Resumen: identificar datos y objetivo reduce errores y mejora la precision.',
  ].join('\n')
}

const buildTutorPrompt = (question, lessonContext, mode = 'full') => {
  const safeQuestion = sanitizeInput(question) || 'pregunta no especificada'
  const safeContext = sanitizeInput(lessonContext)

  if (mode === 'hint') {
    return [
      'Eres un tutor experto en matematicas para educacion basica y secundaria.',
      'Estilo: claro, estructurado, pedagogico y breve.',
      'Modo de ayuda: hint.',
      'Reglas obligatorias:',
      '1) Da solo una pista estrategica.',
      '2) Incluye una pregunta guiada.',
      '3) No des el resultado final.',
      '4) No des solucion completa.',
      '5) No incluyas metadata interna ni detalles tecnicos.',
      'Formato exacto:',
      'Pista: ...',
      'Pregunta guiada: ...',
      safeContext ? `Contexto de leccion: ${safeContext}` : 'Contexto de leccion: no disponible.',
      `Pregunta: ${safeQuestion}`,
    ].join('\n')
  }

  return [
    'Eres un tutor experto en matematicas para educacion basica y secundaria.',
    'Estilo: claro, estructurado, pedagogico y concreto.',
    'Modo de ayuda: full.',
    'Reglas obligatorias:',
    '1) Explica paso a paso con lenguaje sencillo.',
    '2) No des solo el resultado; justifica brevemente.',
    '3) Incluye un ejemplo corto si es conceptual.',
    '4) Evita texto redundante o excesivamente largo.',
    '5) No incluyas metadata interna ni detalles tecnicos.',
    'Formato exacto:',
    'Paso 1: ...',
    'Paso 2: ...',
    'Resultado: ...',
    'Resumen: ...',
    safeContext ? `Contexto de leccion: ${safeContext}` : 'Contexto de leccion: no disponible.',
    `Pregunta: ${safeQuestion}`,
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

const callOllama = async (question, lessonContext, mode = 'full') => {
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
        prompt: buildTutorPrompt(question, lessonContext, mode),
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

    const answer = sanitizeAiAnswer(payload?.response)
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

const resolveAiHelp = async ({ question, lessonContext, mode, requestId, correctAnswer }) => {
  console.log(
    `[ai-help][${requestId}] Intentando Ollama model=${ollamaModel} mode=${mode} url=${ollamaGenerateUrl} timeoutMs=${ollamaTimeoutMs}`,
  )

  try {
    const answer = await callOllama(question, lessonContext, mode)
    console.log(`[ai-help][${requestId}] Ollama OK`)
    return {
      answer,
      source: 'ollama',
      fallbackReason: null,
    }
  } catch (error) {
    console.warn(`[ai-help][${requestId}] Ollama fallo -> fallback`, {
      type: error?.type || 'unknown',
      message: error?.message || 'unknown',
      details: error?.details || null,
    })

    const answer =
      mode === 'hint'
        ? buildHintFallbackAnswer({ question, lessonContext })
        : buildFullFallbackAnswer({ question, lessonContext, correctAnswer })

    return {
      answer,
      source: 'fallback',
      fallbackReason: 'ollama_unavailable',
    }
  }
}

const buildQuestionState = (difficulty) => ({
  attempts: 0,
  assisted: false,
  locked: false,
  hintCount: 0,
  completed: false,
  questionType: getQuestionTypeByDifficulty(difficulty),
})

const toPublicQuestionState = (state) => ({
  attempts: Number(state?.attempts || 0),
  assisted: Boolean(state?.assisted),
  locked: Boolean(state?.locked),
})

const getQuestionStateKey = (userId, questionId) => `${userId}::${questionId}`

const getOrCreateQuestionState = (userId, questionId, difficulty) => {
  const key = getQuestionStateKey(userId, questionId)

  if (!questionStateStore.has(key)) {
    questionStateStore.set(key, buildQuestionState(difficulty))
  }

  const state = questionStateStore.get(key)
  state.questionType = getQuestionTypeByDifficulty(difficulty)
  return { state, key }
}

const requireQuestionState = (req, res, next) => {
  const userId = sanitizeInput(req.body?.userId)
  const questionId = sanitizeInput(req.body?.questionId)
  const difficulty = Number(req.body?.difficulty || 1)

  if (!userId || !questionId) {
    res.status(400).json({
      error: 'userId y questionId son obligatorios.',
    })
    return
  }

  if (req.body?.reset === true) {
    const resetKey = getQuestionStateKey(userId, questionId)
    questionStateStore.delete(resetKey)
  }

  const { state, key } = getOrCreateQuestionState(userId, questionId, difficulty)

  req.questionState = state
  req.questionStateKey = key
  req.questionDifficulty = difficulty
  req.userId = userId
  req.questionId = questionId
  req.questionType = getQuestionTypeByDifficulty(difficulty)
  next()
}

const ensureQuestionUnlocked = (req, res, next) => {
  if (!req.questionState?.locked) {
    next()
    return
  }

  res.status(423).json({
    message: 'Pregunta bloqueada.',
    state: toPublicQuestionState(req.questionState),
    questionType: req.questionState.questionType,
  })
}

app.get('/api/curriculum', (req, res) => {
  res.status(200).json({
    levels: CURRICULUM,
  })
})

app.post('/api/question/state', requireAuth, requireQuestionState, (req, res) => {
  res.status(200).json({
    state: toPublicQuestionState(req.questionState),
    questionType: req.questionState.questionType,
    maxAttempts: MAX_ATTEMPTS,
  })
})

app.post('/api/question/help', requireAuth, requireQuestionState, ensureQuestionUnlocked, async (req, res) => {
  const requestId = randomUUID()
  const question = sanitizeInput(req.body?.question)
  const lessonContext = sanitizeInput(req.body?.lessonContext)
  const correctAnswer = sanitizeInput(req.body?.correctAnswer)

  if (!question) {
    res.status(400).json({
      error: 'question es obligatoria para solicitar ayuda.',
      requestId,
    })
    return
  }

  const modeRaw = sanitizeInput(req.body?.mode).toLowerCase()
  let mode = modeRaw === 'full' ? 'full' : 'hint'

  if (mode === 'hint' && req.questionState.hintCount >= 1) {
    mode = 'full'
  }

  if (mode === 'hint') {
    req.questionState.hintCount += 1
  } else {
    req.questionState.assisted = true
    req.questionState.locked = true
    req.questionState.completed = true
  }

  const aiResult = await resolveAiHelp({
    question,
    lessonContext,
    mode,
    requestId,
    correctAnswer,
  })

  res.status(200).json({
    answer: aiResult.answer,
    source: aiResult.source,
    requestId,
    mode,
    state: toPublicQuestionState(req.questionState),
    questionType: req.questionState.questionType,
    xpAwarded: 0,
    ...(mode === 'full' && correctAnswer ? { correctAnswer } : {}),
    ...(aiResult.fallbackReason ? { fallbackReason: aiResult.fallbackReason } : {}),
  })
})

const submitQuestionController = async (req, res) => {
  const requestId = randomUUID()
  const question = sanitizeInput(req.body?.question)
  const lessonContext = sanitizeInput(req.body?.lessonContext)
  const correctAnswer = sanitizeInput(req.body?.correctAnswer)

  if (typeof req.body?.isCorrect !== 'boolean') {
    res.status(400).json({
      error: 'isCorrect debe ser boolean.',
      requestId,
    })
    return
  }

  req.questionState.attempts += 1

  if (req.body.isCorrect) {
    req.questionState.completed = true
    req.questionState.locked = true

    const xpAwarded =
      req.questionState.assisted || req.questionState.attempts > 2
        ? 0
        : Number.isFinite(XP_PER_CORRECT)
          ? XP_PER_CORRECT
          : 0

    res.status(200).json({
      correct: true,
      message: 'Correcto.',
      xpAwarded,
      requestId,
      state: toPublicQuestionState(req.questionState),
      questionType: req.questionState.questionType,
    })
    return
  }

  if (req.questionState.attempts < MAX_ATTEMPTS) {
    res.status(200).json({
      correct: false,
      message: 'Incorrecto, intenta nuevamente.',
      xpAwarded: 0,
      requestId,
      state: toPublicQuestionState(req.questionState),
      questionType: req.questionState.questionType,
    })
    return
  }

  req.questionState.assisted = true
  req.questionState.locked = true
  req.questionState.completed = true

  const aiResult = await resolveAiHelp({
    question,
    lessonContext,
    mode: 'full',
    requestId,
    correctAnswer,
  })

  res.status(200).json({
    correct: false,
    maxAttemptsReached: true,
    message: 'Incorrecto, intenta nuevamente.',
    xpAwarded: 0,
    requestId,
    state: toPublicQuestionState(req.questionState),
    questionType: req.questionState.questionType,
    answer: aiResult.answer,
    source: aiResult.source,
    ...(correctAnswer ? { correctAnswer } : {}),
    ...(aiResult.fallbackReason ? { fallbackReason: aiResult.fallbackReason } : {}),
  })
}

app.post('/api/question/submit', requireAuth, requireQuestionState, ensureQuestionUnlocked, submitQuestionController)

app.post('/api/ai-help', requireAuth, async (req, res) => {
  const requestId = randomUUID()
  const question = sanitizeInput(req.body?.question)
  const lessonContext = sanitizeInput(req.body?.lessonContext)
  const mode = sanitizeInput(req.body?.mode).toLowerCase() === 'hint' ? 'hint' : 'full'
  const correctAnswer = sanitizeInput(req.body?.correctAnswer)

  if (!question) {
    const fallbackAnswer =
      mode === 'hint'
        ? buildHintFallbackAnswer({ question, lessonContext })
        : buildFullFallbackAnswer({ question, lessonContext, correctAnswer })

    res.status(200).json({
      answer: fallbackAnswer,
      source: 'fallback',
      requestId,
      mode,
      fallbackReason: 'missing_question',
    })
    return
  }

  const aiResult = await resolveAiHelp({
    question,
    lessonContext,
    mode,
    requestId,
    correctAnswer,
  })

  res.status(200).json({
    answer: aiResult.answer,
    source: aiResult.source,
    requestId,
    mode,
    ...(aiResult.fallbackReason ? { fallbackReason: aiResult.fallbackReason } : {}),
  })
})

app.use((error, req, res, next) => {
  if (res.headersSent) {
    next(error)
    return
  }

  if (error?.type === 'entity.parse.failed') {
    console.error('[backend] Invalid JSON body:', error.message)
    res.status(400).json({ error: 'El body debe ser JSON valido.' })
    return
  }

  if (String(error?.message || '').startsWith('CORS blocked origin:')) {
    console.error('[backend] CORS error:', error.message)
    res.status(403).json({ error: error.message })
    return
  }

  console.error('[backend] Unhandled error:', error)
  res.status(500).json({ error: 'Error interno del backend.' })
})

const ensurePortAvailable = (targetPort) => {
  return new Promise((resolvePromise, rejectPromise) => {
    const tester = net.createServer()

    tester.once('error', (error) => {
      tester.close()
      if (error?.code === 'EADDRINUSE') {
        rejectPromise(new Error(`Port ${targetPort} is already in use by another process.`))
        return
      }
      rejectPromise(error)
    })

    tester.once('listening', () => {
      tester.close((closeError) => {
        if (closeError) {
          rejectPromise(closeError)
          return
        }
        resolvePromise()
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
  console.log(`[backend] Max attempts per question: ${MAX_ATTEMPTS}`)
  console.log(`[backend] XP per valid correct answer: ${XP_PER_CORRECT}`)
  console.log(`[backend] Curriculum levels loaded: ${CURRICULUM.length}`)
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

