const sanitizeInput = (value) => String(value ?? '').trim()

const sanitizeTutorOutput = (value) => {
  return String(value ?? '')
    .replace(/contexto disponible\s*:?/gi, '')
    .replace(/metadata interna\s*:?/gi, '')
    .replace(/internal metadata\s*:?/gi, '')
    .trim()
}

export const buildTutorPrompt = ({ question, grade, topic, mode = 'hint' }) => {
  const safeQuestion = sanitizeInput(question) || 'Pregunta no especificada.'
  const safeGrade = sanitizeInput(grade) || 'no definido'
  const safeTopic = sanitizeInput(topic) || 'no definido'
  const normalizedMode = sanitizeInput(mode).toLowerCase() === 'full' ? 'full' : 'hint'

  if (normalizedMode === 'hint') {
    return [
      'Eres un tutor de matematicas para secundaria.',
      'Objetivo: dar solo una pista estrategica para desbloquear el pensamiento.',
      'Reglas obligatorias:',
      '1) Entrega solo una pista corta y una pregunta guia.',
      '2) No des el resultado final.',
      '3) No des solucion completa.',
      '4) No menciones informacion tecnica del sistema.',
      'Formato exacto de salida:',
      'Pista: ...',
      'Pregunta guia: ...',
      `Grado: ${safeGrade}`,
      `Tema: ${safeTopic}`,
      `Pregunta: ${safeQuestion}`,
    ].join('\n')
  }

  return [
    'Eres un tutor de matematicas para secundaria.',
    'Objetivo: explicar la solucion completa de forma pedagogica.',
    'Reglas obligatorias:',
    '1) Explica en pasos claros y cortos.',
    '2) Incluye resultado final explicito.',
    '3) Cierra con un resumen breve.',
    '4) No menciones informacion tecnica del sistema.',
    'Formato exacto de salida:',
    'Paso 1: ...',
    'Paso 2: ...',
    'Resultado: ...',
    'Resumen: ...',
    `Grado: ${safeGrade}`,
    `Tema: ${safeTopic}`,
    `Pregunta: ${safeQuestion}`,
  ].join('\n')
}

const buildFallbackHint = ({ question }) => {
  const safeQuestion = sanitizeInput(question)
  return [
    'Pista: identifica primero los datos conocidos y la operacion principal antes de calcular.',
    `Pregunta guia: que dato de "${safeQuestion}" debes transformar primero para avanzar?`,
  ].join('\n')
}

const buildFallbackFull = ({ question, correctAnswer }) => {
  const safeQuestion = sanitizeInput(question) || 'problema'
  const safeAnswer = sanitizeInput(correctAnswer) || 'resultado correcto'
  return [
    `Paso 1: interpreta el enunciado y separa los datos clave de "${safeQuestion}".`,
    'Paso 2: aplica la operacion o formula correspondiente en el orden correcto.',
    `Resultado: ${safeAnswer}.`,
    'Resumen: al identificar datos y objetivo primero, la resolucion se vuelve directa.',
  ].join('\n')
}

const getOllamaConfig = () => {
  const baseUrl = String(process.env.OLLAMA_URL || 'http://localhost:11434')
    .trim()
    .replace(/\/+$/, '')
  return {
    endpoint: `${baseUrl}/api/generate`,
    model: String(process.env.OLLAMA_MODEL || 'llama3').trim() || 'llama3',
    timeoutMs: Number(process.env.OLLAMA_TIMEOUT_MS || 10000),
    temperature: Number(process.env.OLLAMA_TEMPERATURE || 0.2),
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
        },
      }),
      signal: controller.signal,
    })

    const payload = await response.json()
    if (!response.ok) {
      throw new Error(payload?.error || `Ollama HTTP ${response.status}`)
    }

    const answer = sanitizeTutorOutput(payload?.response)
    if (!answer) {
      throw new Error('Respuesta vacia de Ollama')
    }
    return answer
  } finally {
    clearTimeout(timeoutId)
  }
}

export const requestTutorHelp = async ({
  question,
  grade,
  topic,
  mode = 'hint',
  correctAnswer,
}) => {
  const normalizedMode = sanitizeInput(mode).toLowerCase() === 'full' ? 'full' : 'hint'
  const prompt = buildTutorPrompt({
    question,
    grade,
    topic,
    mode: normalizedMode,
  })

  try {
    const answer = await callOllama({ prompt })
    return {
      mode: normalizedMode,
      answer,
      source: 'ollama',
      fallbackReason: null,
    }
  } catch (error) {
    const fallback =
      normalizedMode === 'hint'
        ? buildFallbackHint({ question })
        : buildFallbackFull({ question, correctAnswer })

    return {
      mode: normalizedMode,
      answer: fallback,
      source: 'fallback',
      fallbackReason: sanitizeInput(error?.message) || 'ollama-unavailable',
    }
  }
}
