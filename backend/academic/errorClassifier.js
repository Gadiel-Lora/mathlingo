const normalize = (value) =>
  String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

const parseNumeric = (value) => {
  const input = normalize(value).replace(',', '.')
  if (!input) return null
  if (/^-?\d+(\.\d+)?$/.test(input)) {
    const parsed = Number(input)
    return Number.isFinite(parsed) ? parsed : null
  }

  const fraction = input.match(/^(-?\d+)\s*\/\s*(-?\d+)$/)
  if (!fraction) return null
  const numerator = Number(fraction[1])
  const denominator = Number(fraction[2])
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) return null
  return numerator / denominator
}

const matchesAny = (value, patterns = []) => {
  return patterns.some((pattern) => pattern.test(value))
}

const ALGEBRA_TOPICS = [
  /algebra/,
  /ecuacion/,
  /sistema/,
  /polinom/,
  /factoriz/,
  /funcion/,
  /cuadratic/,
]

const CONTEXT_PATTERNS = [
  /tienda/,
  /compra/,
  /estudiante/,
  /costo/,
  /dinero/,
  /contexto/,
  /modelo/,
  /aplicacion/,
  /problema real/,
]

export const classifyConceptualError = ({
  question,
  submittedAnswer,
  isCorrect,
  attempts = 1,
  elapsedTimeMs = 0,
}) => {
  if (Boolean(isCorrect)) {
    return {
      type: 'sin-error',
      confidence: 1,
      rationale: 'respuesta-correcta',
    }
  }

  const normalizedSubmitted = normalize(submittedAnswer)
  const normalizedExpected = normalize(question?.correctAnswer)
  const normalizedTopic = normalize(question?.topic)
  const normalizedPrompt = normalize(question?.question)
  const safeAttempts = Math.max(1, Math.floor(Number(attempts) || 1))
  const safeElapsed = Math.max(0, Number(elapsedTimeMs) || 0)

  if (!normalizedSubmitted) {
    return {
      type: 'interpretacion',
      confidence: 0.84,
      rationale: 'respuesta-vacia-o-incompleta',
    }
  }

  if (question?.type === 'multiple-choice') {
    const parsedOption = Number(submittedAnswer)
    if (!Number.isInteger(parsedOption) || parsedOption < 0) {
      return {
        type: 'interpretacion',
        confidence: 0.78,
        rationale: 'formato-opcion-invalido',
      }
    }
  }

  const expectedNumeric = parseNumeric(normalizedExpected)
  const submittedNumeric = parseNumeric(normalizedSubmitted)
  if (expectedNumeric !== null && submittedNumeric !== null) {
    const delta = Math.abs(expectedNumeric - submittedNumeric)
    const relative = delta / Math.max(1, Math.abs(expectedNumeric))
    if (delta <= 2 && relative <= 0.18) {
      return {
        type: 'aritmetico',
        confidence: 0.82,
        rationale: 'resultado-cercano-al-correcto',
      }
    }
  }

  if (matchesAny(normalizedTopic, ALGEBRA_TOPICS)) {
    if (safeAttempts >= 3 || safeElapsed >= 180000) {
      return {
        type: 'conceptual-profundo',
        confidence: 0.77,
        rationale: 'persistencia-de-error-estructural',
      }
    }
    return {
      type: 'algebraico-estructural',
      confidence: 0.74,
      rationale: 'tema-algebraico-con-error-no-aritmetico',
    }
  }

  if (matchesAny(normalizedPrompt, CONTEXT_PATTERNS)) {
    return {
      type: 'interpretacion',
      confidence: 0.69,
      rationale: 'fallo-en-modelado-del-contexto',
    }
  }

  if (safeAttempts >= 3 || safeElapsed >= 240000) {
    return {
      type: 'conceptual-profundo',
      confidence: 0.71,
      rationale: 'error-recurrente-con-alto-tiempo',
    }
  }

  return {
    type: 'conceptual-profundo',
    confidence: 0.6,
    rationale: 'error-general-no-clasificado',
  }
}
