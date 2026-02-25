import { createHash, randomUUID } from 'node:crypto'

import { getQuestionTypeByDifficulty } from '../../curriculum/index.js'

const clampDifficulty = (value) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 1
  return Math.max(1, Math.min(5, Math.floor(parsed)))
}

const randomInt = (min, max) => {
  const safeMin = Math.ceil(Math.min(min, max))
  const safeMax = Math.floor(Math.max(min, max))
  return Math.floor(Math.random() * (safeMax - safeMin + 1)) + safeMin
}

const pick = (items) => items[randomInt(0, items.length - 1)]

const shuffle = (items) => {
  const next = [...items]
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[next[i], next[j]] = [next[j], next[i]]
  }
  return next
}

const gcd = (a, b) => {
  let x = Math.abs(a)
  let y = Math.abs(b)
  while (y !== 0) {
    const temp = y
    y = x % y
    x = temp
  }
  return x || 1
}

const simplifyFraction = (num, den) => {
  if (den === 0) return { num, den }
  const divisor = gcd(num, den)
  const normalizedDen = den / divisor < 0 ? -(den / divisor) : den / divisor
  const normalizedNum = den / divisor < 0 ? -(num / divisor) : num / divisor
  return {
    num: normalizedNum,
    den: normalizedDen,
  }
}

const formatFraction = (num, den) => {
  const reduced = simplifyFraction(num, den)
  if (reduced.den === 1) return String(reduced.num)
  return `${reduced.num}/${reduced.den}`
}

const normalizeAnswerForComparison = (value) => {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/,/g, '.')
    .replace(/\s+/g, ' ')
}

const parseNumericLike = (value) => {
  const normalized = normalizeAnswerForComparison(value)
  if (!normalized) return null

  if (/^-?\d+(\.\d+)?$/.test(normalized)) {
    const asNumber = Number(normalized)
    return Number.isFinite(asNumber) ? asNumber : null
  }

  const fraction = normalized.match(/^(-?\d+)\s*\/\s*(-?\d+)$/)
  if (fraction) {
    const numerator = Number(fraction[1])
    const denominator = Number(fraction[2])
    if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) return null
    return numerator / denominator
  }

  return null
}

const numericDistractors = (correctValue) => {
  const numeric = Number(correctValue)
  if (!Number.isFinite(numeric)) return []

  const deltas = [1, 2, 3, -1, -2, -3]
  const options = new Set()
  for (const delta of shuffle(deltas)) {
    options.add(String(numeric + delta))
    if (options.size >= 4) break
  }
  return [...options]
}

const createFingerprint = ({ grade, topic, templateId, fingerprintSeed }) => {
  return createHash('sha256')
    .update(JSON.stringify({ grade, topic, templateId, fingerprintSeed }))
    .digest('hex')
}

const createQuestionHash = ({ grade, topic, difficulty, fingerprint }) => {
  return createHash('sha256')
    .update(JSON.stringify({ grade, topic, difficulty, fingerprint, nonce: randomUUID(), ts: Date.now() }))
    .digest('hex')
}

const applyOperator = (left, operator, right) => {
  if (operator === '+') return left + right
  if (operator === '-') return left - right
  if (operator === '*') return left * right
  if (operator === '/') {
    if (right === 0) return null
    return left / right
  }
  return null
}

const evaluateThreeTermExpression = (a, op1, b, op2, c) => {
  const highPrecedence = new Set(['*', '/'])
  if (highPrecedence.has(op2) && !highPrecedence.has(op1)) {
    const right = applyOperator(b, op2, c)
    if (right === null) return null
    return applyOperator(a, op1, right)
  }

  const left = applyOperator(a, op1, b)
  if (left === null) return null
  return applyOperator(left, op2, c)
}

const formatNumericAnswer = (value) => {
  if (!Number.isFinite(value)) return '0'
  if (Number.isInteger(value)) return String(value)
  return String(Number(value.toFixed(3)))
}

const parseStrictNumericAnswer = (value) => {
  const normalized = String(value ?? '')
    .trim()
    .replace(',', '.')
  if (!/^-?\d+(\.\d+)?$/.test(normalized)) return null
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

const TOPIC_CONTEXT_LIBRARY = {
  'numeros-naturales': [
    'En una feria escolar se registran ventas por hora.',
    'Durante una jornada deportiva del colegio se cuentan puntos por equipo.',
  ],
  fracciones: [
    'En un taller de cocina se reparten porciones entre grupos.',
    'En una actividad de laboratorio se mezclan cantidades fraccionarias.',
  ],
  divisibilidad: [
    'Un docente organiza estudiantes en filas exactas.',
    'Una biblioteca agrupa libros en lotes del mismo tamano.',
  ],
  'figuras-planas': [
    'Un equipo de arquitectura escolar disena un espacio rectangular.',
    'En una clase de arte tecnico se calcula area y perimetro de paneles.',
  ],
  angulos: [
    'En robotica se ajustan giros y posiciones de un brazo mecanico.',
    'En dibujo tecnico se analizan angulos de una estructura.',
  ],
  'expresiones-algebraicas': [
    'Un club de ciencias modela una relacion entre variables.',
    'En economia escolar se representa una regla con expresiones algebraicas.',
  ],
  'ecuaciones-basicas': [
    'Una situacion financiera escolar requiere encontrar un valor desconocido.',
    'En un problema de inventario se plantea una ecuacion para hallar la cantidad faltante.',
  ],
  estadistica: [
    'Se analizan resultados de una encuesta institucional.',
    'Un equipo academico resume datos de rendimiento semanal.',
  ],
  probabilidad: [
    'Un experimento de laboratorio evalua eventos aleatorios.',
    'En un juego de aula se estima la probabilidad de un resultado.',
  ],
  'unidades-de-medida': [
    'Un proyecto tecnico exige conversiones precisas de unidades.',
    'En una actividad de campo se convierten medidas para comparar resultados.',
  ],
}

const DEFAULT_CONTEXT_LIBRARY = [
  'Se presenta una situacion real que requiere modelado matematico.',
  'Un escenario aplicado demanda interpretar datos antes de calcular.',
]

const resolveContextSentence = (topic) => {
  const key = String(topic || '').trim()
  const bucket = TOPIC_CONTEXT_LIBRARY[key] || DEFAULT_CONTEXT_LIBRARY
  return pick(bucket)
}

const resolveCognitiveStage = ({ difficulty, questionNumber, totalQuestions }) => {
  const safeDifficulty = clampDifficulty(difficulty)
  const safeQuestion = Math.max(1, Math.floor(Number(questionNumber || 1)))
  const safeTotal = Math.max(1, Math.floor(Number(totalQuestions || 1)))
  const progressRatio = safeQuestion / safeTotal

  let stage = 'direct-application'
  if (progressRatio > 0.34) stage = 'contextual-analysis'
  if (progressRatio > 0.67) stage = 'multi-step-reasoning'

  if (safeDifficulty >= 4 && stage === 'direct-application') {
    stage = 'contextual-analysis'
  }
  if (safeDifficulty >= 5) {
    stage = 'multi-step-reasoning'
  }

  return stage
}

const buildMultiStepInstruction = ({ baseAnswer, difficulty }) => {
  const safeDifficulty = clampDifficulty(difficulty)
  const adjustment = randomInt(2, 4 + safeDifficulty)
  const mode = pick(['add', 'subtract', 'double'])

  if (mode === 'double') {
    const finalAnswer = baseAnswer * 2
    return {
      instruction: `Despues, multiplica ese resultado por 2 para obtener el valor final.`,
      answer: finalAnswer,
    }
  }

  if (mode === 'subtract') {
    const finalAnswer = baseAnswer - adjustment
    return {
      instruction: `Despues, resta ${adjustment} unidades al resultado obtenido para hallar el valor final.`,
      answer: finalAnswer,
    }
  }

  const finalAnswer = baseAnswer + adjustment
  return {
    instruction: `Despues, suma ${adjustment} unidades al resultado obtenido para hallar el valor final.`,
    answer: finalAnswer,
  }
}

const applyAcademicRigor = ({ candidate, topic, difficulty, intent }) => {
  const stage = intent?.cognitiveStage || 'direct-application'
  const contextSentence = resolveContextSentence(topic)
  const basePrompt = String(candidate?.prompt || '').trim()
  const nextCandidate = {
    ...candidate,
    prompt: basePrompt,
    distractors: Array.isArray(candidate?.distractors) ? [...candidate.distractors] : [],
  }

  if (stage === 'multi-step-reasoning') {
    const numericAnswer = parseStrictNumericAnswer(candidate?.correctAnswer)
    if (numericAnswer !== null) {
      const multiStep = buildMultiStepInstruction({
        baseAnswer: numericAnswer,
        difficulty,
      })

      nextCandidate.correctAnswer = formatNumericAnswer(multiStep.answer)
      nextCandidate.distractors = [
        formatNumericAnswer(multiStep.answer + 1),
        formatNumericAnswer(multiStep.answer - 1),
        formatNumericAnswer(multiStep.answer + 2),
      ]
      nextCandidate.options = []
      nextCandidate.templateId = `${candidate.templateId}-multistep`
      nextCandidate.fingerprintSeed = {
        ...candidate.fingerprintSeed,
        stage,
        finalAnswer: nextCandidate.correctAnswer,
      }
      nextCandidate.prompt = [
        contextSentence,
        'Problema de razonamiento multi-paso:',
        basePrompt,
        multiStep.instruction,
        'Entrega solo el resultado final.',
      ].join(' ')
      nextCandidate.explanationTemplate =
        'Paso 1: modela la situacion y resuelve el calculo base. Paso 2: aplica el segundo ajuste solicitado. Resultado: {answer}.'
      return nextCandidate
    }
  }

  if (stage === 'contextual-analysis') {
    nextCandidate.prompt = [
      contextSentence,
      'Analiza el contexto, identifica los datos utiles y resuelve:',
      basePrompt,
    ].join(' ')
    nextCandidate.explanationTemplate =
      'Paso 1: identifica datos relevantes del contexto. Paso 2: selecciona y aplica la operacion correcta. Resultado: {answer}.'
    return nextCandidate
  }

  nextCandidate.prompt = [
    contextSentence,
    'Aplicacion directa:',
    basePrompt,
  ].join(' ')
  nextCandidate.explanationTemplate =
    'Paso 1: identifica la operacion principal en el problema. Paso 2: calcula y valida el resultado. Resultado: {answer}.'
  return nextCandidate
}

const resolveLessonIntent = ({ lessonId, lessonTitle, lessonSkills = [], questionNumber = 1, totalQuestions = 1, difficulty = 1 } = {}) => {
  const normalizedTitle = String(lessonTitle || '').trim().toLowerCase()
  const normalizedId = String(lessonId || '').trim().toLowerCase()
  const normalizedSkills = Array.isArray(lessonSkills)
    ? lessonSkills.map((skill) => String(skill || '').trim().toLowerCase()).join(' ')
    : ''

  const text = `${normalizedTitle} ${normalizedId} ${normalizedSkills}`
  const titleTrimmed = normalizedTitle.trim()

  const intent = {
    forcedOperation: null,
    combinedOperations: false,
    cognitiveStage: resolveCognitiveStage({
      difficulty,
      questionNumber,
      totalQuestions,
    }),
  }

  if (
    /operaciones combinadas|jerarquia de operaciones|calculo-mixto/.test(text) ||
    /operaciones combinadas/.test(titleTrimmed)
  ) {
    intent.combinedOperations = true
  }

  if (!intent.combinedOperations) {
    if (/solo con suma|problemas solo con suma/.test(text) || /^sumas?$/.test(titleTrimmed)) intent.forcedOperation = '+'
    if (/solo con resta|problemas solo con resta/.test(text) || /^restas?$/.test(titleTrimmed)) intent.forcedOperation = '-'
    if (/solo con multiplicacion|problemas solo con multiplicacion/.test(text) || /^multiplicaciones?$/.test(titleTrimmed))
      intent.forcedOperation = '*'
    if (/solo con division|problemas solo con division/.test(text) || /^divisiones?$/.test(titleTrimmed))
      intent.forcedOperation = '/'
  }

  return intent
}

const finalizeQuestion = ({ grade, topic, difficulty, type, candidate }) => {
  const normalizedCorrect = String(candidate.correctAnswer).trim()
  const candidateDistractors = Array.isArray(candidate.distractors) ? candidate.distractors : []
  const baseOptions = candidate.options?.length
    ? candidate.options.map((option) => String(option))
    : [normalizedCorrect, ...candidateDistractors.map((item) => String(item))]

  const options =
    type === 'multiple-choice'
      ? shuffle(
          [...new Set(baseOptions)]
            .filter(Boolean)
            .slice(0, 6)
            .concat(numericDistractors(normalizedCorrect))
            .filter((option, index, array) => array.indexOf(option) === index)
            .slice(0, 4),
        )
      : []

  if (type === 'multiple-choice' && !options.includes(normalizedCorrect)) {
    options[randomInt(0, Math.max(options.length - 1, 0))] = normalizedCorrect
  }

  const fingerprint = createFingerprint({
    grade,
    topic,
    templateId: candidate.templateId,
    fingerprintSeed: candidate.fingerprintSeed,
  })
  const hash = createQuestionHash({ grade, topic, difficulty, fingerprint })
  const questionId = `q-${hash.slice(0, 16)}`
  const xp = 10 + clampDifficulty(difficulty) * 6

  return {
    id: questionId,
    hash,
    fingerprint,
    grade: Number(grade),
    topic,
    difficulty: clampDifficulty(difficulty),
    type,
    question: String(candidate.prompt),
    options,
    correctAnswer: normalizedCorrect,
    correctOptionIndex: options.findIndex((value) => value === normalizedCorrect),
    explanationTemplate: String(candidate.explanationTemplate),
    xp,
    templateId: candidate.templateId,
    generatedAt: new Date().toISOString(),
  }
}

const generateNaturalNumbers = ({ difficulty, intent = {} }) => {
  const safeDifficulty = clampDifficulty(difficulty)
  if (intent.combinedOperations) {
    const operators = ['+', '-', '*']
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const op1 = pick(operators)
      const op2 = pick(operators)
      const a = randomInt(8, safeDifficulty >= 4 ? 60 : 35)
      const b = randomInt(2, safeDifficulty >= 4 ? 24 : 14)
      const c = randomInt(2, safeDifficulty >= 4 ? 18 : 12)
      const result = evaluateThreeTermExpression(a, op1, b, op2, c)

      if (!Number.isFinite(result) || !Number.isInteger(result) || result < 0) continue

      return {
        templateId: `naturales-combinadas-${op1}${op2}`,
        prompt: `Resuelve respetando la jerarquia de operaciones: ${a} ${op1} ${b} ${op2} ${c}`,
        correctAnswer: String(result),
        distractors: [String(result + 1), String(Math.max(0, result - 1)), String(result + 2)],
        explanationTemplate:
          'Paso 1: identifica que multiplicaciones y divisiones van antes. Paso 2: resuelve y luego suma o resta. Resultado: {answer}.',
        fingerprintSeed: { mode: 'combined', op1, op2, a, b, c },
      }
    }
  }

  const operationSet =
    safeDifficulty <= 2 ? ['+', '-'] : safeDifficulty === 3 ? ['+', '-', '*'] : ['+', '-', '*', '/']
  const operation = ['+', '-', '*', '/'].includes(intent.forcedOperation) ? intent.forcedOperation : pick(operationSet)

  let a = randomInt(10, safeDifficulty >= 4 ? 120 : 60)
  let b = randomInt(2, safeDifficulty >= 4 ? 30 : 20)

  if (operation === '-') {
    if (b > a) [a, b] = [b, a]
  }

  if (operation === '/') {
    b = randomInt(2, 12)
    const quotient = randomInt(2, safeDifficulty >= 4 ? 18 : 12)
    a = b * quotient
  }

  let result = 0
  if (operation === '+') result = a + b
  if (operation === '-') result = a - b
  if (operation === '*') result = a * b
  if (operation === '/') result = a / b

  return {
    templateId: `naturales-${operation}`,
    prompt: `Resuelve la operacion con numeros naturales: ${a} ${operation} ${b}`,
    correctAnswer: String(result),
    distractors: [String(result + 1), String(result - 1), String(result + 2)],
    explanationTemplate:
      'Paso 1: identifica la operacion principal. Paso 2: calcula con cuidado respetando el orden. Resultado: {answer}.',
    fingerprintSeed: { operation, a, b },
  }
}

const generateDivisibility = ({ difficulty, type }) => {
  const divisor = pick([2, 3, 5, 10])

  if (type === 'multiple-choice') {
    const correctBase = randomInt(2, 15)
    const correct = divisor * correctBase
    const incorrectA = correct + 1
    const incorrectB = correct + divisor - 1
    const incorrectC = correct + 2

    return {
      templateId: `divisibilidad-mc-${divisor}`,
      prompt: `Selecciona el numero que SI es divisible entre ${divisor}.`,
      correctAnswer: String(correct),
      options: [String(correct), String(incorrectA), String(incorrectB), String(incorrectC)],
      distractors: [],
      explanationTemplate:
        'Paso 1: aplica el criterio de divisibilidad. Paso 2: verifica si el residuo es 0. Resultado: {answer}.',
      fingerprintSeed: { divisor, correct },
    }
  }

  const number = randomInt(20, 180)
  const isDivisible = number % divisor === 0
  return {
    templateId: `divisibilidad-input-${divisor}`,
    prompt: `Responde SI o NO: ${number} es divisible entre ${divisor}?`,
    correctAnswer: isDivisible ? 'si' : 'no',
    distractors: ['si', 'no'],
    explanationTemplate:
      'Paso 1: revisa el criterio de divisibilidad del divisor. Paso 2: valida si el numero cumple. Resultado: {answer}.',
    fingerprintSeed: { divisor, number, isDivisible },
  }
}

const generateFractions = ({ difficulty }) => {
  const safeDifficulty = clampDifficulty(difficulty)
  const sameDenominator = safeDifficulty <= 2 || Math.random() < 0.5

  if (Math.random() < 0.5) {
    const denominatorA = randomInt(2, 9)
    const denominatorB = sameDenominator ? denominatorA : randomInt(2, 9)
    const numeratorA = randomInt(1, denominatorA - 1)
    const numeratorB = randomInt(1, denominatorB - 1)

    const commonDenominator = denominatorA * denominatorB
    const convertedA = numeratorA * denominatorB
    const convertedB = numeratorB * denominatorA
    const sum = simplifyFraction(convertedA + convertedB, commonDenominator)

    return {
      templateId: 'fracciones-suma',
      prompt: `Calcula: ${numeratorA}/${denominatorA} + ${numeratorB}/${denominatorB}`,
      correctAnswer: formatFraction(sum.num, sum.den),
      distractors: [
        formatFraction(sum.num + 1, sum.den),
        formatFraction(Math.max(1, sum.num - 1), sum.den),
        formatFraction(sum.num, sum.den + 1),
      ],
      explanationTemplate:
        'Paso 1: busca denominador comun. Paso 2: suma numeradores y simplifica. Resultado: {answer}.',
      fingerprintSeed: { numeratorA, denominatorA, numeratorB, denominatorB },
    }
  }

  const denominator = randomInt(3, 10)
  const a = randomInt(1, denominator - 1)
  const b = randomInt(1, denominator - 1)
  const comparator = a > b ? '>' : a < b ? '<' : '='

  return {
    templateId: 'fracciones-comparacion',
    prompt: `Completa con >, < o = : ${a}/${denominator} ___ ${b}/${denominator}`,
    correctAnswer: comparator,
    distractors: ['>', '<', '='].filter((symbol) => symbol !== comparator),
    explanationTemplate:
      'Paso 1: compara numeradores porque el denominador es igual. Paso 2: elige el signo correcto. Resultado: {answer}.',
    fingerprintSeed: { denominator, a, b },
  }
}

const generateFigurasPlanas = ({ difficulty }) => {
  if (Math.random() < 0.5) {
    const width = randomInt(3, 12)
    const height = randomInt(3, 12)
    const area = width * height
    return {
      templateId: 'figuras-area-rectangulo',
      prompt: `Un rectangulo mide ${width} cm de base y ${height} cm de altura. Cual es su area en cm2?`,
      correctAnswer: String(area),
      distractors: [String(width + height), String(2 * (width + height)), String(area + width)],
      explanationTemplate:
        'Paso 1: identifica base y altura. Paso 2: aplica A = base x altura. Resultado: {answer}.',
      fingerprintSeed: { shape: 'rectangulo', width, height, difficulty: clampDifficulty(difficulty) },
    }
  }

  const a = randomInt(4, 15)
  const b = randomInt(4, 15)
  const perimeter = 2 * (a + b)
  return {
    templateId: 'figuras-perimetro-rectangulo',
    prompt: `Calcula el perimetro de un rectangulo de lados ${a} cm y ${b} cm.`,
    correctAnswer: String(perimeter),
    distractors: [String(a + b), String(a * b), String(perimeter + 2)],
    explanationTemplate:
      'Paso 1: identifica los 4 lados del rectangulo. Paso 2: suma todos los lados o usa P = 2(a+b). Resultado: {answer}.',
    fingerprintSeed: { shape: 'rectangulo', a, b, metric: 'perimetro' },
  }
}

const generateAngles = () => {
  const mode = Math.random() < 0.5 ? 'complementario' : 'suplementario'
  const angle = mode === 'complementario' ? randomInt(10, 80) : randomInt(20, 150)
  const total = mode === 'complementario' ? 90 : 180
  const answer = total - angle

  return {
    templateId: `angulos-${mode}`,
    prompt: `Si un angulo mide ${angle} grados, cuanto mide su angulo ${mode}?`,
    correctAnswer: String(answer),
    distractors: [String(answer + 10), String(Math.max(0, answer - 10)), String(total + angle)],
    explanationTemplate:
      'Paso 1: recuerda la suma total de los angulos complementarios o suplementarios. Paso 2: resta el valor conocido. Resultado: {answer}.',
    fingerprintSeed: { mode, angle },
  }
}

const generateAlgebraicExpressions = ({ difficulty }) => {
  const x = randomInt(-5, 8)
  const a = randomInt(2, difficulty >= 3 ? 9 : 6)
  const b = randomInt(-8, 12)
  const result = a * x + b

  return {
    templateId: 'algebra-evaluacion-lineal',
    prompt: `Evalua la expresion ${a}x ${b >= 0 ? '+' : '-'} ${Math.abs(b)} cuando x = ${x}.`,
    correctAnswer: String(result),
    distractors: [String(result + a), String(result - a), String(a + x + b)],
    explanationTemplate:
      'Paso 1: reemplaza x por el valor dado. Paso 2: resuelve multiplicacion y luego suma o resta. Resultado: {answer}.',
    fingerprintSeed: { a, b, x },
  }
}

const generateBasicEquation = ({ difficulty }) => {
  if (difficulty <= 2 || Math.random() < 0.5) {
    const x = randomInt(1, 24)
    const a = randomInt(1, 20)
    const b = x + a
    return {
      templateId: 'ecuacion-x-plus-a',
      prompt: `Resuelve la ecuacion: x + ${a} = ${b}`,
      correctAnswer: String(x),
      distractors: [String(x + 1), String(Math.max(0, x - 1)), String(b - a + 2)],
      explanationTemplate:
        'Paso 1: aplica la operacion inversa de la suma. Paso 2: verifica reemplazando x en la ecuacion. Resultado: {answer}.',
      fingerprintSeed: { form: 'x+a=b', x, a, b },
    }
  }

  const x = randomInt(1, 14)
  const a = randomInt(2, 10)
  const c = randomInt(-12, 12)
  const b = a * x + c

  return {
    templateId: 'ecuacion-dos-operaciones',
    prompt: `Resuelve la ecuacion: ${a}x ${c >= 0 ? '+' : '-'} ${Math.abs(c)} = ${b}`,
    correctAnswer: String(x),
    distractors: [String(x + 2), String(Math.max(0, x - 2)), String(x + 1)],
    explanationTemplate:
      'Paso 1: despeja sumando o restando la constante. Paso 2: divide entre el coeficiente de x. Resultado: {answer}.',
    fingerprintSeed: { form: 'ax+b=c', x, a, c, b },
  }
}

const generateStatistics = () => {
  const size = randomInt(4, 6)
  const values = Array.from({ length: size }, () => randomInt(4, 18))
  const sum = values.reduce((acc, value) => acc + value, 0)
  const mean = sum / size
  const cleanMean = Number.isInteger(mean) ? String(mean) : String(Number(mean.toFixed(2)))

  return {
    templateId: 'estadistica-media',
    prompt: `Calcula la media aritmetica del conjunto: ${values.join(', ')}`,
    correctAnswer: cleanMean,
    distractors: [String(Math.round(sum / (size - 1))), String(Math.round(sum / (size + 1))), String(values[0])],
    explanationTemplate:
      'Paso 1: suma todos los datos. Paso 2: divide entre la cantidad de datos. Resultado: {answer}.',
    fingerprintSeed: { values },
  }
}

const generateProbability = () => {
  const red = randomInt(2, 7)
  const blue = randomInt(2, 7)
  const green = randomInt(1, 6)
  const total = red + blue + green
  const targetColor = pick([
    { name: 'roja', count: red },
    { name: 'azul', count: blue },
    { name: 'verde', count: green },
  ])
  const fraction = simplifyFraction(targetColor.count, total)

  return {
    templateId: 'probabilidad-bolsa-colores',
    prompt: `Una bolsa tiene ${red} bolas rojas, ${blue} azules y ${green} verdes. Cual es la probabilidad de sacar una bola ${targetColor.name}?`,
    correctAnswer: formatFraction(fraction.num, fraction.den),
    distractors: [
      formatFraction(Math.min(total, targetColor.count + 1), total),
      formatFraction(Math.max(1, targetColor.count - 1), total),
      formatFraction(total - targetColor.count, total),
    ],
    explanationTemplate:
      'Paso 1: cuenta casos favorables y casos totales. Paso 2: forma la fraccion y simplifica. Resultado: {answer}.',
    fingerprintSeed: { red, blue, green, targetColor: targetColor.name },
  }
}

const generateMeasurement = () => {
  const mode = pick(['m-cm', 'kg-g', 'l-ml'])

  if (mode === 'm-cm') {
    const meters = randomInt(2, 25)
    return {
      templateId: 'medicion-m-cm',
      prompt: `Convierte ${meters} metros a centimetros.`,
      correctAnswer: String(meters * 100),
      distractors: [String(meters * 10), String(meters * 1000), String(meters + 100)],
      explanationTemplate: 'Paso 1: usa 1 m = 100 cm. Paso 2: multiplica por 100. Resultado: {answer}.',
      fingerprintSeed: { mode, meters },
    }
  }

  if (mode === 'kg-g') {
    const kilograms = randomInt(1, 12)
    return {
      templateId: 'medicion-kg-g',
      prompt: `Convierte ${kilograms} kilogramos a gramos.`,
      correctAnswer: String(kilograms * 1000),
      distractors: [String(kilograms * 100), String(kilograms * 10), String(kilograms + 1000)],
      explanationTemplate: 'Paso 1: usa 1 kg = 1000 g. Paso 2: multiplica por 1000. Resultado: {answer}.',
      fingerprintSeed: { mode, kilograms },
    }
  }

  const liters = randomInt(1, 15)
  return {
    templateId: 'medicion-l-ml',
    prompt: `Convierte ${liters} litros a mililitros.`,
    correctAnswer: String(liters * 1000),
    distractors: [String(liters * 100), String(liters * 10), String(liters + 1000)],
    explanationTemplate: 'Paso 1: usa 1 L = 1000 mL. Paso 2: multiplica por 1000. Resultado: {answer}.',
    fingerprintSeed: { mode, liters },
  }
}

const generateGenericQuestion = ({ topic }) => {
  const a = randomInt(8, 60)
  const b = randomInt(2, 20)
  const answer = a + b
  return {
    templateId: 'generic-addition',
    prompt: `Tema ${topic}: resuelve ${a} + ${b}`,
    correctAnswer: String(answer),
    distractors: [String(answer + 1), String(answer - 1), String(answer + 2)],
    explanationTemplate:
      'Paso 1: identifica los dos valores del problema. Paso 2: aplica la operacion solicitada. Resultado: {answer}.',
    fingerprintSeed: { topic, a, b },
  }
}

const TOPIC_GENERATORS = {
  'numeros-naturales': generateNaturalNumbers,
  divisibilidad: generateDivisibility,
  fracciones: generateFractions,
  'figuras-planas': generateFigurasPlanas,
  angulos: generateAngles,
  'expresiones-algebraicas': generateAlgebraicExpressions,
  'ecuaciones-basicas': generateBasicEquation,
  estadistica: generateStatistics,
  probabilidad: generateProbability,
  'unidades-de-medida': generateMeasurement,
}

const resolveGenerator = (topic) => {
  if (TOPIC_GENERATORS[topic]) return TOPIC_GENERATORS[topic]

  if (String(topic).includes('ecuacion')) return generateBasicEquation
  if (String(topic).includes('fraccion')) return generateFractions
  if (String(topic).includes('probabilidad')) return generateProbability
  if (String(topic).includes('estadistica')) return generateStatistics
  if (String(topic).includes('angulo')) return generateAngles
  if (String(topic).includes('medida')) return generateMeasurement
  if (String(topic).includes('natural') || String(topic).includes('entero')) return generateNaturalNumbers

  return generateGenericQuestion
}

export const generateQuestion = ({
  grade,
  topic,
  difficulty = 1,
  lessonContext = {},
  excludedFingerprints = new Set(),
}) => {
  const safeDifficulty = Math.max(2, clampDifficulty(difficulty))
  const normalizedTopic = String(topic || '').trim()
  const normalizedGrade = Number(grade) || 1
  const blockedFingerprints =
    excludedFingerprints instanceof Set ? excludedFingerprints : new Set(excludedFingerprints || [])
  const safeLessonContext = lessonContext && typeof lessonContext === 'object' ? lessonContext : {}
  const lessonIntent = resolveLessonIntent({
    ...safeLessonContext,
    difficulty: safeDifficulty,
  })

  if (!normalizedTopic) {
    throw new Error('topic es obligatorio para generar una pregunta.')
  }

  const type = getQuestionTypeByDifficulty(safeDifficulty)
  const generator = resolveGenerator(normalizedTopic)

  for (let attempt = 0; attempt < 30; attempt += 1) {
    const candidate = generator({
      grade: normalizedGrade,
      topic: normalizedTopic,
      difficulty: safeDifficulty,
      type,
      lessonContext: safeLessonContext,
      intent: lessonIntent,
    })
    const rigorousCandidate = applyAcademicRigor({
      candidate,
      topic: normalizedTopic,
      difficulty: safeDifficulty,
      intent: lessonIntent,
    })

    const question = finalizeQuestion({
      grade: normalizedGrade,
      topic: normalizedTopic,
      difficulty: safeDifficulty,
      type,
      candidate: rigorousCandidate,
    })

    if (blockedFingerprints.has(question.fingerprint)) {
      continue
    }

    return question
  }

  throw new Error('No fue posible generar una pregunta distinta para este usuario/tema.')
}

export const isAnswerCorrect = (question, submittedAnswer) => {
  if (!question) return false

  if (question.type === 'multiple-choice') {
    const asNumber = Number(submittedAnswer)
    if (Number.isInteger(asNumber) && asNumber >= 0) {
      return asNumber === question.correctOptionIndex
    }
  }

  const expected = normalizeAnswerForComparison(question.correctAnswer)
  const received = normalizeAnswerForComparison(submittedAnswer)
  if (!expected || !received) return false
  if (expected === received) return true

  const numericExpected = parseNumericLike(expected)
  const numericReceived = parseNumericLike(received)
  if (numericExpected === null || numericReceived === null) return false
  return Math.abs(numericExpected - numericReceived) <= 1e-6
}

export const toPublicQuestion = (question, includeAnswer = false) => {
  if (!question) return null

  return {
    id: question.id,
    hash: question.hash,
    question: question.question,
    type: question.type,
    options: Array.isArray(question.options) ? [...question.options] : [],
    explanationTemplate: question.explanationTemplate,
    xp: question.xp,
    difficulty: question.difficulty,
    topic: question.topic,
    grade: question.grade,
    ...(includeAnswer ? { correctAnswer: question.correctAnswer } : {}),
  }
}

export { normalizeAnswerForComparison }
