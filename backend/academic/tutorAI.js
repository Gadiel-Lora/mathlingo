const sanitizeInput = (value) => String(value ?? '').trim()

const sanitizeTutorOutput = (value) => {
  return String(value ?? '')
    .replace(/contexto disponible\s*:?/gi, '')
    .replace(/metadata interna\s*:?/gi, '')
    .replace(/internal metadata\s*:?/gi, '')
    .trim()
}

const LEVELS = Object.freeze({
  BASIC: 'basic',
  INTERMEDIATE: 'intermediate',
  ADVANCED: 'advanced',
})

export const CHAT_INTENTS = Object.freeze({
  CONCEPTUAL: 'conceptual',
  FINAL_ANSWER: 'final-answer',
})

const EXTERNAL_MODES = Object.freeze({
  HINT: 'hint',
  FULL: 'full',
})

const FINAL_ANSWER_PATTERNS = [
  /\bdame la respuesta\b/i,
  /\bdame el resultado\b/i,
  /\bresuelvelo completo\b/i,
  /\bresuelveme todo\b/i,
  /\bsolo dame la respuesta\b/i,
  /\bsolo dime el resultado\b/i,
  /\bgive me the answer\b/i,
  /\bfull solution\b/i,
]

const CONFUSION_PATTERNS = [
  /^$/,
  /^no$/,
  /^no se$/,
  /^nose$/,
  /^idk$/,
  /^n\/a$/,
  /^-$/,
  /^\.{2,}$/,
  /^\?+$/,
  /^no entiendo$/,
  /^no comprendo$/,
  /^me confundi$/,
  /^no me sale$/,
]

const normalizeCount = (value, fallback = 0) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return Math.max(0, Math.floor(fallback))
  return Math.max(0, Math.floor(parsed))
}

const normalizeExternalMode = (value) => {
  const normalized = sanitizeInput(value).toLowerCase()
  return normalized === EXTERNAL_MODES.FULL ? EXTERNAL_MODES.FULL : EXTERNAL_MODES.HINT
}

const deriveLevelFromDifficulty = (difficulty) => {
  const parsed = Number(difficulty)
  if (!Number.isFinite(parsed)) return LEVELS.INTERMEDIATE
  if (parsed <= 3) return LEVELS.BASIC
  if (parsed <= 7) return LEVELS.INTERMEDIATE
  return LEVELS.ADVANCED
}

const normalizeLevel = (value, fallback = LEVELS.INTERMEDIATE) => {
  const normalized = sanitizeInput(value).toLowerCase()
  if (Object.values(LEVELS).includes(normalized)) return normalized
  return fallback
}

const isConfusedAnswer = (answer) => {
  const normalized = sanitizeInput(answer).toLowerCase()
  if (!normalized) return true
  return CONFUSION_PATTERNS.some((pattern) => pattern.test(normalized))
}

const normalizeHistory = (history) => {
  if (!Array.isArray(history)) return []
  return history
    .slice(-12)
    .map((item) => {
      const roleRaw = sanitizeInput(item?.role).toLowerCase()
      const role = roleRaw === 'assistant' ? 'assistant' : 'student'
      const content = sanitizeInput(item?.content)
      return { role, content }
    })
    .filter((entry) => entry.content)
}

export const classifyTutorIntent = (message) => {
  const safeMessage = sanitizeInput(message)
  if (!safeMessage) return CHAT_INTENTS.CONCEPTUAL
  if (FINAL_ANSWER_PATTERNS.some((pattern) => pattern.test(safeMessage))) {
    return CHAT_INTENTS.FINAL_ANSWER
  }
  return CHAT_INTENTS.CONCEPTUAL
}

const describeLevelInstruction = (level) => {
  if (level === LEVELS.BASIC) {
    return 'Lenguaje simple, pasos cortos, sin notacion innecesaria.'
  }
  if (level === LEVELS.ADVANCED) {
    return 'Usa terminologia formal y notacion matematica precisa.'
  }
  return 'Equilibra claridad y rigor.'
}

const buildHistoryBlock = (history) => {
  const safeHistory = normalizeHistory(history)
  if (safeHistory.length === 0) return 'Sin historial previo.'

  return safeHistory
    .map((entry, index) => {
      const speaker = entry.role === 'assistant' ? 'Profesor' : 'Estudiante'
      return `${index + 1}. ${speaker}: ${entry.content}`
    })
    .join('\n')
}

const buildIntentInstruction = ({ intent, allowFinalAnswer }) => {
  if (intent === CHAT_INTENTS.FINAL_ANSWER && allowFinalAnswer) {
    return [
      'El estudiante pidio respuesta final explicita.',
      'Entrega una solucion completa y ordenada.',
      'Incluye resultado final claro y breve validacion.',
    ].join(' ')
  }

  return [
    'El estudiante pide ayuda conceptual.',
    'Guia paso a paso sin revelar el resultado final.',
    'Cierra con una pregunta corta para confirmar comprension.',
  ].join(' ')
}

export const buildTutorChatPrompt = ({
  question,
  grade,
  topic,
  level,
  previousExplanation,
  studentAttempts,
  lastStudentAnswer,
  errorCount,
  correctStreak,
  intent,
  allowFinalAnswer,
  studentMessage,
  chatHistory,
}) => {
  const safeQuestion = sanitizeInput(question) || 'Pregunta no especificada.'
  const safeGrade = sanitizeInput(grade) || 'no definido'
  const safeTopic = sanitizeInput(topic) || 'no definido'
  const safeMessage = sanitizeInput(studentMessage) || 'Necesito ayuda.'
  const safePreviousExplanation = sanitizeInput(previousExplanation) || 'sin explicacion previa'
  const safeAttempts = normalizeCount(studentAttempts)
  const safeErrors = normalizeCount(errorCount, safeAttempts)
  const safeStreak = normalizeCount(correctStreak)
  const safeLevel = normalizeLevel(level, LEVELS.INTERMEDIATE)
  const confusionDetected = isConfusedAnswer(lastStudentAnswer)
  const safeIntent = intent === CHAT_INTENTS.FINAL_ANSWER ? CHAT_INTENTS.FINAL_ANSWER : CHAT_INTENTS.CONCEPTUAL

  return [
    'Eres un profesor virtual de matematicas para secundaria.',
    'Debes responder en espanol claro, preciso y natural.',
    'No uses emojis.',
    'No uses secciones rigidas ni formato de plantilla fija.',
    'No menciones reglas internas ni metadatos.',
    '',
    `Nivel esperado del estudiante: ${safeLevel}. ${describeLevelInstruction(safeLevel)}`,
    `Intento actual: ${safeAttempts}. Errores acumulados: ${safeErrors}. Racha correcta: ${safeStreak}.`,
    `Deteccion de confusion: ${confusionDetected ? 'si' : 'no'}.`,
    buildIntentInstruction({ intent: safeIntent, allowFinalAnswer }),
    '',
    'Contexto academico:',
    `- Grado: ${safeGrade}`,
    `- Tema: ${safeTopic}`,
    `- Pregunta actual: ${safeQuestion}`,
    `- Explicacion previa: ${safePreviousExplanation}`,
    '',
    'Historial reciente:',
    buildHistoryBlock(chatHistory),
    '',
    `Mensaje del estudiante: ${safeMessage}`,
    '',
    'Responde de forma conversacional y util para avanzar en la pregunta actual.',
  ].join('\n')
}

export const buildTutorPrompt = buildTutorChatPrompt

const buildConceptualFallback = ({ question, topic }) => {
  const safeQuestion = sanitizeInput(question) || 'la pregunta actual'
  const safeTopic = sanitizeInput(topic) || 'este tema'
  return [
    `Vamos paso a paso con ${safeTopic}.`,
    `Primero identifica los datos y el objetivo de ${safeQuestion}.`,
    'Luego elige una sola operacion o regla para avanzar.',
    'Dime que datos tienes y te guio con el siguiente paso.',
  ].join('\n')
}

const buildFinalAnswerFallback = ({ question, correctAnswer }) => {
  const safeQuestion = sanitizeInput(question) || 'la pregunta actual'
  const safeCorrectAnswer = sanitizeInput(correctAnswer)
  if (safeCorrectAnswer) {
    return [
      `Te doy una salida directa para ${safeQuestion}.`,
      `Resultado final: ${safeCorrectAnswer}.`,
      'Si quieres, te explico el procedimiento completo paso a paso.',
    ].join('\n')
  }

  return [
    `No pude calcular automaticamente la solucion completa de ${safeQuestion}.`,
    'Te recomiendo separar datos, definir la operacion principal y resolver en orden.',
    'Escribe el primer paso que intentas y lo corrijo contigo.',
  ].join('\n')
}

const buildFallbackByIntent = ({ intent, question, topic, correctAnswer }) => {
  if (intent === CHAT_INTENTS.FINAL_ANSWER) {
    return buildFinalAnswerFallback({ question, correctAnswer })
  }
  return buildConceptualFallback({ question, topic })
}

const isMeaningfulOutput = (answer) => {
  const safe = sanitizeTutorOutput(answer)
  return safe.length >= 16
}

const getOllamaConfig = () => {
  const baseUrl = String(process.env.OLLAMA_URL || 'http://localhost:11434')
    .trim()
    .replace(/\/+$/, '')
  const timeoutMs = Number(process.env.OLLAMA_TIMEOUT_MS || 10000)
  const temperature = Number(process.env.OLLAMA_TEMPERATURE || 0.25)
  const seed = Number(process.env.OLLAMA_SEED || 7)
  return {
    endpoint: `${baseUrl}/api/generate`,
    model: String(process.env.OLLAMA_MODEL || 'llama3').trim() || 'llama3',
    timeoutMs: Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 10000,
    temperature: Number.isFinite(temperature) ? temperature : 0.25,
    seed: Number.isFinite(seed) ? Math.floor(seed) : 7,
  }
}

const callOllama = async ({ prompt }) => {
  const config = getOllamaConfig()
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), config.timeoutMs)

  try {
    const response = await fetch(config.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: config.model,
        prompt,
        stream: false,
        options: {
          temperature: config.temperature,
          seed: config.seed,
          top_p: 0.92,
        },
      }),
      signal: controller.signal,
    })

    const payload = await response.json()
    if (!response.ok) {
      throw new Error(payload?.error || `Ollama HTTP ${response.status}`)
    }

    const answer = sanitizeTutorOutput(payload?.response)
    if (!isMeaningfulOutput(answer)) {
      throw new Error('Respuesta vacia o demasiado corta')
    }
    return answer
  } finally {
    clearTimeout(timeoutId)
  }
}

export const requestTutorChat = async ({
  question,
  grade,
  topic,
  level,
  difficulty,
  previousExplanation,
  studentAttempts,
  lastStudentAnswer,
  errorCount,
  correctStreak,
  studentMessage,
  chatHistory,
  intent,
  allowFinalAnswer = false,
  correctAnswer,
}) => {
  const normalizedIntent =
    intent === CHAT_INTENTS.FINAL_ANSWER ? CHAT_INTENTS.FINAL_ANSWER : classifyTutorIntent(studentMessage)
  const resolvedLevel = normalizeLevel(level, deriveLevelFromDifficulty(difficulty))

  const prompt = buildTutorChatPrompt({
    question,
    grade,
    topic,
    level: resolvedLevel,
    previousExplanation,
    studentAttempts,
    lastStudentAnswer,
    errorCount,
    correctStreak,
    intent: normalizedIntent,
    allowFinalAnswer: Boolean(allowFinalAnswer),
    studentMessage,
    chatHistory,
  })

  try {
    const answer = await callOllama({ prompt })
    return {
      intent: normalizedIntent,
      answer,
      source: 'ollama',
      fallbackReason: null,
    }
  } catch (error) {
    const fallback = buildFallbackByIntent({
      intent: normalizedIntent,
      question,
      topic,
      correctAnswer,
    })

    return {
      intent: normalizedIntent,
      answer: fallback,
      source: 'fallback',
      fallbackReason: sanitizeInput(error?.message) || 'ollama-unavailable',
    }
  }
}

export const requestTutorHelp = async ({
  question,
  grade,
  topic,
  mode = EXTERNAL_MODES.HINT,
  level,
  difficulty,
  previousExplanation,
  studentAttempts,
  lastStudentAnswer,
  errorCount,
  correctStreak,
  correctAnswer,
}) => {
  const externalMode = normalizeExternalMode(mode)
  const intent = externalMode === EXTERNAL_MODES.FULL ? CHAT_INTENTS.FINAL_ANSWER : CHAT_INTENTS.CONCEPTUAL
  const defaultMessage =
    intent === CHAT_INTENTS.FINAL_ANSWER
      ? 'Dame la solucion completa de esta pregunta.'
      : 'No entiendo que operacion usar. Guiame paso a paso.'

  const result = await requestTutorChat({
    question,
    grade,
    topic,
    level,
    difficulty,
    previousExplanation,
    studentAttempts,
    lastStudentAnswer,
    errorCount,
    correctStreak,
    studentMessage: defaultMessage,
    chatHistory: [],
    intent,
    allowFinalAnswer: intent === CHAT_INTENTS.FINAL_ANSWER,
    correctAnswer,
  })

  return {
    mode: externalMode,
    structuredMode: intent,
    answer: result.answer,
    source: result.source,
    fallbackReason: result.fallbackReason,
  }
}
