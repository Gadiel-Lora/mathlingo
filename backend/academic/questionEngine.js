import { createHash, randomUUID } from 'node:crypto'

import { getQuestionTypeByDifficulty } from '../../curriculum/index.js'

const clampDifficulty = (value) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 1
  return Math.max(1, Math.min(9, Math.floor(parsed)))
}

const normalizeTopicKey = (value) => {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/_/g, '-')
    .replace(/\s+/g, '-')
}

const TOPIC_ALIASES = {
  'numeros-naturales': 'operaciones-basicas',
  numerosnaturales: 'operaciones-basicas',
  'potencias-y-raices': 'potencias-propiedades',
  proporcionalidad: 'proporcionalidad-compuesta',
  'expresiones-algebraicas-avanzadas': 'polinomios',
  'ecuaciones-primer-grado': 'ecuaciones-lineales-dos-pasos',
  'sistemas-ecuaciones-intro': 'sistemas-ecuaciones',
  triangulos: 'teorema-de-pitagoras',
  probabilidad: 'probabilidad-compuesta-basica',
  factorizacion: 'factorizacion-completa',
  funciones: 'funcion-lineal-formal',
  'estadistica-descriptiva': 'estadistica-descriptiva-ampliada',
  'probabilidad-compuesta': 'probabilidad-compuesta-formal',
}

const GRADE_TOPIC_ALIASES = {
  3: {
    'productos-notables': 'productos-notables-completos',
    'sistemas-ecuaciones': 'sistemas-ecuaciones-2x2-formal',
    'teorema-de-pitagoras': 'pitagoras-ampliado',
    'semejanza-de-triangulos': 'semejanza-triangulos-formal',
  },
}

const parseGradeNumber = (grade) => {
  const raw = String(grade ?? '').trim().toLowerCase()
  if (!raw) return null
  const parsed = Number(raw)
  if (Number.isFinite(parsed)) return Math.floor(parsed)
  const match = raw.match(/\d+/)
  if (!match) return null
  const fromText = Number(match[0])
  return Number.isFinite(fromText) ? Math.floor(fromText) : null
}

const canonicalizeTopic = (topic, grade = null) => {
  const key = normalizeTopicKey(topic)
  if (!key) return ''
  const gradeNumber = parseGradeNumber(grade)
  const gradeAliases = gradeNumber ? GRADE_TOPIC_ALIASES[gradeNumber] : null
  if (gradeAliases?.[key]) return gradeAliases[key]
  if (TOPIC_ALIASES[key]) return TOPIC_ALIASES[key]
  return key
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
  const signedDen = den / divisor
  const normalized = signedDen < 0 ? -1 : 1
  return {
    num: (num / divisor) * normalized,
    den: signedDen * normalized,
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
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
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

const parseStrictNumericAnswer = (value) => {
  const normalized = String(value ?? '')
    .trim()
    .replace(',', '.')
  if (!/^-?\d+(\.\d+)?$/.test(normalized)) return null
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

const formatNumericAnswer = (value) => {
  if (!Number.isFinite(value)) return '0'
  if (Number.isInteger(value)) return String(value)
  return String(Number(value.toFixed(3)))
}

const numericDistractors = (correctValue) => {
  const numeric = Number(correctValue)
  if (!Number.isFinite(numeric)) return []

  const deltas = [1, 2, 3, -1, -2, -3]
  const options = new Set()
  for (const delta of shuffle(deltas)) {
    options.add(formatNumericAnswer(numeric + delta))
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

const TOPIC_CONTEXT_LIBRARY = {
  'operaciones-basicas': [
    'En una tienda escolar se registran compras y repartos entre estudiantes.',
    'En una jornada de aula se organizan materiales por grupos y turnos.',
  ],
  'jerarquia-operaciones': [
    'Un problema aplicado exige resolver operaciones combinadas en el orden correcto.',
    'Una situacion tecnica requiere respetar prioridad operatoria para evitar errores.',
  ],
  divisibilidad: [
    'Se forman equipos con el mismo numero de integrantes para una actividad academica.',
    'Un inventario escolar se distribuye en lotes exactos sin sobrantes.',
  ],
  fracciones: [
    'En un laboratorio se reparten porciones fraccionarias entre grupos.',
    'En un proyecto culinario se combinan cantidades expresadas en fracciones.',
  ],
  'figuras-planas': [
    'Un diseno de aula requiere calcular perimetros y areas de figuras planas.',
    'Una maqueta escolar integra triangulos y cuadrilateros con medidas reales.',
  ],
  angulos: [
    'En dibujo tecnico se analizan giros y medidas angulares de una estructura.',
    'En robotica escolar se ajustan posiciones usando medidas de angulos.',
  ],
  'expresiones-algebraicas': [
    'Un problema de modelacion representa relaciones con expresiones algebraicas.',
    'En economia escolar se traduce lenguaje verbal a expresiones con variables.',
  ],
  'ecuaciones-basicas': [
    'Se plantea una situacion con una cantidad desconocida que debe hallarse.',
    'Un escenario financiero escolar requiere despejar una variable con ecuaciones.',
  ],
  estadistica: [
    'Se estudian datos de una encuesta del curso para tomar decisiones.',
    'Un equipo academico organiza y resume resultados semanales.',
  ],
  'probabilidad-simple': [
    'Un experimento sencillo permite estimar la probabilidad de un evento.',
    'En un juego de aula se analizan casos favorables y casos posibles.',
  ],
  'unidades-de-medida': [
    'Un proyecto tecnico necesita conversiones exactas de unidades.',
    'En trabajo de campo se comparan medidas en distintas unidades.',
  ],
  'potencias-propiedades': [
    'Un informe demografico proyecta crecimiento con potencias.',
    'En tecnologia se aplican propiedades de exponentes para simplificar calculos.',
  ],
  'raices-cuadradas-cubicas': [
    'Un diseno arquitectonico usa raices para recuperar medidas reales.',
    'En analisis numerico se aproximan raices para estimar resultados.',
  ],
  'notacion-cientifica': [
    'Un reporte cientifico expresa magnitudes extremas en notacion cientifica.',
    'En laboratorio se operan valores muy grandes y muy pequenos de forma compacta.',
  ],
  'proporcionalidad-compuesta': [
    'Una planificacion de produccion depende de tiempo, velocidad y recursos.',
    'Un problema tecnico combina varias magnitudes proporcionales al mismo tiempo.',
  ],
  'porcentajes-avanzados': [
    'Una simulacion financiera aplica aumentos, descuentos e interes simple.',
    'Un analisis comercial compara variaciones porcentuales sucesivas.',
  ],
  polinomios: [
    'Un modelo algebraico describe relaciones usando polinomios.',
    'En una situacion aplicada se evalua un polinomio para estimar un resultado.',
  ],
  'productos-notables': [
    'Un calculo algebraico se simplifica usando identidades notables.',
    'En modelacion simbolica se usan productos notables para acelerar operaciones.',
  ],
  'factorizacion-basica': [
    'Un problema algebraico requiere factorizar para interpretar su estructura.',
    'En una situacion aplicada se usa factorizacion para simplificar expresiones.',
  ],
  'ecuaciones-lineales-dos-pasos': [
    'Un escenario cuantitativo exige despejar una ecuacion con dos operaciones.',
    'Una situacion real se traduce a ecuacion lineal de dos pasos.',
  ],
  'sistemas-ecuaciones': [
    'Un problema de costos y cantidades requiere resolver un sistema lineal.',
    'Una modelacion con dos variables exige interpretar la interseccion de rectas.',
  ],
  'teorema-de-pitagoras': [
    'Una medicion indirecta en terreno usa un triangulo rectangulo.',
    'En dibujo tecnico se calcula una distancia diagonal con Pitagoras.',
  ],
  'areas-compuestas': [
    'Un plano arquitectonico combina figuras para calcular area total.',
    'Un terreno irregular se descompone en figuras simples para estimar superficie.',
  ],
  'semejanza-de-triangulos': [
    'Una escala tecnica usa triangulos semejantes para hallar medidas faltantes.',
    'En topografia se aplican razones de semejanza para estimaciones indirectas.',
  ],
  'media-mediana-moda-rango': [
    'Un equipo analitico resume datos con medidas de tendencia central y dispersion.',
    'En evaluacion academica se comparan grupos usando media, mediana, moda y rango.',
  ],
  'probabilidad-compuesta-basica': [
    'Un experimento de dos etapas analiza eventos independientes.',
    'Un arbol de probabilidad organiza rutas posibles y sus probabilidades.',
  ],
  'funcion-lineal-basica': [
    'Un modelo economico lineal relaciona costo total con cantidad producida.',
    'Una relacion grafica lineal se interpreta con pendiente e intercepto.',
  ],
  'productos-notables-completos': [
    'Un problema algebraico requiere aplicar identidades notables completas.',
    'Una situacion geometrica modela volumenes y areas con binomios.',
  ],
  'factorizacion-completa': [
    'Una expresion algebraica compleja se simplifica mediante factorizacion estrategica.',
    'Un modelo simbolico exige combinar distintos casos de factorizacion.',
  ],
  'fracciones-algebraicas': [
    'Un analisis funcional requiere operar y simplificar fracciones algebraicas.',
    'Una modelacion racional impone restricciones sobre el denominador.',
  ],
  'ecuaciones-cuadraticas': [
    'Un escenario aplicado conduce a una ecuacion cuadratica que debe resolverse.',
    'Un problema de optimizacion basica usa raices de una cuadratica.',
  ],
  'sistemas-ecuaciones-2x2-formal': [
    'Una situacion economica se modela con un sistema lineal 2x2.',
    'Se comparan dos metodos algebraicos para resolver un sistema formal.',
  ],
  'funcion-lineal-formal': [
    'Un estudio de variacion lineal exige interpretar pendiente e intersecciones.',
    'Una grafica lineal se usa para estimar cambios constantes en contexto real.',
  ],
  'funcion-cuadratica': [
    'Una trayectoria modelada por parabola requiere analizar vertice y forma canonica.',
    'Un problema de maximos y minimos usa funcion cuadratica.',
  ],
  'semejanza-triangulos-formal': [
    'Un levantamiento tecnico aplica criterios formales de semejanza de triangulos.',
    'Una escala geometrica usa Thales para estimar medidas inaccesibles.',
  ],
  'pitagoras-ampliado': [
    'Una distancia en el plano cartesiano se calcula con Pitagoras ampliado.',
    'Una aplicacion combinada integra Pitagoras con relaciones geometricas.',
  ],
  'geometria-analitica-basica': [
    'Un analisis de coordenadas requiere distancia, punto medio y pendiente.',
    'Una interpretacion en el plano cartesiano combina varias herramientas analiticas.',
  ],
  'estadistica-descriptiva-ampliada': [
    'Un informe comparativo usa varianza y graficos para describir datos.',
    'Una evaluacion de grupos requiere estadistica descriptiva ampliada.',
  ],
  'probabilidad-compuesta-formal': [
    'Un proceso por etapas exige analizar eventos dependientes y condicionados.',
    'Un diagrama de arbol formal organiza probabilidades compuestas.',
  ],
  'modelacion-integrada': [
    'Un problema integrador combina algebra, funciones y geometria para modelar una decision.',
    'Una situacion compleja requiere traducir contexto real a varias representaciones matematicas.',
  ],
}

const DEFAULT_CONTEXT_LIBRARY = [
  'Se presenta una situacion real que requiere modelado matematico.',
  'Un escenario aplicado demanda interpretar datos antes de calcular.',
]

const resolveContextSentence = (topic) => {
  const key = canonicalizeTopic(topic)
  const bucket = TOPIC_CONTEXT_LIBRARY[key] || DEFAULT_CONTEXT_LIBRARY
  return pick(bucket)
}

const resolveCognitiveStage = ({ difficulty, questionNumber, totalQuestions }) => {
  const safeDifficulty = clampDifficulty(difficulty)
  const safeQuestion = Math.max(1, Math.floor(Number(questionNumber || 1)))
  const safeTotal = Math.max(1, Math.floor(Number(totalQuestions || 1)))
  const progressRatio = safeQuestion / safeTotal

  let stage = 'direct-application'
  if (progressRatio > 0.45) stage = 'contextual-analysis'
  if (progressRatio > 0.75) stage = 'multi-step-reasoning'

  if (safeDifficulty >= 6 && stage === 'direct-application') {
    stage = 'contextual-analysis'
  }
  if (safeDifficulty >= 7) {
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
      instruction: 'Despues, multiplica el resultado por 2 para obtener el valor final.',
      answer: finalAnswer,
    }
  }

  if (mode === 'subtract') {
    const finalAnswer = baseAnswer - adjustment
    return {
      instruction: `Despues, resta ${adjustment} unidades al resultado intermedio para hallar el valor final.`,
      answer: finalAnswer,
    }
  }

  const finalAnswer = baseAnswer + adjustment
  return {
    instruction: `Despues, suma ${adjustment} unidades al resultado intermedio para hallar el valor final.`,
    answer: finalAnswer,
  }
}

const normalizeProblemMix = (value, fallback = 'mixed') => {
  const normalized = String(value ?? '').trim().toLowerCase()
  if (['contextualized', 'mechanical', 'mixed'].includes(normalized)) return normalized
  return fallback
}

const applyAcademicRigor = ({ candidate, topic, difficulty, intent }) => {
  const stage = intent?.cognitiveStage || 'direct-application'
  const problemMix = normalizeProblemMix(intent?.problemMix, 'mixed')
  const shouldContextualize =
    problemMix === 'contextualized' || (problemMix === 'mixed' && (stage !== 'direct-application' || Math.random() < 0.5))
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
        shouldContextualize ? contextSentence : '',
        'Problema de razonamiento multi-paso:',
        basePrompt,
        multiStep.instruction,
        'Entrega solo el resultado final.',
      ]
        .filter(Boolean)
        .join(' ')
      nextCandidate.explanationTemplate =
        'Paso 1: modela la situacion y resuelve el calculo base. Paso 2: aplica el segundo ajuste solicitado. Resultado: {answer}.'
      return nextCandidate
    }
  }

  if (stage === 'contextual-analysis' && shouldContextualize) {
    nextCandidate.prompt = [contextSentence, 'Analiza el contexto, identifica datos utiles y resuelve:', basePrompt].join(' ')
    nextCandidate.explanationTemplate =
      'Paso 1: identifica datos relevantes del contexto. Paso 2: selecciona y aplica la operacion correcta. Resultado: {answer}.'
    return nextCandidate
  }

  if (shouldContextualize) {
    nextCandidate.prompt = [contextSentence, basePrompt].join(' ')
    nextCandidate.explanationTemplate =
      'Paso 1: identifica la operacion principal en el problema. Paso 2: calcula y valida el resultado. Resultado: {answer}.'
    return nextCandidate
  }

  nextCandidate.prompt = basePrompt
  nextCandidate.explanationTemplate =
    'Paso 1: identifica la operacion o regla principal. Paso 2: resuelve con precision y verifica. Resultado: {answer}.'
  return nextCandidate
}

const resolveLessonIntent = ({
  topic,
  lessonId,
  lessonTitle,
  lessonSkills = [],
  lessonSubtopics = [],
  questionNumber = 1,
  totalQuestions = 1,
  difficulty = 1,
  problemMix = 'mixed',
} = {}) => {
  const normalizedTopic = canonicalizeTopic(topic)
  const normalizedTitle = String(lessonTitle || '').trim().toLowerCase()
  const normalizedId = String(lessonId || '').trim().toLowerCase()
  const normalizedSkills = Array.isArray(lessonSkills)
    ? lessonSkills.map((skill) => String(skill || '').trim().toLowerCase()).join(' ')
    : ''
  const normalizedSubtopics = Array.isArray(lessonSubtopics)
    ? lessonSubtopics.map((subtopic) => String(subtopic || '').trim().toLowerCase()).join(' ')
    : ''

  const text = `${normalizedTitle} ${normalizedId} ${normalizedSkills} ${normalizedSubtopics}`.trim()
  const intent = {
    forcedOperation: null,
    combinedOperations: false,
    focus: null,
    problemMix:
      normalizedTopic === 'operaciones-basicas' ? 'contextualized' : normalizeProblemMix(problemMix, 'mixed'),
    cognitiveStage: resolveCognitiveStage({
      difficulty,
      questionNumber,
      totalQuestions,
    }),
  }

  if (/jerarquia|operaciones combinadas|prioridad operatoria/.test(text) || normalizedTopic === 'jerarquia-operaciones') {
    intent.combinedOperations = true
  }

  if (/suma|compras|dinero/.test(text)) intent.forcedOperation = '+'
  if (/resta/.test(text)) intent.forcedOperation = '-'
  if (/multiplicacion|agrupar|grupos/.test(text)) intent.forcedOperation = '*'
  if (/division|repartir/.test(text)) intent.forcedOperation = '/'

  if (normalizedTopic === 'divisibilidad') {
    if (/criterio/.test(text)) intent.focus = 'criteria'
    else if (/primo|compuesto/.test(text)) intent.focus = 'prime-composite'
    else if (/divisor/.test(text)) intent.focus = 'divisors'
    else if (/contexto|aplicad/.test(text)) intent.focus = 'context'
    else intent.focus = 'multiples'
  }

  if (normalizedTopic === 'fracciones') {
    if (/represent/.test(text)) intent.focus = 'representation'
    else if (/equival/.test(text)) intent.focus = 'equivalent'
    else if (/compar/.test(text)) intent.focus = 'comparison'
    else if (/suma|resta|multiplic/.test(text)) intent.focus = 'operations'
  }

  if (normalizedTopic === 'figuras-planas') {
    if (/perimetro/.test(text)) intent.focus = 'perimeter'
    else if (/area.*triang/.test(text)) intent.focus = 'triangle-area'
    else if (/area/.test(text)) intent.focus = 'rectangle-area'
    else intent.focus = 'classification'
  }

  if (normalizedTopic === 'angulos') {
    if (/complement|suplement/.test(text)) intent.focus = 'complements'
    else if (/medicion|transportador/.test(text)) intent.focus = 'measurement'
    else intent.focus = 'types'
  }

  if (normalizedTopic === 'expresiones-algebraicas') {
    if (/traduccion/.test(text)) intent.focus = 'translation'
    else if (/simplific|terminos semejantes/.test(text)) intent.focus = 'simplification'
    else if (/evaluacion|sustitucion/.test(text)) intent.focus = 'evaluation'
    else intent.focus = 'variables'
  }

  if (normalizedTopic === 'ecuaciones-basicas') {
    if (/x\s*\+\s*a|x\+a/.test(text)) intent.focus = 'x-plus-a'
    else if (/ax\s*=\s*b|ax=b/.test(text)) intent.focus = 'ax-equals-b'
    else if (/dos operaciones/.test(text)) intent.focus = 'two-step'
    else if (/contexto|traduccion|modelado/.test(text)) intent.focus = 'context'
  }

  if (normalizedTopic === 'estadistica') {
    if (/frecuencia/.test(text)) intent.focus = 'frequency'
    else if (/grafico/.test(text)) intent.focus = 'bar-chart'
    else if (/media/.test(text)) intent.focus = 'mean'
    else intent.focus = 'data-collection'
  }

  if (normalizedTopic === 'probabilidad-simple') {
    if (/espacio muestral/.test(text)) intent.focus = 'sample-space'
    else if (/experimento/.test(text)) intent.focus = 'experiment'
    else intent.focus = 'basic-probability'
  }

  if (normalizedTopic === 'unidades-de-medida') {
    if (/longitud/.test(text)) intent.focus = 'length'
    else if (/masa/.test(text)) intent.focus = 'mass'
    else if (/capacidad/.test(text)) intent.focus = 'capacity'
    else intent.focus = 'conversion'
  }

  if (normalizedTopic === 'potencias-propiedades') {
    if (/base negativa|negativ/.test(text)) intent.focus = 'negative-base'
    else if (/potencias de 10|10\^|notacion/.test(text)) intent.focus = 'powers-of-ten'
    else if (/crecimiento|poblac/.test(text)) intent.focus = 'growth'
    else intent.focus = 'laws'
  }

  if (normalizedTopic === 'raices-cuadradas-cubicas') {
    if (/exact/.test(text)) intent.focus = 'exact-root'
    else if (/aproxim/.test(text)) intent.focus = 'approximation'
    else intent.focus = 'geometric-application'
  }

  if (normalizedTopic === 'notacion-cientifica') {
    if (/convers/.test(text)) intent.focus = 'conversion'
    else if (/operac/.test(text)) intent.focus = 'operations'
    else intent.focus = 'science'
  }

  if (normalizedTopic === 'proporcionalidad-compuesta') {
    if (/velocidad|tiempo|distancia/.test(text)) intent.focus = 'speed-distance'
    else if (/escala/.test(text)) intent.focus = 'scale'
    else intent.focus = 'compound-rule'
  }

  if (normalizedTopic === 'porcentajes-avanzados') {
    if (/aument|sucesiv/.test(text)) intent.focus = 'successive-increase'
    else if (/descuent/.test(text)) intent.focus = 'discount'
    else intent.focus = 'simple-interest'
  }

  if (normalizedTopic === 'polinomios') {
    if (/suma|resta/.test(text)) intent.focus = 'add-subtract'
    else if (/multiplic/.test(text)) intent.focus = 'multiplication'
    else intent.focus = 'numeric-value'
  }

  if (normalizedTopic === 'productos-notables') {
    if (/\(a \+ b\)\^2|suma/.test(text)) intent.focus = 'square-plus'
    else if (/\(a - b\)\^2|diferencia/.test(text)) intent.focus = 'square-minus'
    else intent.focus = 'conjugates'
  }

  if (normalizedTopic === 'factorizacion-basica') {
    if (/factor comun/.test(text)) intent.focus = 'common-factor'
    else if (/diferencia de cuadrados/.test(text)) intent.focus = 'difference-squares'
    else intent.focus = 'simple-trinomial'
  }

  if (normalizedTopic === 'ecuaciones-lineales-dos-pasos') {
    if (/contexto|modela|modelacion/.test(text)) intent.focus = 'context'
    else intent.focus = 'two-step'
  }

  if (normalizedTopic === 'sistemas-ecuaciones') {
    if (/grafic|geometric/.test(text)) intent.focus = 'graph'
    else if (/sustituc/.test(text)) intent.focus = 'substitution'
    else intent.focus = 'context'
  }

  if (normalizedTopic === 'teorema-de-pitagoras') {
    if (/cateto/.test(text)) intent.focus = 'cathetus'
    else if (/contexto|aplicad/.test(text)) intent.focus = 'context'
    else intent.focus = 'hypotenuse'
  }

  if (normalizedTopic === 'areas-compuestas') {
    if (/terreno|plano|real/.test(text)) intent.focus = 'real-world'
    else intent.focus = 'combined-figures'
  }

  if (normalizedTopic === 'semejanza-de-triangulos') {
    if (/razon/.test(text)) intent.focus = 'similarity-ratio'
    else intent.focus = 'proportional-sides'
  }

  if (normalizedTopic === 'media-mediana-moda-rango') {
    if (/mediana/.test(text)) intent.focus = 'median'
    else if (/moda/.test(text)) intent.focus = 'mode'
    else if (/rango/.test(text)) intent.focus = 'range'
    else intent.focus = 'mean'
  }

  if (normalizedTopic === 'probabilidad-compuesta-basica') {
    if (/arbol/.test(text)) intent.focus = 'tree'
    else intent.focus = 'independent'
  }

  if (normalizedTopic === 'funcion-lineal-basica') {
    if (/pendiente/.test(text)) intent.focus = 'slope'
    else if (/graf/.test(text)) intent.focus = 'graph-interpretation'
    else if (/econom|costo|ingreso/.test(text)) intent.focus = 'economic-model'
    else if (/y\s*=\s*m\s*x\s*\+\s*b/.test(text)) intent.focus = 'intercept'
    else intent.focus = 'evaluation'
  }

  if (normalizedTopic === 'productos-notables-completos') {
    if (/cubo/.test(text)) intent.focus = 'binomial-cube'
    else if (/conjugad/.test(text)) intent.focus = 'conjugates'
    else intent.focus = 'geometric-application'
  }

  if (normalizedTopic === 'factorizacion-completa') {
    if (/factor comun/.test(text)) intent.focus = 'common-factor'
    else if (/diferencia de cuadrados/.test(text)) intent.focus = 'difference-squares'
    else if (/trinomio/.test(text)) intent.focus = 'general-trinomial'
    else if (/cubos|suma\/diferencia|suma|diferencia/.test(text)) intent.focus = 'sum-diff-cubes'
    else intent.focus = 'combined'
  }

  if (normalizedTopic === 'fracciones-algebraicas') {
    if (/simplific/.test(text)) intent.focus = 'simplification'
    else if (/restric/.test(text)) intent.focus = 'restrictions'
    else intent.focus = 'operations'
  }

  if (normalizedTopic === 'ecuaciones-cuadraticas') {
    if (/factoriz/.test(text)) intent.focus = 'factorization'
    else if (/formula/.test(text)) intent.focus = 'quadratic-formula'
    else if (/discriminante/.test(text)) intent.focus = 'discriminant'
    else intent.focus = 'real-application'
  }

  if (normalizedTopic === 'sistemas-ecuaciones-2x2-formal') {
    if (/sustituc/.test(text)) intent.focus = 'substitution'
    else if (/igualac/.test(text)) intent.focus = 'equalization'
    else if (/reducc/.test(text)) intent.focus = 'reduction'
    else intent.focus = 'economic-model'
  }

  if (normalizedTopic === 'funcion-lineal-formal') {
    if (/pendiente/.test(text)) intent.focus = 'slope'
    else if (/intersec|interseccion/.test(text)) intent.focus = 'intercept'
    else if (/variacion/.test(text)) intent.focus = 'variation'
    else intent.focus = 'graph-interpretation'
  }

  if (normalizedTopic === 'funcion-cuadratica') {
    if (/canon/.test(text)) intent.focus = 'canonical-form'
    else if (/vertice/.test(text)) intent.focus = 'vertex'
    else if (/maxim|minim|optimiz/.test(text)) intent.focus = 'optimization'
    else intent.focus = 'graph'
  }

  if (normalizedTopic === 'semejanza-triangulos-formal') {
    if (/thales|tales/.test(text)) intent.focus = 'thales'
    else if (/escala/.test(text)) intent.focus = 'scale'
    else intent.focus = 'criteria'
  }

  if (normalizedTopic === 'pitagoras-ampliado') {
    if (/distancia en el plano|plano/.test(text)) intent.focus = 'plane-distance'
    else intent.focus = 'combined-application'
  }

  if (normalizedTopic === 'geometria-analitica-basica') {
    if (/distancia/.test(text)) intent.focus = 'point-distance'
    else if (/punto medio/.test(text)) intent.focus = 'midpoint'
    else intent.focus = 'slope-between-points'
  }

  if (normalizedTopic === 'estadistica-descriptiva-ampliada') {
    if (/varianza/.test(text)) intent.focus = 'variance'
    else if (/graf/.test(text)) intent.focus = 'graph-interpretation'
    else intent.focus = 'comparative-analysis'
  }

  if (normalizedTopic === 'probabilidad-compuesta-formal') {
    if (/dependient/.test(text)) intent.focus = 'dependent-events'
    else if (/condicional/.test(text)) intent.focus = 'conditional-basic'
    else intent.focus = 'tree-formal'
  }

  if (normalizedTopic === 'modelacion-integrada') {
    intent.focus = 'integrated-modeling'
    intent.cognitiveStage = 'multi-step-reasoning'
    if (intent.problemMix !== 'mechanical') {
      intent.problemMix = 'contextualized'
    }
  }

  const hasAdvancedModeling =
    /modelacion avanzada|modelado avanzado|modelacion compleja|modelado complejo|advanced-modeling|complex-modeling/.test(
      text,
    )
  const isFinalExamContext = normalizedId.includes('final-exam')
  const hasMixControl = /mix-control/.test(text)

  if (hasAdvancedModeling) {
    intent.cognitiveStage = 'multi-step-reasoning'
    if (intent.problemMix !== 'mechanical') {
      intent.problemMix = 'contextualized'
    }
  }

  if (isFinalExamContext && hasMixControl && !hasAdvancedModeling && intent.cognitiveStage === 'multi-step-reasoning') {
    intent.cognitiveStage = intent.problemMix === 'mechanical' ? 'direct-application' : 'contextual-analysis'
  }

  if (intent.problemMix === 'mechanical' && !hasAdvancedModeling) {
    intent.cognitiveStage = 'direct-application'
  }

  return intent
}

const finalizeQuestion = ({ grade, topic, difficulty, type, candidate }) => {
  const normalizedCorrect = String(candidate.correctAnswer).trim()
  const candidateDistractors = Array.isArray(candidate.distractors) ? candidate.distractors : []
  const baseOptions = candidate.options?.length
    ? candidate.options.map((option) => String(option))
    : [normalizedCorrect, ...candidateDistractors.map((item) => String(item))]

  let options = []
  if (type === 'multiple-choice') {
    const unique = [...new Set(baseOptions.map((option) => String(option || '').trim()).filter(Boolean))]
    const numericExtras = numericDistractors(normalizedCorrect)
    const combined = [...new Set([...unique, ...numericExtras])].filter(Boolean)

    while (combined.length < 4) {
      combined.push(String(randomInt(1, 20)))
    }

    options = shuffle(combined).slice(0, 4)
    if (!options.includes(normalizedCorrect)) {
      options[randomInt(0, options.length - 1)] = normalizedCorrect
    }
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

  const numericGrade = Number(grade)
  const normalizedGrade = Number.isFinite(numericGrade)
    ? Math.floor(numericGrade)
    : Number(String(grade).match(/\d+/)?.[0] || 1)

  return {
    id: questionId,
    hash,
    fingerprint,
    grade: normalizedGrade,
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

const generateOperacionesBasicas = ({ difficulty, intent = {} }) => {
  const safeDifficulty = clampDifficulty(difficulty)
  const operationSet = ['+', '*', '/']
  const operation = operationSet.includes(intent.forcedOperation) ? intent.forcedOperation : pick(operationSet)

  if (operation === '+') {
    const a = randomInt(20, 80 + safeDifficulty * 10)
    const b = randomInt(15, 70 + safeDifficulty * 10)
    const result = a + b
    return {
      templateId: 'operaciones-basicas-suma',
      prompt: `En una compra escolar se gastan ${a} soles en cuadernos y ${b} soles en utiles. Cuanto se gasto en total?`,
      correctAnswer: String(result),
      distractors: [String(result + 5), String(result - 5), String(result + 10)],
      explanationTemplate:
        'Paso 1: identifica los dos montos de dinero. Paso 2: suma ambos para obtener el total. Resultado: {answer}.',
      fingerprintSeed: { operation, a, b },
    }
  }

  if (operation === '*') {
    const groups = randomInt(3, 8 + safeDifficulty)
    const each = randomInt(4, 12 + safeDifficulty)
    const result = groups * each
    return {
      templateId: 'operaciones-basicas-multiplicacion',
      prompt: `Hay ${groups} cajas y cada caja tiene ${each} fichas. Cuantas fichas hay en total?`,
      correctAnswer: String(result),
      distractors: [String(result + groups), String(result - each), String(result + each)],
      explanationTemplate:
        'Paso 1: identifica cantidad de grupos y elementos por grupo. Paso 2: multiplica para hallar el total. Resultado: {answer}.',
      fingerprintSeed: { operation, groups, each },
    }
  }

  const friends = randomInt(2, 8 + Math.floor(safeDifficulty / 2))
  const eachFriend = randomInt(3, 12 + safeDifficulty)
  const totalItems = friends * eachFriend
  return {
    templateId: 'operaciones-basicas-division',
    prompt: `Se reparten ${totalItems} caramelos en partes iguales entre ${friends} amigos. Cuantos recibe cada uno?`,
    correctAnswer: String(eachFriend),
    distractors: [String(eachFriend + 1), String(Math.max(1, eachFriend - 1)), String(eachFriend + 2)],
    explanationTemplate:
      'Paso 1: identifica total a repartir y numero de personas. Paso 2: divide total entre personas. Resultado: {answer}.',
    fingerprintSeed: { operation, totalItems, friends },
  }
}

const generateJerarquiaOperaciones = ({ difficulty }) => {
  const safeDifficulty = clampDifficulty(difficulty)
  const operators = ['+', '-', '*']

  for (let attempt = 0; attempt < 40; attempt += 1) {
    const op1 = pick(operators)
    const op2 = pick(['+', '-', '*', '/'])
    let a = randomInt(8, 40 + safeDifficulty * 8)
    let b = randomInt(2, 12 + safeDifficulty)
    let c = randomInt(2, 10 + safeDifficulty)

    if (op1 === '-') {
      if (b > a) [a, b] = [b, a]
    }

    const useParentheses = Math.random() < 0.6
    let result = null
    let expression = ''

    if (useParentheses) {
      const left = applyOperator(a, op1, b)
      if (!Number.isFinite(left)) continue

      if (op2 === '/') {
        c = randomInt(2, 12)
        if (left % c !== 0) continue
      }

      result = applyOperator(left, op2, c)
      if (!Number.isFinite(result) || !Number.isInteger(result)) continue
      expression = `(${a} ${op1} ${b}) ${op2} ${c}`
    } else {
      if (op2 === '/') {
        c = randomInt(2, 12)
      }
      result = evaluateThreeTermExpression(a, op1, b, op2, c)
      if (!Number.isFinite(result) || !Number.isInteger(result) || result < 0) continue
      expression = `${a} ${op1} ${b} ${op2} ${c}`
    }

    return {
      templateId: `jerarquia-${op1}${op2}-${useParentheses ? 'p' : 's'}`,
      prompt: `Resuelve respetando la jerarquia de operaciones: ${expression}`,
      correctAnswer: String(result),
      distractors: [String(result + 1), String(Math.max(0, result - 1)), String(result + 2)],
      explanationTemplate:
        'Paso 1: identifica que operaciones van primero (parentesis, multiplicacion/division). Paso 2: completa suma/resta final. Resultado: {answer}.',
      fingerprintSeed: { op1, op2, a, b, c, useParentheses },
    }
  }

  const a = randomInt(10, 35)
  const b = randomInt(2, 10)
  const c = randomInt(2, 10)
  const result = a + b * c
  return {
    templateId: 'jerarquia-fallback',
    prompt: `Resuelve respetando la jerarquia de operaciones: ${a} + ${b} x ${c}`,
    correctAnswer: String(result),
    distractors: [String(a + b + c), String((a + b) * c), String(result + 2)],
    explanationTemplate:
      'Paso 1: realiza multiplicacion antes que suma. Paso 2: suma el resultado con el termino restante. Resultado: {answer}.',
    fingerprintSeed: { a, b, c },
  }
}

const generateDivisibilidad = ({ intent = {}, type }) => {
  const mode = intent.focus || pick(['multiples', 'divisors', 'criteria', 'prime-composite', 'context'])

  if (mode === 'multiples') {
    const base = randomInt(2, 12)
    const position = randomInt(4, 9)
    const result = base * position
    return {
      templateId: 'divisibilidad-multiples',
      prompt: `Cual es el multiplo numero ${position} de ${base}?`,
      correctAnswer: String(result),
      distractors: [String(result + base), String(Math.max(base, result - base)), String(result + 1)],
      explanationTemplate:
        'Paso 1: recuerda que los multiplos se obtienen multiplicando. Paso 2: calcula base x posicion. Resultado: {answer}.',
      fingerprintSeed: { mode, base, position },
    }
  }

  if (mode === 'divisors') {
    const divisor = randomInt(2, 12)
    const quotient = randomInt(3, 16)
    const divisible = Math.random() < 0.5
    const number = divisible ? divisor * quotient : divisor * quotient + randomInt(1, divisor - 1)
    const answer = divisible ? 'si' : 'no'
    return {
      templateId: 'divisibilidad-divisores',
      prompt: `Responde SI o NO: ${number} es divisible entre ${divisor}?`,
      correctAnswer: answer,
      options: type === 'multiple-choice' ? ['si', 'no', 'ninguno', 'ambos'] : [],
      distractors: ['si', 'no'],
      explanationTemplate:
        'Paso 1: divide mentalmente o aplica el criterio de divisibilidad. Paso 2: confirma si el residuo es 0. Resultado: {answer}.',
      fingerprintSeed: { mode, number, divisor, answer },
    }
  }

  if (mode === 'criteria') {
    const divisor = pick([2, 3, 5, 10])
    const correctBase = randomInt(3, 18)
    const correct = divisor * correctBase
    return {
      templateId: `divisibilidad-criterio-${divisor}`,
      prompt: `Selecciona el numero que SI cumple el criterio de divisibilidad entre ${divisor}.`,
      correctAnswer: String(correct),
      options: [
        String(correct),
        String(correct + 1),
        String(correct + divisor - 1),
        String(correct + randomInt(2, 9)),
      ],
      distractors: [],
      explanationTemplate:
        'Paso 1: aplica el criterio del divisor indicado. Paso 2: valida que el residuo sea 0. Resultado: {answer}.',
      fingerprintSeed: { mode, divisor, correct },
    }
  }

  if (mode === 'prime-composite') {
    const bucket = shuffle([2, 3, 5, 7, 11, 13, 17, 19, 21, 22, 24, 25, 27, 29]).slice(0, 1)[0]
    const isPrime = [2, 3, 5, 7, 11, 13, 17, 19, 29].includes(bucket)
    const answer = isPrime ? 'primo' : 'compuesto'
    return {
      templateId: 'divisibilidad-primo-compuesto',
      prompt: `El numero ${bucket} es primo o compuesto?`,
      correctAnswer: answer,
      options: ['primo', 'compuesto', 'ninguno', 'ambos'],
      distractors: ['primo', 'compuesto'].filter((value) => value !== answer),
      explanationTemplate:
        'Paso 1: revisa cuantos divisores exactos tiene el numero. Paso 2: clasifica segun la definicion de primo/compuesto. Resultado: {answer}.',
      fingerprintSeed: { mode, bucket, answer },
    }
  }

  const students = randomInt(18, 54)
  const teamSize = pick([2, 3, 4, 5, 6, 9])
  const canForm = students % teamSize === 0
  return {
    templateId: 'divisibilidad-contexto',
    prompt: `En una actividad hay ${students} estudiantes. Se pueden formar equipos de ${teamSize} sin que sobre nadie? Responde SI o NO.`,
    correctAnswer: canForm ? 'si' : 'no',
    distractors: ['si', 'no'],
    explanationTemplate:
      'Paso 1: divide el total de estudiantes entre el tamano del equipo. Paso 2: verifica si el residuo es cero. Resultado: {answer}.',
    fingerprintSeed: { mode, students, teamSize, canForm },
  }
}

const generateFractions = ({ difficulty, intent = {} }) => {
  const safeDifficulty = clampDifficulty(difficulty)
  const mode = intent.focus || pick(['representation', 'equivalent', 'comparison', 'operations'])

  if (mode === 'representation') {
    const total = randomInt(6, 16)
    const selected = randomInt(1, total - 1)
    const reduced = simplifyFraction(selected, total)
    return {
      templateId: 'fracciones-representacion',
      prompt: `De ${total} tarjetas, ${selected} son azules. Que fraccion del total representa las tarjetas azules?`,
      correctAnswer: formatFraction(reduced.num, reduced.den),
      distractors: [
        formatFraction(selected + 1, total),
        formatFraction(Math.max(1, selected - 1), total),
        formatFraction(total - selected, total),
      ],
      explanationTemplate:
        'Paso 1: identifica partes tomadas y total de partes. Paso 2: forma la fraccion y simplifica si es necesario. Resultado: {answer}.',
      fingerprintSeed: { mode, total, selected },
    }
  }

  if (mode === 'equivalent') {
    const denominator = randomInt(2, 9)
    const numerator = randomInt(1, denominator - 1)
    const factor = randomInt(2, safeDifficulty >= 5 ? 6 : 4)
    return {
      templateId: 'fracciones-equivalentes',
      prompt: `Completa: ${numerator}/${denominator} = x/${denominator * factor}. Cual es el valor de x?`,
      correctAnswer: String(numerator * factor),
      distractors: [String(numerator + factor), String(numerator * factor + 1), String(numerator * factor - 1)],
      explanationTemplate:
        'Paso 1: identifica por cuanto se multiplico el denominador. Paso 2: multiplica el numerador por ese mismo factor. Resultado: {answer}.',
      fingerprintSeed: { mode, numerator, denominator, factor },
    }
  }

  if (mode === 'comparison') {
    const denominator = randomInt(4, 12)
    const left = randomInt(1, denominator - 1)
    const right = randomInt(1, denominator - 1)
    const comparator = left > right ? '>' : left < right ? '<' : '='
    return {
      templateId: 'fracciones-comparacion',
      prompt: `Completa con >, < o = : ${left}/${denominator} ___ ${right}/${denominator}`,
      correctAnswer: comparator,
      distractors: ['>', '<', '='].filter((symbol) => symbol !== comparator),
      explanationTemplate:
        'Paso 1: al tener igual denominador, compara numeradores. Paso 2: coloca el simbolo correcto. Resultado: {answer}.',
      fingerprintSeed: { mode, denominator, left, right },
    }
  }

  const operation = pick(['+', '-', '*'])
  const denA = randomInt(2, 8)
  const denB = operation === '*' ? randomInt(2, 8) : denA
  let numA = randomInt(1, denA - 1)
  let numB = randomInt(1, denB - 1)

  if (operation === '-' && numB > numA) {
    ;[numA, numB] = [numB, numA]
  }

  if (operation === '+') {
    const result = simplifyFraction(numA + numB, denA)
    return {
      templateId: 'fracciones-suma',
      prompt: `Calcula: ${numA}/${denA} + ${numB}/${denB}`,
      correctAnswer: formatFraction(result.num, result.den),
      distractors: [
        formatFraction(result.num + 1, result.den),
        formatFraction(Math.max(1, result.num - 1), result.den),
        formatFraction(result.num, result.den + 1),
      ],
      explanationTemplate:
        'Paso 1: verifica denominador comun. Paso 2: suma numeradores y simplifica. Resultado: {answer}.',
      fingerprintSeed: { mode, operation, numA, denA, numB, denB },
    }
  }

  if (operation === '-') {
    const result = simplifyFraction(numA - numB, denA)
    return {
      templateId: 'fracciones-resta',
      prompt: `Calcula: ${numA}/${denA} - ${numB}/${denB}`,
      correctAnswer: formatFraction(result.num, result.den),
      distractors: [
        formatFraction(result.num + 1, result.den),
        formatFraction(Math.max(0, result.num - 1), result.den),
        formatFraction(result.num, result.den + 1),
      ],
      explanationTemplate:
        'Paso 1: usa denominador comun. Paso 2: resta numeradores y simplifica. Resultado: {answer}.',
      fingerprintSeed: { mode, operation, numA, denA, numB, denB },
    }
  }

  const result = simplifyFraction(numA * numB, denA * denB)
  return {
    templateId: 'fracciones-multiplicacion',
    prompt: `Calcula: ${numA}/${denA} x ${numB}/${denB}`,
    correctAnswer: formatFraction(result.num, result.den),
    distractors: [
      formatFraction(result.num + 1, result.den),
      formatFraction(Math.max(1, result.num - 1), result.den),
      formatFraction(result.num, result.den + 1),
    ],
    explanationTemplate:
      'Paso 1: multiplica numeradores y denominadores. Paso 2: simplifica la fraccion resultante. Resultado: {answer}.',
    fingerprintSeed: { mode, operation, numA, denA, numB, denB },
  }
}

const generateFigurasPlanas = ({ intent = {} }) => {
  const mode = intent.focus || pick(['classification', 'perimeter', 'rectangle-area', 'triangle-area'])

  if (mode === 'classification') {
    const figure = pick([
      { name: 'triangulo', sides: 3 },
      { name: 'cuadrilatero', sides: 4 },
    ])
    return {
      templateId: 'figuras-clasificacion-lados',
      prompt: `Cuantos lados tiene un ${figure.name}?`,
      correctAnswer: String(figure.sides),
      distractors: [String(figure.sides + 1), String(Math.max(1, figure.sides - 1)), String(figure.sides + 2)],
      explanationTemplate:
        'Paso 1: recuerda la definicion de la figura. Paso 2: responde con el numero de lados correspondiente. Resultado: {answer}.',
      fingerprintSeed: { mode, figure: figure.name },
    }
  }

  if (mode === 'perimeter') {
    const a = randomInt(4, 16)
    const b = randomInt(4, 16)
    const perimeter = 2 * (a + b)
    return {
      templateId: 'figuras-perimetro-rectangulo',
      prompt: `Calcula el perimetro de un rectangulo de base ${a} cm y altura ${b} cm.`,
      correctAnswer: String(perimeter),
      distractors: [String(a + b), String(a * b), String(perimeter + 2)],
      explanationTemplate:
        'Paso 1: identifica que el perimetro suma todos los lados. Paso 2: aplica P = 2(base + altura). Resultado: {answer}.',
      fingerprintSeed: { mode, a, b },
    }
  }

  if (mode === 'rectangle-area') {
    const width = randomInt(3, 14)
    const height = randomInt(3, 14)
    const area = width * height
    return {
      templateId: 'figuras-area-rectangulo',
      prompt: `Un rectangulo tiene base ${width} cm y altura ${height} cm. Cual es su area en cm2?`,
      correctAnswer: String(area),
      distractors: [String(width + height), String(2 * (width + height)), String(area + width)],
      explanationTemplate:
        'Paso 1: identifica base y altura. Paso 2: aplica A = base x altura. Resultado: {answer}.',
      fingerprintSeed: { mode, width, height },
    }
  }

  const base = randomInt(4, 18)
  const height = randomInt(3, 12)
  const area = (base * height) / 2
  return {
    templateId: 'figuras-area-triangulo',
    prompt: `Calcula el area de un triangulo con base ${base} cm y altura ${height} cm.`,
    correctAnswer: formatNumericAnswer(area),
    distractors: [formatNumericAnswer(base * height), formatNumericAnswer(area + 2), formatNumericAnswer(area - 1)],
    explanationTemplate:
      'Paso 1: multiplica base por altura. Paso 2: divide entre 2 para obtener el area del triangulo. Resultado: {answer}.',
    fingerprintSeed: { mode, base, height },
  }
}

const generateAngles = ({ intent = {} }) => {
  const mode = intent.focus || pick(['types', 'measurement', 'complements'])

  if (mode === 'types') {
    const value = randomInt(10, 170)
    let answer = 'obtuso'
    if (value < 90) answer = 'agudo'
    if (value === 90) answer = 'recto'
    if (value === 180) answer = 'llano'

    return {
      templateId: 'angulos-tipo',
      prompt: `Un angulo mide ${value} grados. Es agudo, recto, obtuso o llano?`,
      correctAnswer: answer,
      options: ['agudo', 'recto', 'obtuso', 'llano'],
      distractors: ['agudo', 'recto', 'obtuso', 'llano'].filter((item) => item !== answer),
      explanationTemplate:
        'Paso 1: compara la medida con 90 y 180 grados. Paso 2: clasifica segun corresponda. Resultado: {answer}.',
      fingerprintSeed: { mode, value, answer },
    }
  }

  if (mode === 'measurement') {
    const value = randomInt(15, 165)
    return {
      templateId: 'angulos-medicion',
      prompt: `Si el transportador marca ${value} grados, cual es la medida del angulo?`,
      correctAnswer: String(value),
      distractors: [String(value + 10), String(Math.max(1, value - 10)), String(value + 5)],
      explanationTemplate:
        'Paso 1: lee la escala correcta del transportador. Paso 2: reporta la medida en grados. Resultado: {answer}.',
      fingerprintSeed: { mode, value },
    }
  }

  const relation = Math.random() < 0.5 ? 'complementario' : 'suplementario'
  const total = relation === 'complementario' ? 90 : 180
  const angle = relation === 'complementario' ? randomInt(10, 80) : randomInt(20, 160)
  const answer = total - angle

  return {
    templateId: `angulos-${relation}`,
    prompt: `Si un angulo mide ${angle} grados, cuanto mide su angulo ${relation}?`,
    correctAnswer: String(answer),
    distractors: [String(answer + 10), String(Math.max(0, answer - 10)), String(total + angle)],
    explanationTemplate:
      'Paso 1: recuerda la suma total de angulos complementarios o suplementarios. Paso 2: resta el valor conocido. Resultado: {answer}.',
    fingerprintSeed: { mode, relation, angle },
  }
}

const generateAlgebraicExpressions = ({ difficulty, intent = {} }) => {
  const safeDifficulty = clampDifficulty(difficulty)
  const mode = intent.focus || pick(['variables', 'translation', 'evaluation', 'simplification'])

  if (mode === 'translation') {
    const coefficient = randomInt(2, 7)
    const constant = randomInt(1, 12)
    return {
      templateId: 'algebra-traduccion-coeficiente',
      prompt: `En la frase "el ${coefficient}ple de un numero mas ${constant}", cual es el coeficiente del numero?`,
      correctAnswer: String(coefficient),
      distractors: [String(coefficient + 1), String(Math.max(1, coefficient - 1)), String(constant)],
      explanationTemplate:
        'Paso 1: identifica la parte que multiplica a la variable. Paso 2: reporta ese valor como coeficiente. Resultado: {answer}.',
      fingerprintSeed: { mode, coefficient, constant },
    }
  }

  if (mode === 'variables') {
    const n = randomInt(2, 12)
    const extra = randomInt(3, 15)
    const result = n + extra
    return {
      templateId: 'algebra-variable-evaluacion-simple',
      prompt: `Si n = ${n}, cuanto vale n + ${extra}?`,
      correctAnswer: String(result),
      distractors: [String(result + 1), String(result - 1), String(n * extra)],
      explanationTemplate:
        'Paso 1: sustituye la variable por el valor dado. Paso 2: realiza la operacion indicada. Resultado: {answer}.',
      fingerprintSeed: { mode, n, extra },
    }
  }

  if (mode === 'simplification') {
    const a = randomInt(1, 8)
    const b = randomInt(1, 8)
    return {
      templateId: 'algebra-simplificacion-coeficiente',
      prompt: `Simplifica ${a}x + ${b}x. Cual es el coeficiente final de x?`,
      correctAnswer: String(a + b),
      distractors: [String(Math.abs(a - b)), String(a * b), String(a + b + 1)],
      explanationTemplate:
        'Paso 1: identifica terminos semejantes. Paso 2: suma sus coeficientes. Resultado: {answer}.',
      fingerprintSeed: { mode, a, b },
    }
  }

  const x = randomInt(-4, 10)
  const a = randomInt(2, safeDifficulty >= 5 ? 11 : 8)
  const b = randomInt(-10, 14)
  const result = a * x + b
  return {
    templateId: 'algebra-evaluacion-lineal',
    prompt: `Evalua ${a}x ${b >= 0 ? '+' : '-'} ${Math.abs(b)} cuando x = ${x}.`,
    correctAnswer: String(result),
    distractors: [String(result + a), String(result - a), String(a + x + b)],
    explanationTemplate:
      'Paso 1: reemplaza x por el valor indicado. Paso 2: resuelve multiplicacion y luego suma/resta. Resultado: {answer}.',
    fingerprintSeed: { mode, a, b, x },
  }
}

const generateBasicEquation = ({ difficulty, intent = {} }) => {
  const safeDifficulty = clampDifficulty(difficulty)
  const mode = intent.focus || pick(['x-plus-a', 'ax-equals-b', 'two-step', 'context'])

  if (mode === 'x-plus-a') {
    const x = randomInt(1, 28)
    const a = randomInt(1, 20)
    const b = x + a
    return {
      templateId: 'ecuacion-x-plus-a',
      prompt: `Resuelve la ecuacion: x + ${a} = ${b}`,
      correctAnswer: String(x),
      distractors: [String(x + 1), String(Math.max(0, x - 1)), String(b - a + 2)],
      explanationTemplate:
        'Paso 1: aplica la operacion inversa de la suma. Paso 2: verifica reemplazando el valor encontrado. Resultado: {answer}.',
      fingerprintSeed: { mode, x, a, b },
    }
  }

  if (mode === 'ax-equals-b') {
    const x = randomInt(1, 18)
    const a = randomInt(2, 12)
    const b = a * x
    return {
      templateId: 'ecuacion-ax-equals-b',
      prompt: `Resuelve la ecuacion: ${a}x = ${b}`,
      correctAnswer: String(x),
      distractors: [String(x + 1), String(Math.max(0, x - 1)), String(x + 2)],
      explanationTemplate:
        'Paso 1: divide ambos lados entre el coeficiente de x. Paso 2: verifica el valor obtenido. Resultado: {answer}.',
      fingerprintSeed: { mode, x, a, b },
    }
  }

  if (mode === 'context') {
    const price = randomInt(3, 8)
    const fixed = randomInt(2, 15)
    const x = randomInt(3, 12)
    const total = price * x + fixed
    return {
      templateId: 'ecuacion-contexto',
      prompt: `Una papeleria cobra ${price} soles por cuaderno y ${fixed} soles fijos de envio. Si el total fue ${total} soles, cuantos cuadernos se compraron?`,
      correctAnswer: String(x),
      distractors: [String(x + 1), String(Math.max(1, x - 1)), String(x + 2)],
      explanationTemplate:
        'Paso 1: plantea la ecuacion lineal con costo fijo y variable. Paso 2: despeja x y verifica en el contexto. Resultado: {answer}.',
      fingerprintSeed: { mode, price, fixed, x, total },
    }
  }

  const x = randomInt(1, 16)
  const a = randomInt(2, safeDifficulty >= 6 ? 12 : 9)
  const c = randomInt(-12, 14)
  const b = a * x + c
  return {
    templateId: 'ecuacion-dos-operaciones',
    prompt: `Resuelve la ecuacion: ${a}x ${c >= 0 ? '+' : '-'} ${Math.abs(c)} = ${b}`,
    correctAnswer: String(x),
    distractors: [String(x + 2), String(Math.max(0, x - 2)), String(x + 1)],
    explanationTemplate:
      'Paso 1: despeja sumando o restando la constante. Paso 2: divide por el coeficiente de x para obtener el valor. Resultado: {answer}.',
    fingerprintSeed: { mode, x, a, c, b },
  }
}

const generateStatistics = ({ intent = {} }) => {
  const mode = intent.focus || pick(['data-collection', 'frequency', 'bar-chart', 'mean'])

  if (mode === 'data-collection') {
    const values = Array.from({ length: randomInt(5, 9) }, () => randomInt(1, 8))
    return {
      templateId: 'estadistica-recoleccion',
      prompt: `Se registraron estos datos: ${values.join(', ')}. Cuantos datos se recolectaron en total?`,
      correctAnswer: String(values.length),
      distractors: [String(values.length + 1), String(Math.max(1, values.length - 1)), String(values.length + 2)],
      explanationTemplate:
        'Paso 1: identifica cada dato de la lista. Paso 2: cuenta la cantidad total de registros. Resultado: {answer}.',
      fingerprintSeed: { mode, values },
    }
  }

  if (mode === 'frequency') {
    const target = randomInt(1, 5)
    const values = Array.from({ length: randomInt(7, 12) }, () => randomInt(1, 5))
    const freq = values.filter((value) => value === target).length
    return {
      templateId: 'estadistica-frecuencia',
      prompt: `Datos: ${values.join(', ')}. Cual es la frecuencia del valor ${target}?`,
      correctAnswer: String(freq),
      distractors: [String(freq + 1), String(Math.max(0, freq - 1)), String(freq + 2)],
      explanationTemplate:
        'Paso 1: ubica el valor objetivo en la lista. Paso 2: cuenta cuantas veces aparece. Resultado: {answer}.',
      fingerprintSeed: { mode, values, target },
    }
  }

  if (mode === 'bar-chart') {
    const math = randomInt(8, 18)
    const science = randomInt(8, 18)
    const language = randomInt(8, 18)
    const maxValue = Math.max(math, science, language)
    return {
      templateId: 'estadistica-grafico-barras',
      prompt: `En un grafico de barras: Matematica=${math}, Ciencia=${science}, Lengua=${language}. Cual es la barra con mayor frecuencia? Responde con la frecuencia numerica.`,
      correctAnswer: String(maxValue),
      distractors: [String(maxValue - 1), String(maxValue + 1), String(math + science + language)],
      explanationTemplate:
        'Paso 1: compara las alturas o frecuencias de cada barra. Paso 2: selecciona el valor maximo. Resultado: {answer}.',
      fingerprintSeed: { mode, math, science, language },
    }
  }

  const size = randomInt(4, 6)
  const values = Array.from({ length: size }, () => randomInt(4, 20))
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
    fingerprintSeed: { mode, values },
  }
}

const generateProbabilitySimple = ({ intent = {} }) => {
  const mode = intent.focus || pick(['sample-space', 'experiment', 'basic-probability'])

  if (mode === 'sample-space') {
    const diceFaces = 6
    const coinFaces = 2
    const totalOutcomes = diceFaces * coinFaces
    return {
      templateId: 'probabilidad-espacio-muestral',
      prompt: `Si lanzas un dado y una moneda al mismo tiempo, cuantos resultados posibles hay en el espacio muestral?`,
      correctAnswer: String(totalOutcomes),
      distractors: [String(diceFaces + coinFaces), String(diceFaces), String(totalOutcomes + 2)],
      explanationTemplate:
        'Paso 1: identifica resultados posibles de cada experimento. Paso 2: multiplica para obtener el total de casos. Resultado: {answer}.',
      fingerprintSeed: { mode, diceFaces, coinFaces },
    }
  }

  if (mode === 'experiment') {
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
      templateId: 'probabilidad-experimento-bolsa',
      prompt: `Una bolsa tiene ${red} bolas rojas, ${blue} azules y ${green} verdes. Cual es la probabilidad de sacar una bola ${targetColor.name}?`,
      correctAnswer: formatFraction(fraction.num, fraction.den),
      distractors: [
        formatFraction(Math.min(total, targetColor.count + 1), total),
        formatFraction(Math.max(1, targetColor.count - 1), total),
        formatFraction(total - targetColor.count, total),
      ],
      explanationTemplate:
        'Paso 1: cuenta casos favorables y casos totales. Paso 2: forma la fraccion y simplifica. Resultado: {answer}.',
      fingerprintSeed: { mode, red, blue, green, targetColor: targetColor.name },
    }
  }

  const sectors = randomInt(6, 12)
  const favorable = randomInt(1, sectors - 1)
  const fraction = simplifyFraction(favorable, sectors)
  return {
    templateId: 'probabilidad-basica',
    prompt: `Una ruleta tiene ${sectors} sectores iguales y ${favorable} son premios. Cual es la probabilidad de obtener premio en un giro?`,
    correctAnswer: formatFraction(fraction.num, fraction.den),
    distractors: [
      formatFraction(Math.min(sectors, favorable + 1), sectors),
      formatFraction(Math.max(1, favorable - 1), sectors),
      formatFraction(sectors - favorable, sectors),
    ],
    explanationTemplate:
      'Paso 1: determina casos favorables y casos posibles. Paso 2: calcula la fraccion de probabilidad y simplifica. Resultado: {answer}.',
    fingerprintSeed: { mode, sectors, favorable },
  }
}

const generateMeasurement = ({ intent = {} }) => {
  const mode = intent.focus || pick(['length', 'mass', 'capacity', 'conversion'])

  if (mode === 'length') {
    const meters = randomInt(2, 28)
    return {
      templateId: 'medicion-longitud-m-cm',
      prompt: `Convierte ${meters} metros a centimetros.`,
      correctAnswer: String(meters * 100),
      distractors: [String(meters * 10), String(meters * 1000), String(meters + 100)],
      explanationTemplate: 'Paso 1: usa 1 m = 100 cm. Paso 2: multiplica por 100. Resultado: {answer}.',
      fingerprintSeed: { mode, meters },
    }
  }

  if (mode === 'mass') {
    const kilograms = randomInt(1, 18)
    return {
      templateId: 'medicion-masa-kg-g',
      prompt: `Convierte ${kilograms} kilogramos a gramos.`,
      correctAnswer: String(kilograms * 1000),
      distractors: [String(kilograms * 100), String(kilograms * 10), String(kilograms + 1000)],
      explanationTemplate: 'Paso 1: usa 1 kg = 1000 g. Paso 2: multiplica por 1000. Resultado: {answer}.',
      fingerprintSeed: { mode, kilograms },
    }
  }

  if (mode === 'capacity') {
    const liters = randomInt(1, 20)
    return {
      templateId: 'medicion-capacidad-l-ml',
      prompt: `Convierte ${liters} litros a mililitros.`,
      correctAnswer: String(liters * 1000),
      distractors: [String(liters * 100), String(liters * 10), String(liters + 1000)],
      explanationTemplate: 'Paso 1: usa 1 L = 1000 mL. Paso 2: multiplica por 1000. Resultado: {answer}.',
      fingerprintSeed: { mode, liters },
    }
  }

  const options = pick([
    { from: 'm', to: 'cm', factor: 100 },
    { from: 'cm', to: 'm', factor: 0.01 },
    { from: 'kg', to: 'g', factor: 1000 },
    { from: 'g', to: 'kg', factor: 0.001 },
    { from: 'l', to: 'ml', factor: 1000 },
    { from: 'ml', to: 'l', factor: 0.001 },
  ])
  const value = randomInt(2, 25)
  const converted = value * options.factor
  return {
    templateId: `medicion-conversion-${options.from}-${options.to}`,
    prompt: `Convierte ${value} ${options.from} a ${options.to}.`,
    correctAnswer: formatNumericAnswer(converted),
    distractors: [
      formatNumericAnswer(converted * 10),
      formatNumericAnswer(converted / 10),
      formatNumericAnswer(converted + 1),
    ],
    explanationTemplate:
      'Paso 1: identifica el factor de conversion entre unidades. Paso 2: multiplica o divide segun corresponda. Resultado: {answer}.',
    fingerprintSeed: { mode, value, ...options },
  }
}

const generatePowersProperties = ({ difficulty, intent = {} }) => {
  const safeDifficulty = clampDifficulty(difficulty)
  const mode = intent.focus || pick(['laws', 'negative-base', 'powers-of-ten', 'growth'])

  if (mode === 'laws') {
    const base = randomInt(2, 6 + Math.floor(safeDifficulty / 2))
    const expA = randomInt(2, 4)
    const expB = randomInt(2, 5)
    const result = Math.pow(base, expA + expB)
    return {
      templateId: 'potencias-leyes-exponentes',
      prompt: `Calcula ${base}^${expA} x ${base}^${expB}.`,
      correctAnswer: String(result),
      distractors: [String(Math.pow(base, expA * expB)), String(Math.pow(base, Math.max(1, expA - expB))), String(result + base)],
      explanationTemplate:
        'Paso 1: aplica la ley de potencia de igual base sumando exponentes. Paso 2: evalua la potencia resultante. Resultado: {answer}.',
      fingerprintSeed: { mode, base, expA, expB },
    }
  }

  if (mode === 'negative-base') {
    const base = randomInt(2, 9)
    const exponent = randomInt(2, 6)
    const result = Math.pow(-base, exponent)
    return {
      templateId: 'potencias-base-negativa',
      prompt: `Evalua (-${base})^${exponent}.`,
      correctAnswer: String(result),
      distractors: [String(Math.pow(base, exponent)), String(-Math.pow(base, exponent - 1)), String(result + base)],
      explanationTemplate:
        'Paso 1: identifica si el exponente es par o impar para el signo. Paso 2: calcula el valor absoluto de la potencia. Resultado: {answer}.',
      fingerprintSeed: { mode, base, exponent },
    }
  }

  if (mode === 'powers-of-ten') {
    const coefficient = randomInt(2, 9)
    const exponent = randomInt(2, 6)
    const result = coefficient * Math.pow(10, exponent)
    return {
      templateId: 'potencias-de-diez',
      prompt: `Calcula ${coefficient} x 10^${exponent}.`,
      correctAnswer: String(result),
      distractors: [String(coefficient * Math.pow(10, exponent - 1)), String(coefficient * Math.pow(10, exponent + 1)), String(result + 10)],
      explanationTemplate:
        'Paso 1: interpreta 10^n como desplazamiento decimal. Paso 2: multiplica el coeficiente por la potencia de diez. Resultado: {answer}.',
      fingerprintSeed: { mode, coefficient, exponent },
    }
  }

  const initialPopulation = randomInt(12, 36) * 100
  const annualRate = pick([10, 20, 25])
  const years = randomInt(2, 3)
  const result = initialPopulation * Math.pow(1 + annualRate / 100, years)
  return {
    templateId: 'potencias-crecimiento',
    prompt: `Una poblacion inicial de ${initialPopulation} personas crece ${annualRate}% anual durante ${years} anos. Cual es la poblacion aproximada al final?`,
    correctAnswer: formatNumericAnswer(result),
    distractors: [
      formatNumericAnswer(initialPopulation * (1 + annualRate / 100) * years),
      formatNumericAnswer(initialPopulation + initialPopulation * (annualRate / 100) * years),
      formatNumericAnswer(result + initialPopulation * 0.1),
    ],
    explanationTemplate:
      'Paso 1: usa un modelo de crecimiento multiplicativo con potencia. Paso 2: evalua el resultado tras el numero de anos. Resultado: {answer}.',
    fingerprintSeed: { mode, initialPopulation, annualRate, years },
  }
}

const generateRootsSquaresCubes = ({ intent = {} }) => {
  const mode = intent.focus || pick(['exact-root', 'approximation', 'geometric-application'])

  if (mode === 'exact-root') {
    if (Math.random() < 0.5) {
      const root = randomInt(4, 20)
      const radicand = root * root
      return {
        templateId: 'raices-cuadradas-exacta',
        prompt: `Calcula la raiz cuadrada exacta de ${radicand}.`,
        correctAnswer: String(root),
        distractors: [String(root + 1), String(Math.max(1, root - 1)), String(Math.floor(radicand / 2))],
        explanationTemplate:
          'Paso 1: identifica si el numero es cuadrado perfecto. Paso 2: encuentra el valor cuyo cuadrado produce el radicando. Resultado: {answer}.',
        fingerprintSeed: { mode, kind: 'square', root, radicand },
      }
    }

    const root = randomInt(2, 10)
    const radicand = root * root * root
    return {
      templateId: 'raices-cubicas-exacta',
      prompt: `Calcula la raiz cubica exacta de ${radicand}.`,
      correctAnswer: String(root),
      distractors: [String(root + 1), String(Math.max(1, root - 1)), String(root * 2)],
      explanationTemplate:
        'Paso 1: reconoce un cubo perfecto. Paso 2: halla el valor cuyo cubo coincide con el radicando. Resultado: {answer}.',
      fingerprintSeed: { mode, kind: 'cube', root, radicand },
    }
  }

  if (mode === 'approximation') {
    const options = [18, 20, 27, 50, 72, 90]
    const radicand = pick(options)
    const approximation = Math.round(Math.sqrt(radicand) * 10) / 10
    return {
      templateId: 'raices-aproximacion',
      prompt: `Aproxima sqrt(${radicand}) a una decimal.`,
      correctAnswer: formatNumericAnswer(approximation),
      distractors: [
        formatNumericAnswer(approximation + 0.2),
        formatNumericAnswer(Math.max(0.1, approximation - 0.2)),
        formatNumericAnswer(approximation + 0.5),
      ],
      explanationTemplate:
        'Paso 1: ubica el radicando entre cuadrados perfectos cercanos. Paso 2: estima el valor decimal de la raiz. Resultado: {answer}.',
      fingerprintSeed: { mode, radicand },
    }
  }

  if (Math.random() < 0.5) {
    const side = randomInt(5, 18)
    const area = side * side
    return {
      templateId: 'raices-geometria-cuadrado',
      prompt: `Un cuadrado tiene area ${area} cm2. Cuanto mide su lado?`,
      correctAnswer: String(side),
      distractors: [String(side + 1), String(Math.max(1, side - 1)), String(Math.floor(area / 2))],
      explanationTemplate:
        'Paso 1: usa que el area de un cuadrado es lado^2. Paso 2: aplica raiz cuadrada al area para hallar el lado. Resultado: {answer}.',
      fingerprintSeed: { mode, figure: 'square', side, area },
    }
  }

  const edge = randomInt(2, 9)
  const volume = edge * edge * edge
  return {
    templateId: 'raices-geometria-cubo',
    prompt: `Un cubo tiene volumen ${volume} cm3. Cuanto mide su arista?`,
    correctAnswer: String(edge),
    distractors: [String(edge + 1), String(Math.max(1, edge - 1)), String(edge * 2)],
    explanationTemplate:
      'Paso 1: usa que el volumen de un cubo es arista^3. Paso 2: aplica raiz cubica para recuperar la arista. Resultado: {answer}.',
    fingerprintSeed: { mode, figure: 'cube', edge, volume },
  }
}

const generateScientificNotation = ({ intent = {} }) => {
  const mode = intent.focus || pick(['conversion', 'operations', 'science'])

  if (mode === 'conversion') {
    const coefficient = randomInt(2, 9)
    const exponent = randomInt(3, 7)
    const expanded = coefficient * Math.pow(10, exponent)
    return {
      templateId: 'notacion-cientifica-conversion',
      prompt: `El numero ${expanded} se escribe como ${coefficient} x 10^n. Cual es n?`,
      correctAnswer: String(exponent),
      distractors: [String(exponent - 1), String(exponent + 1), String(coefficient)],
      explanationTemplate:
        'Paso 1: identifica cuantos lugares se desplaza el decimal del coeficiente. Paso 2: ese desplazamiento determina el exponente. Resultado: {answer}.',
      fingerprintSeed: { mode, coefficient, exponent, expanded },
    }
  }

  if (mode === 'operations') {
    const expA = randomInt(2, 6)
    const expB = randomInt(2, 6)
    const coeffA = randomInt(2, 9)
    const coeffB = randomInt(2, 9)
    const exponentResult = expA + expB
    return {
      templateId: 'notacion-cientifica-operaciones',
      prompt: `En (${coeffA} x 10^${expA}) x (${coeffB} x 10^${expB}), cual es el exponente total de 10 antes de normalizar coeficiente?`,
      correctAnswer: String(exponentResult),
      distractors: [String(Math.max(0, expA - expB)), String(expA * expB), String(exponentResult + 1)],
      explanationTemplate:
        'Paso 1: al multiplicar potencias de 10 se suman exponentes. Paso 2: reporta el exponente total obtenido. Resultado: {answer}.',
      fingerprintSeed: { mode, expA, expB, coeffA, coeffB },
    }
  }

  const coefficient = randomInt(2, 9)
  return {
    templateId: 'notacion-cientifica-ciencia',
    prompt: `Una celula mide ${coefficient} x 10^-6 metros. Cuantos micrometros mide la celula?`,
    correctAnswer: String(coefficient),
    distractors: [String(coefficient * 10), String(Math.max(1, coefficient - 1)), String(coefficient + 1)],
    explanationTemplate:
      'Paso 1: recuerda que 1 micrometro equivale a 10^-6 metros. Paso 2: compara unidades para leer directamente el coeficiente. Resultado: {answer}.',
    fingerprintSeed: { mode, coefficient },
  }
}

const generateCompoundProportionality = ({ intent = {} }) => {
  const mode = intent.focus || pick(['compound-rule', 'speed-distance', 'scale'])

  if (mode === 'compound-rule') {
    const machinesA = randomInt(2, 6)
    const hoursA = randomInt(2, 5)
    const productivity = randomInt(5, 14)
    const piecesA = machinesA * hoursA * productivity
    const machinesB = machinesA + randomInt(1, 3)
    const hoursB = hoursA + randomInt(1, 3)
    const piecesB = machinesB * hoursB * productivity
    return {
      templateId: 'proporcionalidad-regla-compuesta',
      prompt: `${machinesA} maquinas producen ${piecesA} piezas en ${hoursA} horas. Cuantas piezas produciran ${machinesB} maquinas en ${hoursB} horas, al mismo ritmo?`,
      correctAnswer: String(piecesB),
      distractors: [String(piecesA + piecesB), String(Math.max(1, piecesB - productivity)), String(piecesB + productivity)],
      explanationTemplate:
        'Paso 1: identifica magnitudes directamente proporcionales (maquinas y tiempo). Paso 2: escala la produccion con ambas razones. Resultado: {answer}.',
      fingerprintSeed: { mode, machinesA, hoursA, piecesA, machinesB, hoursB, productivity },
    }
  }

  if (mode === 'speed-distance') {
    const speed = randomInt(40, 110)
    const hours = randomInt(2, 6)
    const distance = speed * hours
    return {
      templateId: 'proporcionalidad-velocidad-tiempo-distancia',
      prompt: `Un vehiculo viaja a ${speed} km/h durante ${hours} horas. Que distancia recorre?`,
      correctAnswer: String(distance),
      distractors: [String(speed + hours), String(Math.max(1, distance - speed)), String(distance + speed)],
      explanationTemplate:
        'Paso 1: usa la relacion distancia = velocidad x tiempo. Paso 2: sustituye y calcula. Resultado: {answer}.',
      fingerprintSeed: { mode, speed, hours, distance },
    }
  }

  const scale = pick([10000, 25000, 50000])
  const mapDistanceCm = pick([2, 4, 6, 8, 10])
  const realDistanceKm = (mapDistanceCm * scale) / 100000
  return {
    templateId: 'proporcionalidad-escalas',
    prompt: `En un plano a escala 1:${scale}, una distancia mide ${mapDistanceCm} cm. Cuantos km representa en la realidad?`,
    correctAnswer: formatNumericAnswer(realDistanceKm),
    distractors: [
      formatNumericAnswer(realDistanceKm * 10),
      formatNumericAnswer(realDistanceKm / 10),
      formatNumericAnswer(realDistanceKm + 1),
    ],
    explanationTemplate:
      'Paso 1: convierte la medida del plano usando la escala. Paso 2: transforma la distancia real a kilometros. Resultado: {answer}.',
    fingerprintSeed: { mode, scale, mapDistanceCm, realDistanceKm },
  }
}

const generateAdvancedPercentages = ({ intent = {} }) => {
  const mode = intent.focus || pick(['successive-increase', 'discount', 'simple-interest'])

  if (mode === 'successive-increase') {
    const initialPrice = pick([200, 300, 400, 500, 600, 800])
    const riseA = pick([10, 15, 20])
    const riseB = pick([5, 10, 20])
    const result = initialPrice * (1 + riseA / 100) * (1 + riseB / 100)
    return {
      templateId: 'porcentajes-aumentos-sucesivos',
      prompt: `Un articulo cuesta ${initialPrice} soles. Sube ${riseA}% y luego ${riseB}%. Cual es el precio final?`,
      correctAnswer: formatNumericAnswer(result),
      distractors: [
        formatNumericAnswer(initialPrice * (1 + (riseA + riseB) / 100)),
        formatNumericAnswer(initialPrice + initialPrice * (riseA / 100) + initialPrice * (riseB / 100)),
        formatNumericAnswer(result + initialPrice * 0.05),
      ],
      explanationTemplate:
        'Paso 1: aplica el primer porcentaje sobre el valor inicial. Paso 2: aplica el segundo porcentaje sobre el nuevo valor. Resultado: {answer}.',
      fingerprintSeed: { mode, initialPrice, riseA, riseB },
    }
  }

  if (mode === 'discount') {
    const listPrice = pick([180, 240, 300, 360, 420, 500, 700])
    const discount = pick([10, 15, 20, 25, 30])
    const finalPrice = listPrice * (1 - discount / 100)
    return {
      templateId: 'porcentajes-descuentos',
      prompt: `Un producto de ${listPrice} soles tiene descuento de ${discount}%. Cual es el precio final?`,
      correctAnswer: formatNumericAnswer(finalPrice),
      distractors: [
        formatNumericAnswer(listPrice * (discount / 100)),
        formatNumericAnswer(listPrice * (1 + discount / 100)),
        formatNumericAnswer(finalPrice + 10),
      ],
      explanationTemplate:
        'Paso 1: calcula el monto del descuento porcentual. Paso 2: resta ese monto al precio original. Resultado: {answer}.',
      fingerprintSeed: { mode, listPrice, discount },
    }
  }

  const principal = pick([500, 800, 1000, 1200, 1500, 2000])
  const annualRate = pick([5, 8, 10, 12])
  const years = randomInt(2, 5)
  const totalAmount = principal * (1 + (annualRate / 100) * years)
  return {
    templateId: 'porcentajes-interes-simple',
    prompt: `Se invierten ${principal} soles al ${annualRate}% anual por ${years} anos con interes simple. Cual es el monto final?`,
    correctAnswer: formatNumericAnswer(totalAmount),
    distractors: [
      formatNumericAnswer(principal * Math.pow(1 + annualRate / 100, years)),
      formatNumericAnswer(principal + principal * (annualRate / 100)),
      formatNumericAnswer(totalAmount + principal * 0.1),
    ],
    explanationTemplate:
      'Paso 1: usa la formula de interes simple I = P x r x t. Paso 2: suma el interes al capital inicial. Resultado: {answer}.',
    fingerprintSeed: { mode, principal, annualRate, years },
  }
}

const generatePolynomials = ({ intent = {} }) => {
  const mode = intent.focus || pick(['add-subtract', 'multiplication', 'numeric-value'])

  if (mode === 'add-subtract') {
    const operation = Math.random() < 0.5 ? '+' : '-'
    const a = randomInt(2, 10)
    const c = randomInt(2, 10)
    const b = randomInt(-12, 12)
    const d = randomInt(-12, 12)
    const coefficient = operation === '+' ? a + c : a - c
    return {
      templateId: 'polinomios-suma-resta-coeficiente',
      prompt: `Si P(x) = ${a}x ${b >= 0 ? '+' : '-'} ${Math.abs(b)} y Q(x) = ${c}x ${d >= 0 ? '+' : '-'} ${Math.abs(d)}, cual es el coeficiente de x en P(x) ${operation} Q(x)?`,
      correctAnswer: String(coefficient),
      distractors: [String(a * c), String(a + c + 1), String(coefficient + 2)],
      explanationTemplate:
        'Paso 1: combina terminos semejantes en x segun la operacion. Paso 2: identifica el coeficiente final de x. Resultado: {answer}.',
      fingerprintSeed: { mode, operation, a, b, c, d, coefficient },
    }
  }

  if (mode === 'multiplication') {
    const a = randomInt(2, 9)
    const b = randomInt(1, 8)
    const c = randomInt(2, 9)
    const coefficientX2 = a * c
    return {
      templateId: 'polinomios-multiplicacion-coeficiente-x2',
      prompt: `En (${a}x ${b >= 0 ? '+' : '-'} ${Math.abs(b)})(${c}x + 1), cual es el coeficiente de x^2?`,
      correctAnswer: String(coefficientX2),
      distractors: [String(a + c), String(a * b), String(coefficientX2 + 1)],
      explanationTemplate:
        'Paso 1: ubica los terminos que generan x^2 al multiplicar. Paso 2: multiplica sus coeficientes. Resultado: {answer}.',
      fingerprintSeed: { mode, a, b, c, coefficientX2 },
    }
  }

  const x = randomInt(-3, 8)
  const a = randomInt(1, 6)
  const b = randomInt(-10, 10)
  const c = randomInt(-12, 12)
  const value = a * x * x + b * x + c
  return {
    templateId: 'polinomios-valor-numerico',
    prompt: `Evalua ${a}x^2 ${b >= 0 ? '+' : '-'} ${Math.abs(b)}x ${c >= 0 ? '+' : '-'} ${Math.abs(c)} cuando x = ${x}.`,
    correctAnswer: String(value),
    distractors: [String(value + a), String(value - a), String(a + b + c + x)],
    explanationTemplate:
      'Paso 1: sustituye el valor de x en cada termino. Paso 2: resuelve potencias, productos y sumas/restas. Resultado: {answer}.',
    fingerprintSeed: { mode, x, a, b, c, value },
  }
}

const generateNotableProducts = ({ intent = {} }) => {
  const mode = intent.focus || pick(['square-plus', 'square-minus', 'conjugates'])

  if (mode === 'square-plus') {
    const a = randomInt(2, 15)
    const b = randomInt(2, 15)
    const result = (a + b) * (a + b)
    return {
      templateId: 'productos-notables-cuadrado-suma',
      prompt: `Calcula (${a} + ${b})^2.`,
      correctAnswer: String(result),
      distractors: [String(a * a + b * b), String((a + b) * 2), String(result + 1)],
      explanationTemplate:
        'Paso 1: identifica el notable cuadrado de una suma. Paso 2: evalua numericamente la expresion. Resultado: {answer}.',
      fingerprintSeed: { mode, a, b, result },
    }
  }

  if (mode === 'square-minus') {
    const a = randomInt(6, 18)
    const b = randomInt(2, Math.min(9, a - 1))
    const result = (a - b) * (a - b)
    return {
      templateId: 'productos-notables-cuadrado-diferencia',
      prompt: `Calcula (${a} - ${b})^2.`,
      correctAnswer: String(result),
      distractors: [String(a * a - b * b), String((a - b) * 2), String(result + b)],
      explanationTemplate:
        'Paso 1: reconoce el notable cuadrado de diferencia. Paso 2: evalua el valor resultante. Resultado: {answer}.',
      fingerprintSeed: { mode, a, b, result },
    }
  }

  const a = randomInt(6, 22)
  const b = randomInt(2, 10)
  const result = a * a - b * b
  return {
    templateId: 'productos-notables-conjugados',
    prompt: `Calcula (${a} + ${b})(${a} - ${b}).`,
    correctAnswer: String(result),
    distractors: [String((a + b) * (a + b)), String((a - b) * (a - b)), String(result + a)],
    explanationTemplate:
      'Paso 1: usa la identidad (a+b)(a-b) = a^2 - b^2. Paso 2: calcula la diferencia de cuadrados. Resultado: {answer}.',
    fingerprintSeed: { mode, a, b, result },
  }
}

const generateBasicFactorization = ({ intent = {} }) => {
  const mode = intent.focus || pick(['common-factor', 'difference-squares', 'simple-trinomial'])

  if (mode === 'common-factor') {
    const factor = randomInt(2, 9)
    const left = factor * randomInt(2, 8)
    const right = factor * randomInt(2, 8)
    return {
      templateId: 'factorizacion-factor-comun',
      prompt: `En la expresion ${left}x + ${right}, cual es el factor comun numerico maximo?`,
      correctAnswer: String(gcd(left, right)),
      distractors: [String(factor + 1), String(Math.max(1, factor - 1)), String(Math.min(left, right))],
      explanationTemplate:
        'Paso 1: identifica divisores comunes de los coeficientes. Paso 2: selecciona el mayor factor comun. Resultado: {answer}.',
      fingerprintSeed: { mode, factor, left, right },
    }
  }

  if (mode === 'difference-squares') {
    const value = randomInt(3, 14)
    const square = value * value
    return {
      templateId: 'factorizacion-diferencia-cuadrados',
      prompt: `Completa: x^2 - ${square} = (x - ?)(x + ?). Cual es el valor faltante?`,
      correctAnswer: String(value),
      distractors: [String(value + 1), String(Math.max(1, value - 1)), String(square)],
      explanationTemplate:
        'Paso 1: reconoce una diferencia de cuadrados perfectos. Paso 2: toma la raiz cuadrada del termino constante. Resultado: {answer}.',
      fingerprintSeed: { mode, value, square },
    }
  }

  const p = randomInt(1, 9)
  const q = randomInt(1, 9)
  const sum = p + q
  const product = p * q
  return {
    templateId: 'factorizacion-trinomio-simple',
    prompt: `Si x^2 + ${sum}x + ${product} = (x + ${p})(x + ?), cual es el valor faltante?`,
    correctAnswer: String(q),
    distractors: [String(sum), String(product), String(Math.max(1, q - 1))],
    explanationTemplate:
      'Paso 1: compara el trinomio con el producto de binomios. Paso 2: identifica el termino que completa la suma y el producto correctos. Resultado: {answer}.',
    fingerprintSeed: { mode, p, q, sum, product },
  }
}

const generateTwoStepLinearEquations = ({ intent = {} }) => {
  const mode = intent.focus || 'two-step'
  const x = randomInt(1, 18)
  const a = randomInt(2, 10)
  const b = randomInt(-16, 16)
  const c = a * x + b

  if (mode === 'context') {
    const fixedCost = randomInt(4, 20)
    const unitCost = randomInt(2, 9)
    const units = randomInt(3, 14)
    const total = unitCost * units + fixedCost
    return {
      templateId: 'ecuaciones-dos-pasos-contexto',
      prompt: `Un servicio cobra ${fixedCost} soles fijos y ${unitCost} soles por unidad. Si el total fue ${total} soles, cuantas unidades se consumieron?`,
      correctAnswer: String(units),
      distractors: [String(units + 1), String(Math.max(1, units - 1)), String(units + 2)],
      explanationTemplate:
        'Paso 1: plantea la ecuacion lineal de dos pasos con costo fijo y variable. Paso 2: despeja la variable y verifica. Resultado: {answer}.',
      fingerprintSeed: { mode, fixedCost, unitCost, units, total },
    }
  }

  return {
    templateId: 'ecuaciones-dos-pasos-lineal',
    prompt: `Resuelve la ecuacion: ${a}x ${b >= 0 ? '+' : '-'} ${Math.abs(b)} = ${c}`,
    correctAnswer: String(x),
    distractors: [String(x + 1), String(Math.max(0, x - 1)), String(x + 2)],
    explanationTemplate:
      'Paso 1: elimina la constante con la operacion inversa. Paso 2: divide por el coeficiente de x para despejar. Resultado: {answer}.',
    fingerprintSeed: { mode, a, b, c, x },
  }
}

const generateSystemsEquations = ({ intent = {} }) => {
  const mode = intent.focus || pick(['graph', 'substitution', 'context'])

  if (mode === 'graph') {
    const x = randomInt(1, 10)
    const y = randomInt(1, 10)
    const sum = x + y
    const diff = x - y
    return {
      templateId: 'sistemas-grafico-interseccion',
      prompt: `Resuelve el sistema: x + y = ${sum}, x - y = ${diff}. Cual es el valor de x?`,
      correctAnswer: String(x),
      distractors: [String(y), String(x + 1), String(Math.max(0, x - 1))],
      explanationTemplate:
        'Paso 1: combina ecuaciones para hallar el punto de interseccion. Paso 2: extrae el valor de x de la solucion. Resultado: {answer}.',
      fingerprintSeed: { mode, x, y, sum, diff },
    }
  }

  if (mode === 'substitution') {
    const x = randomInt(1, 8)
    const m = randomInt(2, 4)
    const n = randomInt(-5, 8)
    const y = m * x + n
    const a = randomInt(1, 5)
    const b = a * x + y
    return {
      templateId: 'sistemas-sustitucion',
      prompt: `En el sistema y = ${m}x ${n >= 0 ? '+' : '-'} ${Math.abs(n)} y ${a}x + y = ${b}, cual es el valor de y?`,
      correctAnswer: String(y),
      distractors: [String(y + 1), String(Math.max(0, y - 1)), String(x)],
      explanationTemplate:
        'Paso 1: sustituye la primera ecuacion en la segunda. Paso 2: resuelve para x y recupera y. Resultado: {answer}.',
      fingerprintSeed: { mode, x, y, m, n, a, b },
    }
  }

  const adultPrice = randomInt(10, 18)
  const studentPrice = adultPrice - randomInt(3, 6)
  const adultTickets = randomInt(4, 10)
  const studentTickets = randomInt(6, 14)
  const totalTickets = adultTickets + studentTickets
  const totalRevenue = adultPrice * adultTickets + studentPrice * studentTickets
  return {
    templateId: 'sistemas-contexto',
    prompt: `En un cine se vendieron ${totalTickets} entradas entre adultos y estudiantes. La entrada de adulto cuesta ${adultPrice} soles y la de estudiante ${studentPrice} soles. Si se recaudo ${totalRevenue} soles, cuantas entradas de adulto se vendieron?`,
    correctAnswer: String(adultTickets),
    distractors: [String(adultTickets + 1), String(Math.max(0, adultTickets - 1)), String(studentTickets)],
    explanationTemplate:
      'Paso 1: plantea dos ecuaciones (cantidad total y recaudacion total). Paso 2: resuelve el sistema para hallar la cantidad de adultos. Resultado: {answer}.',
    fingerprintSeed: {
      mode,
      adultPrice,
      studentPrice,
      adultTickets,
      studentTickets,
      totalTickets,
      totalRevenue,
    },
  }
}

const generatePythagoras = ({ intent = {} }) => {
  const mode = intent.focus || pick(['hypotenuse', 'cathetus', 'context'])
  const triples = [
    [3, 4, 5],
    [5, 12, 13],
    [8, 15, 17],
    [7, 24, 25],
    [9, 12, 15],
  ]
  const [a, b, c] = pick(triples)

  if (mode === 'cathetus') {
    return {
      templateId: 'pitagoras-cateto',
      prompt: `En un triangulo rectangulo, la hipotenusa mide ${c} y un cateto mide ${a}. Cuanto mide el otro cateto?`,
      correctAnswer: String(b),
      distractors: [String(a), String(c - a), String(b + 1)],
      explanationTemplate:
        'Paso 1: aplica a^2 + b^2 = c^2 y despeja el cateto faltante. Paso 2: calcula la raiz cuadrada del resultado. Resultado: {answer}.',
      fingerprintSeed: { mode, a, b, c },
    }
  }

  if (mode === 'context') {
    return {
      templateId: 'pitagoras-contexto-escalera',
      prompt: `Una escalera de ${c} m se apoya en una pared y su base queda a ${a} m de la pared. Que altura alcanza en la pared?`,
      correctAnswer: String(b),
      distractors: [String(a + b), String(c - b), String(Math.max(1, b - 1))],
      explanationTemplate:
        'Paso 1: modela la situacion como triangulo rectangulo. Paso 2: aplica Pitagoras para hallar la altura. Resultado: {answer}.',
      fingerprintSeed: { mode, a, b, c },
    }
  }

  return {
    templateId: 'pitagoras-hipotenusa',
    prompt: `En un triangulo rectangulo con catetos ${a} y ${b}, cuanto mide la hipotenusa?`,
    correctAnswer: String(c),
    distractors: [String(a + b), String(Math.abs(a - b)), String(c + 1)],
    explanationTemplate:
      'Paso 1: suma los cuadrados de los catetos. Paso 2: aplica raiz cuadrada para obtener la hipotenusa. Resultado: {answer}.',
    fingerprintSeed: { mode, a, b, c },
  }
}

const generateCompositeAreas = ({ intent = {} }) => {
  const mode = intent.focus || pick(['combined-figures', 'real-world'])

  if (mode === 'combined-figures') {
    const rectBase = randomInt(8, 20)
    const rectHeight = randomInt(4, 12)
    const triBase = rectBase
    let triHeight = randomInt(4, 10)
    if ((triBase * triHeight) % 2 !== 0) triHeight += 1
    const area = rectBase * rectHeight + (triBase * triHeight) / 2
    return {
      templateId: 'areas-compuestas-combinadas',
      prompt: `Una figura combina un rectangulo (${rectBase} x ${rectHeight}) y un triangulo encima de base ${triBase} y altura ${triHeight}. Cual es el area total?`,
      correctAnswer: formatNumericAnswer(area),
      distractors: [
        formatNumericAnswer(rectBase * rectHeight),
        formatNumericAnswer((triBase * triHeight) / 2),
        formatNumericAnswer(area + rectHeight),
      ],
      explanationTemplate:
        'Paso 1: calcula el area de cada figura por separado. Paso 2: suma las areas parciales para obtener el total. Resultado: {answer}.',
      fingerprintSeed: { mode, rectBase, rectHeight, triBase, triHeight, area },
    }
  }

  const outerWidth = randomInt(12, 24)
  const outerHeight = randomInt(10, 20)
  const cutWidth = randomInt(3, Math.max(4, Math.floor(outerWidth / 2)))
  const cutHeight = randomInt(3, Math.max(4, Math.floor(outerHeight / 2)))
  const area = outerWidth * outerHeight - cutWidth * cutHeight
  return {
    templateId: 'areas-compuestas-terreno',
    prompt: `Un terreno en forma de L se obtiene de un rectangulo ${outerWidth} x ${outerHeight} quitando un rectangulo interno ${cutWidth} x ${cutHeight}. Cual es el area del terreno?`,
    correctAnswer: String(area),
    distractors: [String(outerWidth * outerHeight), String(cutWidth * cutHeight), String(area + cutWidth)],
    explanationTemplate:
      'Paso 1: calcula el area del rectangulo grande. Paso 2: resta el recorte interno para obtener el area compuesta. Resultado: {answer}.',
    fingerprintSeed: { mode, outerWidth, outerHeight, cutWidth, cutHeight, area },
  }
}

const generateTriangleSimilarity = ({ intent = {} }) => {
  const mode = intent.focus || pick(['proportional-sides', 'similarity-ratio'])

  if (mode === 'similarity-ratio') {
    const ratio = randomInt(2, 4)
    const small = randomInt(4, 12)
    const large = small * ratio
    return {
      templateId: 'semejanza-razon',
      prompt: `Si un lado de un triangulo pequeno mide ${small} y su correspondiente en el triangulo semejante mide ${large}, cual es la razon de semejanza (grande/pequeno)?`,
      correctAnswer: String(ratio),
      distractors: [String(small / ratio), String(large - small), String(ratio + 1)],
      explanationTemplate:
        'Paso 1: compara lados correspondientes de ambos triangulos. Paso 2: calcula el factor de escala comun. Resultado: {answer}.',
      fingerprintSeed: { mode, ratio, small, large },
    }
  }

  const ratio = randomInt(2, 5)
  const sideA = randomInt(3, 12)
  const sideB = randomInt(4, 14)
  const target = sideB * ratio
  return {
    templateId: 'semejanza-lados-proporcionales',
    prompt: `Dos triangulos son semejantes. Si un lado mide ${sideA} en el pequeno y ${sideA * ratio} en el grande, cuanto mide en el grande el lado correspondiente a ${sideB}?`,
    correctAnswer: String(target),
    distractors: [String(sideB + ratio), String(sideB * (ratio - 1)), String(target + ratio)],
    explanationTemplate:
      'Paso 1: identifica la razon de semejanza con un par de lados. Paso 2: aplica ese factor al lado solicitado. Resultado: {answer}.',
    fingerprintSeed: { mode, ratio, sideA, sideB, target },
  }
}

const generateCentralTendencyRange = ({ intent = {} }) => {
  const mode = intent.focus || pick(['mean', 'median', 'mode', 'range'])

  if (mode === 'median') {
    const values = Array.from({ length: 5 }, () => randomInt(4, 24)).sort((left, right) => left - right)
    const median = values[Math.floor(values.length / 2)]
    return {
      templateId: 'estadistica-mediana',
      prompt: `Calcula la mediana del conjunto: ${values.join(', ')}`,
      correctAnswer: String(median),
      distractors: [String(values[0]), String(values[values.length - 1]), String(Math.round(values.reduce((a, b) => a + b, 0) / values.length))],
      explanationTemplate:
        'Paso 1: ordena los datos de menor a mayor. Paso 2: toma el valor central. Resultado: {answer}.',
      fingerprintSeed: { mode, values, median },
    }
  }

  if (mode === 'mode') {
    const frequent = randomInt(3, 9)
    const values = shuffle([frequent, frequent, frequent, randomInt(10, 16), randomInt(17, 23), randomInt(24, 30)])
    return {
      templateId: 'estadistica-moda',
      prompt: `En el conjunto ${values.join(', ')}, cual es la moda?`,
      correctAnswer: String(frequent),
      distractors: [String(values[3]), String(values[4]), String(values[5])],
      explanationTemplate:
        'Paso 1: cuenta la frecuencia de cada dato. Paso 2: identifica el valor con mayor repeticion. Resultado: {answer}.',
      fingerprintSeed: { mode, values, frequent },
    }
  }

  if (mode === 'range') {
    const values = Array.from({ length: 6 }, () => randomInt(5, 30))
    const min = Math.min(...values)
    const max = Math.max(...values)
    const range = max - min
    return {
      templateId: 'estadistica-rango',
      prompt: `Calcula el rango del conjunto: ${values.join(', ')}`,
      correctAnswer: String(range),
      distractors: [String(max), String(min), String(range + 1)],
      explanationTemplate:
        'Paso 1: identifica el valor maximo y minimo. Paso 2: resta minimo a maximo para obtener el rango. Resultado: {answer}.',
      fingerprintSeed: { mode, values, min, max, range },
    }
  }

  const values = Array.from({ length: 5 }, () => randomInt(6, 22))
  const mean = values.reduce((total, value) => total + value, 0) / values.length
  return {
    templateId: 'estadistica-media-2do',
    prompt: `Calcula la media del conjunto: ${values.join(', ')}`,
    correctAnswer: formatNumericAnswer(mean),
    distractors: [formatNumericAnswer(mean + 1), formatNumericAnswer(Math.max(0, mean - 1)), formatNumericAnswer(values[0])],
    explanationTemplate:
      'Paso 1: suma todos los valores del conjunto. Paso 2: divide entre la cantidad de datos. Resultado: {answer}.',
    fingerprintSeed: { mode, values, mean },
  }
}

const generateCompoundProbability = ({ intent = {} }) => {
  const mode = intent.focus || pick(['independent', 'tree'])

  if (mode === 'independent') {
    const favorableDie = 3
    const dieProbability = simplifyFraction(favorableDie, 6)
    const coinProbability = simplifyFraction(1, 2)
    const combined = simplifyFraction(dieProbability.num * coinProbability.num, dieProbability.den * coinProbability.den)
    return {
      templateId: 'probabilidad-compuesta-independiente',
      prompt: `Se lanza un dado y una moneda. Si A es "obtener numero par" y B es "obtener cara", cual es P(A y B)?`,
      correctAnswer: formatFraction(combined.num, combined.den),
      distractors: [formatFraction(1, 2), formatFraction(favorableDie, 6), formatFraction(1, 3)],
      explanationTemplate:
        'Paso 1: calcula la probabilidad de cada evento independiente. Paso 2: multiplica ambas probabilidades. Resultado: {answer}.',
      fingerprintSeed: { mode, favorableDie, combined },
    }
  }

  const pANumerator = pick([2, 3, 4])
  const pADenominator = 5
  const pBGivenANumerator = pick([1, 2, 3])
  const pBGivenADenominator = 4
  const combined = simplifyFraction(pANumerator * pBGivenANumerator, pADenominator * pBGivenADenominator)
  return {
    templateId: 'probabilidad-compuesta-arbol',
    prompt: `En un arbol de probabilidad, P(A) = ${pANumerator}/${pADenominator} y P(B|A) = ${pBGivenANumerator}/${pBGivenADenominator}. Cual es P(A y B)?`,
    correctAnswer: formatFraction(combined.num, combined.den),
    distractors: [
      formatFraction(pANumerator, pADenominator),
      formatFraction(pBGivenANumerator, pBGivenADenominator),
      formatFraction(pANumerator + pBGivenANumerator, pADenominator + pBGivenADenominator),
    ],
    explanationTemplate:
      'Paso 1: sigue la rama correspondiente en el arbol. Paso 2: multiplica probabilidades condicionadas en la misma ruta. Resultado: {answer}.',
    fingerprintSeed: { mode, pANumerator, pADenominator, pBGivenANumerator, pBGivenADenominator, combined },
  }
}

const generateLinearFunction = ({ intent = {} }) => {
  const mode = intent.focus || pick(['slope', 'intercept', 'evaluation', 'graph-interpretation', 'economic-model'])

  if (mode === 'slope') {
    const m = pick([-4, -3, -2, -1, 1, 2, 3, 4, 5])
    const b = randomInt(-8, 10)
    const x1 = randomInt(-2, 4)
    const x2 = x1 + randomInt(1, 4)
    const y1 = m * x1 + b
    const y2 = m * x2 + b
    return {
      templateId: 'funcion-lineal-pendiente',
      prompt: `Para la recta que pasa por (${x1}, ${y1}) y (${x2}, ${y2}), cual es la pendiente m?`,
      correctAnswer: String(m),
      distractors: [String(m + 1), String(m - 1), String(Math.abs(y2 - y1))],
      explanationTemplate:
        'Paso 1: calcula el cambio en y y en x entre los dos puntos. Paso 2: divide delta y entre delta x para obtener la pendiente. Resultado: {answer}.',
      fingerprintSeed: { mode, m, b, x1, x2, y1, y2 },
    }
  }

  if (mode === 'intercept') {
    const m = pick([-3, -2, -1, 1, 2, 3, 4])
    const b = randomInt(-8, 12)
    return {
      templateId: 'funcion-lineal-intercepto',
      prompt: `En la funcion y = ${m}x ${b >= 0 ? '+' : '-'} ${Math.abs(b)}, cual es el intercepto en y (b)?`,
      correctAnswer: String(b),
      distractors: [String(m), String(Math.abs(b)), String(b + 1)],
      explanationTemplate:
        'Paso 1: identifica la forma y = mx + b. Paso 2: lee el termino independiente como intercepto en y. Resultado: {answer}.',
      fingerprintSeed: { mode, m, b },
    }
  }

  if (mode === 'economic-model') {
    const variableCost = randomInt(3, 12)
    const fixedCost = randomInt(20, 80)
    const quantity = randomInt(4, 15)
    const totalCost = variableCost * quantity + fixedCost
    return {
      templateId: 'funcion-lineal-modelo-economico',
      prompt: `El costo total se modela por C(x) = ${variableCost}x + ${fixedCost}. Cuanto vale C(${quantity})?`,
      correctAnswer: String(totalCost),
      distractors: [String(variableCost * quantity), String(fixedCost + quantity), String(totalCost + variableCost)],
      explanationTemplate:
        'Paso 1: sustituye la cantidad en la funcion lineal. Paso 2: calcula costo variable y suma el costo fijo. Resultado: {answer}.',
      fingerprintSeed: { mode, variableCost, fixedCost, quantity, totalCost },
    }
  }

  const m = pick([-3, -2, -1, 1, 2, 3, 4, 5])
  const b = randomInt(-10, 12)
  const x = randomInt(-3, 10)
  const y = m * x + b
  return {
    templateId: mode === 'graph-interpretation' ? 'funcion-lineal-grafica' : 'funcion-lineal-evaluacion',
    prompt: `Para la funcion y = ${m}x ${b >= 0 ? '+' : '-'} ${Math.abs(b)}, cual es y cuando x = ${x}?`,
    correctAnswer: String(y),
    distractors: [String(m + b), String(y + 1), String(y - 1)],
    explanationTemplate:
      'Paso 1: reemplaza x por el valor dado en la expresion lineal. Paso 2: resuelve multiplicacion y suma/resta. Resultado: {answer}.',
    fingerprintSeed: { mode, m, b, x, y },
  }
}

const generateCompleteNotableProducts = ({ intent = {} }) => {
  const mode = intent.focus || pick(['binomial-cube', 'conjugates', 'geometric-application'])

  if (mode === 'binomial-cube') {
    const a = randomInt(2, 8)
    const b = randomInt(1, 6)
    const result = Math.pow(a + b, 3)
    return {
      templateId: 'notables-completos-cubo-binomio',
      prompt: `Calcula (${a} + ${b})^3.`,
      correctAnswer: String(result),
      distractors: [String(Math.pow(a + b, 2)), String(Math.pow(a, 3) + Math.pow(b, 3)), String(result + 1)],
      explanationTemplate:
        'Paso 1: reconoce el cubo de binomio o evalua primero la suma. Paso 2: eleva al cubo y verifica el resultado. Resultado: {answer}.',
      fingerprintSeed: { mode, a, b, result },
    }
  }

  if (mode === 'conjugates') {
    const a = randomInt(6, 22)
    const b = randomInt(2, 10)
    const result = a * a - b * b
    return {
      templateId: 'notables-completos-conjugados',
      prompt: `Calcula (${a} + ${b})(${a} - ${b}).`,
      correctAnswer: String(result),
      distractors: [String((a + b) * (a + b)), String((a - b) * (a - b)), String(result + b)],
      explanationTemplate:
        'Paso 1: aplica la identidad de binomios conjugados. Paso 2: calcula la diferencia de cuadrados. Resultado: {answer}.',
      fingerprintSeed: { mode, a, b, result },
    }
  }

  const side = randomInt(3, 9)
  const increment = randomInt(1, 4)
  const volumeDiff = Math.pow(side + increment, 3) - Math.pow(side, 3)
  return {
    templateId: 'notables-completos-aplicacion-geometrica',
    prompt: `Un cubo aumenta su arista de ${side} a ${side + increment}. Cuanto aumenta su volumen?`,
    correctAnswer: String(volumeDiff),
    distractors: [String((side + increment) * (side + increment) - side * side), String(volumeDiff + side), String(Math.pow(side + increment, 3))],
    explanationTemplate:
      'Paso 1: calcula volumen inicial y final con arista^3. Paso 2: resta para obtener el incremento de volumen. Resultado: {answer}.',
    fingerprintSeed: { mode, side, increment, volumeDiff },
  }
}

const generateCompleteFactorization = ({ intent = {} }) => {
  const mode = intent.focus || pick(['common-factor', 'difference-squares', 'general-trinomial', 'sum-diff-cubes', 'combined'])

  if (mode === 'common-factor') {
    const factor = randomInt(2, 9)
    const left = factor * randomInt(2, 10)
    const right = factor * randomInt(2, 10)
    return {
      templateId: 'factorizacion-completa-factor-comun',
      prompt: `En ${left}x^2 + ${right}x, cual es el factor comun numerico maximo?`,
      correctAnswer: String(gcd(left, right)),
      distractors: [String(factor + 1), String(Math.max(1, factor - 1)), String(Math.min(left, right))],
      explanationTemplate:
        'Paso 1: identifica divisores comunes de los coeficientes. Paso 2: toma el mayor factor comun. Resultado: {answer}.',
      fingerprintSeed: { mode, factor, left, right },
    }
  }

  if (mode === 'difference-squares') {
    const value = randomInt(3, 15)
    const square = value * value
    return {
      templateId: 'factorizacion-completa-diferencia-cuadrados',
      prompt: `Completa: x^2 - ${square} = (x - ?)(x + ?). Cual es el valor faltante?`,
      correctAnswer: String(value),
      distractors: [String(value + 1), String(Math.max(1, value - 1)), String(square)],
      explanationTemplate:
        'Paso 1: reconoce la diferencia de cuadrados. Paso 2: usa la raiz del termino cuadratico constante. Resultado: {answer}.',
      fingerprintSeed: { mode, value, square },
    }
  }

  if (mode === 'general-trinomial') {
    const p = randomInt(1, 6)
    const q = randomInt(1, 6)
    const r = randomInt(1, 4)
    const s = randomInt(1, 4)
    const b = p * s + q * r
    const c = q * s
    return {
      templateId: 'factorizacion-completa-trinomio-general',
      prompt: `Para ${p * r}x^2 + ${b}x + ${c} = (${p}x + ${q})(${r}x + ?), cual es el termino faltante?`,
      correctAnswer: String(s),
      distractors: [String(r), String(q), String(s + 1)],
      explanationTemplate:
        'Paso 1: compara la expansion del producto de binomios con el trinomio dado. Paso 2: identifica el valor faltante que ajusta coeficientes. Resultado: {answer}.',
      fingerprintSeed: { mode, p, q, r, s, b, c },
    }
  }

  if (mode === 'sum-diff-cubes') {
    const value = randomInt(2, 8)
    const cube = value * value * value
    return {
      templateId: 'factorizacion-completa-cubos',
      prompt: `Completa: x^3 - ${cube} = (x - ?)(x^2 + ?x + ?). Cual es el valor que se repite?`,
      correctAnswer: String(value),
      distractors: [String(value + 1), String(Math.max(1, value - 1)), String(cube)],
      explanationTemplate:
        'Paso 1: aplica la identidad de diferencia de cubos. Paso 2: identifica el valor base que aparece en los factores. Resultado: {answer}.',
      fingerprintSeed: { mode, value, cube },
    }
  }

  const rootA = randomInt(1, 6)
  const rootB = randomInt(2, 8)
  const sumRoots = rootA + rootB
  const productRoots = rootA * rootB
  return {
    templateId: 'factorizacion-completa-combinada',
    prompt: `La expresion x^3 - ${sumRoots}x^2 + ${productRoots}x se factoriza como x(x - ${rootA})(x - ?). Cual es el valor faltante?`,
    correctAnswer: String(rootB),
    distractors: [String(rootA), String(sumRoots), String(productRoots)],
    explanationTemplate:
      'Paso 1: extrae factor comun y relaciona con factores lineales restantes. Paso 2: compara suma y producto de raices para hallar el factor faltante. Resultado: {answer}.',
    fingerprintSeed: { mode, rootA, rootB, sumRoots, productRoots },
  }
}

const generateAlgebraicFractions = ({ intent = {} }) => {
  const mode = intent.focus || pick(['simplification', 'operations', 'restrictions'])

  if (mode === 'simplification') {
    const k = randomInt(2, 8)
    const n = randomInt(1, 7)
    return {
      templateId: 'fracciones-algebraicas-simplificacion',
      prompt: `Simplifica (${k}x^${n})/(${k}x^${Math.max(1, n - 1)}). Cual es el coeficiente del resultado?`,
      correctAnswer: '1',
      distractors: [String(k), String(n), '0'],
      explanationTemplate:
        'Paso 1: simplifica coeficientes y potencias comunes en numerador y denominador. Paso 2: identifica el coeficiente final. Resultado: {answer}.',
      fingerprintSeed: { mode, k, n },
    }
  }

  if (mode === 'operations') {
    const a = randomInt(2, 9)
    const b = randomInt(2, 9)
    const numerator = a + b
    return {
      templateId: 'fracciones-algebraicas-operaciones',
      prompt: `En ( ${a}/x ) + ( ${b}/x ), cual es el numerador del resultado simplificado?`,
      correctAnswer: String(numerator),
      distractors: [String(a * b), String(Math.abs(a - b)), String(numerator + 1)],
      explanationTemplate:
        'Paso 1: identifica denominador comun en fracciones algebraicas. Paso 2: suma los numeradores correspondientes. Resultado: {answer}.',
      fingerprintSeed: { mode, a, b, numerator },
    }
  }

  const forbidden = randomInt(-6, 6)
  return {
    templateId: 'fracciones-algebraicas-restricciones',
    prompt: `Para la expresion (x + 3)/(x ${forbidden >= 0 ? '-' : '+'} ${Math.abs(forbidden)}), cual es el valor prohibido de x?`,
    correctAnswer: String(forbidden),
    distractors: [String(forbidden + 1), String(forbidden - 1), '0'],
    explanationTemplate:
      'Paso 1: identifica cuando el denominador se hace cero. Paso 2: establece ese valor como restriccion del dominio. Resultado: {answer}.',
    fingerprintSeed: { mode, forbidden },
  }
}

const generateQuadraticEquations = ({ intent = {} }) => {
  const mode = intent.focus || pick(['factorization', 'quadratic-formula', 'discriminant', 'real-application'])

  if (mode === 'factorization') {
    const r1 = randomInt(1, 9)
    const r2 = randomInt(1, 9)
    const b = -(r1 + r2)
    const c = r1 * r2
    return {
      templateId: 'ecuaciones-cuadraticas-factorizacion',
      prompt: `Resuelve x^2 ${b >= 0 ? '+' : '-'} ${Math.abs(b)}x + ${c} = 0. Cual es una raiz positiva?`,
      correctAnswer: String(Math.max(r1, r2)),
      distractors: [String(Math.min(r1, r2)), String(r1 + r2), String(c)],
      explanationTemplate:
        'Paso 1: factoriza la cuadratica en dos binomios lineales. Paso 2: iguala cada factor a cero e identifica la raiz solicitada. Resultado: {answer}.',
      fingerprintSeed: { mode, r1, r2, b, c },
    }
  }

  if (mode === 'quadratic-formula') {
    const a = pick([1, 2, 3])
    const x1 = randomInt(1, 5)
    const x2 = x1 + randomInt(1, 4)
    const b = -a * (x1 + x2)
    const c = a * x1 * x2
    const positiveRoot = Math.max(x1, x2)
    return {
      templateId: 'ecuaciones-cuadraticas-formula-general',
      prompt: `En ${a}x^2 ${b >= 0 ? '+' : '-'} ${Math.abs(b)}x + ${c} = 0, cual es la raiz mayor?`,
      correctAnswer: String(positiveRoot),
      distractors: [String(Math.min(x1, x2)), String(x1 + x2), String(c)],
      explanationTemplate:
        'Paso 1: aplica la formula general o factoriza si es posible. Paso 2: compara las soluciones y toma la mayor. Resultado: {answer}.',
      fingerprintSeed: { mode, a, x1, x2, b, c },
    }
  }

  if (mode === 'discriminant') {
    const a = pick([1, 2, 3, 4])
    const b = randomInt(-12, 12)
    const c = randomInt(-10, 10)
    const discriminant = b * b - 4 * a * c
    return {
      templateId: 'ecuaciones-cuadraticas-discriminante',
      prompt: `Calcula el discriminante de ${a}x^2 ${b >= 0 ? '+' : '-'} ${Math.abs(b)}x ${c >= 0 ? '+' : '-'} ${Math.abs(c)} = 0.`,
      correctAnswer: String(discriminant),
      distractors: [String(b * b + 4 * a * c), String(Math.abs(b) + 4 * a * c), String(discriminant + 1)],
      explanationTemplate:
        'Paso 1: identifica coeficientes a, b y c. Paso 2: evalua b^2 - 4ac con cuidado de signos. Resultado: {answer}.',
      fingerprintSeed: { mode, a, b, c, discriminant },
    }
  }

  const width = randomInt(3, 10)
  const extra = randomInt(2, 7)
  const area = width * (width + extra)
  return {
    templateId: 'ecuaciones-cuadraticas-aplicacion-real',
    prompt: `El area de un rectangulo es ${area}. Si su largo es x + ${extra} y su ancho es x, cuanto vale x?`,
    correctAnswer: String(width),
    distractors: [String(width + extra), String(Math.max(1, width - 1)), String(area)],
    explanationTemplate:
      'Paso 1: modela el enunciado con una ecuacion cuadratica. Paso 2: resuelve y elige la solucion fisicamente valida. Resultado: {answer}.',
    fingerprintSeed: { mode, width, extra, area },
  }
}

const generateFormalSystems2x2 = ({ intent = {} }) => {
  const mode = intent.focus || pick(['substitution', 'equalization', 'reduction', 'economic-model'])

  if (mode === 'substitution') {
    const x = randomInt(1, 10)
    const y = randomInt(1, 10)
    return {
      templateId: 'sistemas-2x2-formal-sustitucion',
      prompt: `Resuelve por sustitucion: y = ${x + y} - x y x = ${x}. Cual es y?`,
      correctAnswer: String(y),
      distractors: [String(x), String(y + 1), String(Math.max(0, y - 1))],
      explanationTemplate:
        'Paso 1: sustituye el valor conocido en la ecuacion restante. Paso 2: despeja la variable solicitada. Resultado: {answer}.',
      fingerprintSeed: { mode, x, y },
    }
  }

  if (mode === 'equalization') {
    const x = randomInt(1, 7)
    const y = randomInt(1, 9)
    const a = randomInt(2, 4)
    const b = randomInt(2, 5)
    const c = a * x + y
    const d = x + b * y
    return {
      templateId: 'sistemas-2x2-formal-igualacion',
      prompt: `Resuelve por igualacion: ${a}x + y = ${c} y x + ${b}y = ${d}. Cual es x?`,
      correctAnswer: String(x),
      distractors: [String(y), String(x + 1), String(Math.max(0, x - 1))],
      explanationTemplate:
        'Paso 1: expresa una variable en funcion de la otra en cada ecuacion. Paso 2: iguala expresiones y resuelve el sistema. Resultado: {answer}.',
      fingerprintSeed: { mode, x, y, a, b, c, d },
    }
  }

  if (mode === 'reduction') {
    const x = randomInt(1, 8)
    const y = randomInt(1, 8)
    const a = randomInt(2, 4)
    const b = randomInt(2, 5)
    const c = a * x + b * y
    const d = a * x - b * y
    return {
      templateId: 'sistemas-2x2-formal-reduccion',
      prompt: `Resuelve por reduccion: ${a}x + ${b}y = ${c} y ${a}x - ${b}y = ${d}. Cual es x?`,
      correctAnswer: String(x),
      distractors: [String(y), String(x + 1), String(Math.max(0, x - 1))],
      explanationTemplate:
        'Paso 1: suma o resta ecuaciones para eliminar una variable. Paso 2: despeja la variable restante y verifica. Resultado: {answer}.',
      fingerprintSeed: { mode, x, y, a, b, c, d },
    }
  }

  const adultPrice = randomInt(12, 20)
  const studentPrice = adultPrice - randomInt(4, 7)
  const adults = randomInt(5, 12)
  const students = randomInt(8, 15)
  const totalTickets = adults + students
  const totalRevenue = adultPrice * adults + studentPrice * students
  return {
    templateId: 'sistemas-2x2-formal-modelacion-economica',
    prompt: `Se vendieron ${totalTickets} entradas entre adulto (${adultPrice} soles) y estudiante (${studentPrice} soles), recaudando ${totalRevenue} soles. Cuantas entradas de adulto se vendieron?`,
    correctAnswer: String(adults),
    distractors: [String(students), String(adults + 1), String(Math.max(0, adults - 1))],
    explanationTemplate:
      'Paso 1: plantea ecuaciones de cantidad total y recaudacion total. Paso 2: resuelve el sistema para obtener la variable pedida. Resultado: {answer}.',
    fingerprintSeed: { mode, adultPrice, studentPrice, adults, students, totalTickets, totalRevenue },
  }
}

const generateFormalLinearFunction = ({ intent = {} }) => {
  const mode = intent.focus || pick(['slope', 'intercept', 'graph-interpretation', 'variation'])
  const mappedFocus = mode === 'variation' ? 'economic-model' : mode
  return generateLinearFunction({
    intent: {
      ...intent,
      focus: mappedFocus,
    },
  })
}

const generateQuadraticFunction = ({ intent = {} }) => {
  const mode = intent.focus || pick(['canonical-form', 'vertex', 'graph', 'optimization'])

  if (mode === 'canonical-form') {
    const h = randomInt(-5, 6)
    const k = randomInt(-8, 10)
    const a = pick([1, 2, -1, -2])
    return {
      templateId: 'funcion-cuadratica-forma-canonica',
      prompt: `En f(x) = ${a}(x ${h >= 0 ? '-' : '+'} ${Math.abs(h)})^2 ${k >= 0 ? '+' : '-'} ${Math.abs(k)}, cual es la coordenada x del vertice?`,
      correctAnswer: String(h),
      distractors: [String(-h), String(k), String(h + 1)],
      explanationTemplate:
        'Paso 1: identifica la forma canonica a(x-h)^2+k. Paso 2: lee la coordenada x del vertice directamente. Resultado: {answer}.',
      fingerprintSeed: { mode, a, h, k },
    }
  }

  if (mode === 'vertex') {
    const a = pick([1, 2, -1, -2])
    const h = randomInt(-4, 5)
    const k = randomInt(-8, 8)
    const b = -2 * a * h
    const c = a * h * h + k
    return {
      templateId: 'funcion-cuadratica-vertice',
      prompt: `Para f(x) = ${a}x^2 ${b >= 0 ? '+' : '-'} ${Math.abs(b)}x ${c >= 0 ? '+' : '-'} ${Math.abs(c)}, cual es la coordenada y del vertice?`,
      correctAnswer: String(k),
      distractors: [String(h), String(c), String(k + 1)],
      explanationTemplate:
        'Paso 1: calcula la abscisa del vertice con -b/(2a). Paso 2: evalua f(x) en ese punto para obtener la ordenada. Resultado: {answer}.',
      fingerprintSeed: { mode, a, h, k, b, c },
    }
  }

  if (mode === 'optimization') {
    const p = pick([8, 10, 12, 14, 16])
    const xOpt = p / 2
    return {
      templateId: 'funcion-cuadratica-optimizacion',
      prompt: `Si A(x) = -x^2 + ${p}x modela un area, para que valor de x el area es maxima?`,
      correctAnswer: formatNumericAnswer(xOpt),
      distractors: [formatNumericAnswer(xOpt - 1), formatNumericAnswer(xOpt + 1), String(p)],
      explanationTemplate:
        'Paso 1: reconoce que la parabola abre hacia abajo y su maximo esta en el vertice. Paso 2: halla la x del vertice para obtener el valor optimo. Resultado: {answer}.',
      fingerprintSeed: { mode, p, xOpt },
    }
  }

  const a = pick([1, 2, -1, -2, -3])
  return {
    templateId: 'funcion-cuadratica-grafica',
    prompt: `Si f(x) = ${a}x^2 + 3x - 1, la parabola abre hacia arriba o hacia abajo? Responde 1 para arriba y -1 para abajo.`,
    correctAnswer: a > 0 ? '1' : '-1',
    distractors: [a > 0 ? '-1' : '1', '0', String(a)],
    explanationTemplate:
      'Paso 1: identifica el signo del coeficiente cuadratico. Paso 2: determina la orientacion de la parabola segun ese signo. Resultado: {answer}.',
    fingerprintSeed: { mode, a },
  }
}

const generateFormalTriangleSimilarity = ({ intent = {} }) => {
  const mode = intent.focus || pick(['criteria', 'thales', 'scale'])

  if (mode === 'criteria') {
    const ratio = randomInt(2, 5)
    const sideA = randomInt(3, 9)
    const target = sideA * ratio
    return {
      templateId: 'semejanza-formal-criterios',
      prompt: `Dos triangulos son semejantes con razon ${ratio}. Si un lado del pequeno mide ${sideA}, cuanto mide el correspondiente en el grande?`,
      correctAnswer: String(target),
      distractors: [String(sideA + ratio), String(sideA * (ratio - 1)), String(target + 1)],
      explanationTemplate:
        'Paso 1: identifica la razon de semejanza entre figuras. Paso 2: multiplica el lado conocido por esa razon. Resultado: {answer}.',
      fingerprintSeed: { mode, ratio, sideA, target },
    }
  }

  if (mode === 'thales') {
    const ab = randomInt(3, 10)
    const ac = ab + randomInt(2, 8)
    const ad = randomInt(2, 6)
    const ae = (ac * ad) / ab
    return {
      templateId: 'semejanza-formal-thales',
      prompt: `Por Thales, si AB/AC = AD/AE y AB=${ab}, AC=${ac}, AD=${ad}, cuanto vale AE?`,
      correctAnswer: formatNumericAnswer(ae),
      distractors: [formatNumericAnswer((ab * ad) / ac), formatNumericAnswer(ae + 1), formatNumericAnswer(Math.max(1, ae - 1))],
      explanationTemplate:
        'Paso 1: plantea la proporcion de segmentos que indica Thales. Paso 2: despeja el segmento desconocido y verifica unidades. Resultado: {answer}.',
      fingerprintSeed: { mode, ab, ac, ad, ae },
    }
  }

  const scale = pick([5000, 10000, 20000])
  const mapDistance = pick([2, 3, 4, 5, 6, 8])
  const realMeters = (mapDistance * scale) / 100
  return {
    templateId: 'semejanza-formal-escalas',
    prompt: `En una escala 1:${scale}, una distancia mide ${mapDistance} cm en el plano. Cuantos metros representa?`,
    correctAnswer: formatNumericAnswer(realMeters),
    distractors: [formatNumericAnswer(realMeters / 10), formatNumericAnswer(realMeters * 10), formatNumericAnswer(realMeters + 1)],
    explanationTemplate:
      'Paso 1: transforma la distancia del plano usando la escala. Paso 2: convierte la distancia real a metros. Resultado: {answer}.',
    fingerprintSeed: { mode, scale, mapDistance, realMeters },
  }
}

const generateExtendedPythagoras = ({ intent = {} }) => {
  const mode = intent.focus || pick(['plane-distance', 'combined-application'])

  if (mode === 'plane-distance') {
    const x1 = randomInt(-4, 5)
    const y1 = randomInt(-4, 5)
    const dx = pick([3, 5, 6, 8])
    const dy = pick([4, 12, 8, 15])
    const x2 = x1 + dx
    const y2 = y1 + dy
    const distance = Math.sqrt(dx * dx + dy * dy)
    return {
      templateId: 'pitagoras-ampliado-distancia-plano',
      prompt: `Calcula la distancia entre (${x1}, ${y1}) y (${x2}, ${y2}).`,
      correctAnswer: formatNumericAnswer(distance),
      distractors: [formatNumericAnswer(dx + dy), formatNumericAnswer(Math.abs(dx - dy)), formatNumericAnswer(distance + 1)],
      explanationTemplate:
        'Paso 1: calcula diferencias horizontal y vertical entre puntos. Paso 2: aplica Pitagoras para obtener la distancia. Resultado: {answer}.',
      fingerprintSeed: { mode, x1, y1, x2, y2, dx, dy, distance },
    }
  }

  const base = randomInt(6, 14)
  const height = randomInt(6, 14)
  const diagonal = Math.sqrt(base * base + height * height)
  return {
    templateId: 'pitagoras-ampliado-aplicacion-combinada',
    prompt: `Un rectangulo tiene base ${base} y altura ${height}. Cuanto mide su diagonal?`,
    correctAnswer: formatNumericAnswer(diagonal),
    distractors: [formatNumericAnswer(base + height), formatNumericAnswer(Math.abs(base - height)), formatNumericAnswer(diagonal + 1)],
    explanationTemplate:
      'Paso 1: modela la diagonal como hipotenusa de un triangulo rectangulo. Paso 2: aplica Pitagoras y extrae la raiz correspondiente. Resultado: {answer}.',
    fingerprintSeed: { mode, base, height, diagonal },
  }
}

const generateBasicAnalyticGeometry = ({ intent = {} }) => {
  const mode = intent.focus || pick(['point-distance', 'midpoint', 'slope-between-points'])

  if (mode === 'point-distance') {
    const x1 = randomInt(-5, 5)
    const y1 = randomInt(-5, 5)
    const dx = pick([3, 6, 8])
    const dy = pick([4, 8, 15])
    const x2 = x1 + dx
    const y2 = y1 + dy
    const distance = Math.sqrt(dx * dx + dy * dy)
    return {
      templateId: 'geometria-analitica-distancia',
      prompt: `Distancia entre los puntos A(${x1}, ${y1}) y B(${x2}, ${y2}).`,
      correctAnswer: formatNumericAnswer(distance),
      distractors: [formatNumericAnswer(dx + dy), formatNumericAnswer(Math.abs(dx - dy)), formatNumericAnswer(distance + 1)],
      explanationTemplate:
        'Paso 1: usa formula de distancia entre dos puntos. Paso 2: simplifica y expresa el resultado numerico. Resultado: {answer}.',
      fingerprintSeed: { mode, x1, y1, x2, y2, dx, dy, distance },
    }
  }

  if (mode === 'midpoint') {
    const x1 = randomInt(-8, 8)
    const y1 = randomInt(-8, 8)
    const x2 = x1 + pick([2, 4, 6, 8])
    const y2 = y1 + pick([2, 4, 6, 8])
    const midpointX = (x1 + x2) / 2
    return {
      templateId: 'geometria-analitica-punto-medio',
      prompt: `Si A(${x1}, ${y1}) y B(${x2}, ${y2}), cual es la coordenada x del punto medio?`,
      correctAnswer: formatNumericAnswer(midpointX),
      distractors: [formatNumericAnswer((x2 - x1) / 2), formatNumericAnswer(midpointX + 1), formatNumericAnswer(midpointX - 1)],
      explanationTemplate:
        'Paso 1: promedia las coordenadas x de los extremos. Paso 2: reporta la componente x del punto medio. Resultado: {answer}.',
      fingerprintSeed: { mode, x1, y1, x2, y2, midpointX },
    }
  }

  const x1 = randomInt(-6, 4)
  const y1 = randomInt(-6, 4)
  const dx = pick([1, 2, 3, 4, 5])
  const slope = pick([-3, -2, -1, 1, 2, 3, 4])
  const x2 = x1 + dx
  const y2 = y1 + slope * dx
  return {
    templateId: 'geometria-analitica-pendiente',
    prompt: `Cual es la pendiente entre A(${x1}, ${y1}) y B(${x2}, ${y2})?`,
    correctAnswer: String(slope),
    distractors: [String(slope + 1), String(slope - 1), String(Math.abs(y2 - y1))],
    explanationTemplate:
      'Paso 1: calcula delta y y delta x entre los puntos. Paso 2: divide delta y entre delta x para hallar la pendiente. Resultado: {answer}.',
    fingerprintSeed: { mode, x1, y1, x2, y2, slope },
  }
}

const generateExtendedDescriptiveStatistics = ({ intent = {} }) => {
  const mode = intent.focus || pick(['variance', 'graph-interpretation', 'comparative-analysis'])

  if (mode === 'variance') {
    const values = [2, 4, 6, 8, 10].map((value) => value + randomInt(0, 4))
    const mean = values.reduce((total, value) => total + value, 0) / values.length
    const variance = values.reduce((total, value) => total + Math.pow(value - mean, 2), 0) / values.length
    return {
      templateId: 'estadistica-descriptiva-varianza',
      prompt: `Calcula la varianza poblacional del conjunto: ${values.join(', ')}`,
      correctAnswer: formatNumericAnswer(variance),
      distractors: [formatNumericAnswer(Math.sqrt(variance)), formatNumericAnswer(variance + 1), formatNumericAnswer(mean)],
      explanationTemplate:
        'Paso 1: calcula la media del conjunto. Paso 2: promedia los cuadrados de las desviaciones respecto de la media. Resultado: {answer}.',
      fingerprintSeed: { mode, values, mean, variance },
    }
  }

  if (mode === 'graph-interpretation') {
    const jan = randomInt(15, 30)
    const feb = jan + randomInt(-4, 8)
    const mar = feb + randomInt(-4, 8)
    const maxValue = Math.max(jan, feb, mar)
    return {
      templateId: 'estadistica-descriptiva-graficos',
      prompt: `En un grafico de barras: enero=${jan}, febrero=${feb}, marzo=${mar}. Cual es la mayor frecuencia observada?`,
      correctAnswer: String(maxValue),
      distractors: [String(Math.min(jan, feb, mar)), String(jan + feb + mar), String(maxValue + 1)],
      explanationTemplate:
        'Paso 1: compara visualmente o numericamente las frecuencias de cada barra. Paso 2: selecciona el valor maximo. Resultado: {answer}.',
      fingerprintSeed: { mode, jan, feb, mar, maxValue },
    }
  }

  const groupA = Array.from({ length: 5 }, () => randomInt(10, 20))
  const groupB = Array.from({ length: 5 }, () => randomInt(12, 24))
  const meanA = groupA.reduce((t, v) => t + v, 0) / groupA.length
  const meanB = groupB.reduce((t, v) => t + v, 0) / groupB.length
  const diff = meanB - meanA
  return {
    templateId: 'estadistica-descriptiva-analisis-comparativo',
    prompt: `Grupo A: ${groupA.join(', ')}. Grupo B: ${groupB.join(', ')}. Cuanto es (media B - media A)?`,
    correctAnswer: formatNumericAnswer(diff),
    distractors: [formatNumericAnswer(meanA - meanB), formatNumericAnswer(meanA), formatNumericAnswer(meanB)],
    explanationTemplate:
      'Paso 1: calcula la media de cada grupo. Paso 2: compara ambas medias mediante la diferencia solicitada. Resultado: {answer}.',
    fingerprintSeed: { mode, groupA, groupB, meanA, meanB, diff },
  }
}

const generateFormalCompoundProbability = ({ intent = {} }) => {
  const mode = intent.focus || pick(['dependent-events', 'conditional-basic', 'tree-formal'])

  if (mode === 'dependent-events') {
    const red = randomInt(3, 7)
    const blue = randomInt(3, 7)
    const total = red + blue
    const probability = simplifyFraction(red, total)
    const second = simplifyFraction(Math.max(0, red - 1), Math.max(1, total - 1))
    const combined = simplifyFraction(probability.num * second.num, probability.den * second.den)
    return {
      templateId: 'probabilidad-formal-dependientes',
      prompt: `Una urna tiene ${red} bolas rojas y ${blue} azules. Sin reposicion, cual es la probabilidad de extraer 2 rojas seguidas?`,
      correctAnswer: formatFraction(combined.num, combined.den),
      distractors: [
        formatFraction(probability.num, probability.den),
        formatFraction(second.num, second.den),
        formatFraction(red * red, total * total),
      ],
      explanationTemplate:
        'Paso 1: calcula la probabilidad de la primera extraccion. Paso 2: ajusta el espacio muestral para la segunda y multiplica. Resultado: {answer}.',
      fingerprintSeed: { mode, red, blue, combined },
    }
  }

  if (mode === 'conditional-basic') {
    const total = pick([20, 24, 28])
    const plays = pick([8, 10, 12])
    const both = pick([4, 5, 6])
    const conditional = simplifyFraction(both, plays)
    return {
      templateId: 'probabilidad-formal-condicional',
      prompt: `En un grupo de ${total} estudiantes, ${plays} juegan futbol y ${both} juegan futbol y voley. Cual es P(voley | futbol)?`,
      correctAnswer: formatFraction(conditional.num, conditional.den),
      distractors: [formatFraction(both, total), formatFraction(plays, total), formatFraction(plays - both, total)],
      explanationTemplate:
        'Paso 1: identifica casos favorables dentro del evento condicionante. Paso 2: divide por el total de casos del condicionante. Resultado: {answer}.',
      fingerprintSeed: { mode, total, plays, both, conditional },
    }
  }

  const pANumerator = pick([2, 3, 4])
  const pADenominator = 5
  const pBGivenANumerator = pick([1, 2, 3])
  const pBGivenADenominator = 4
  const route = simplifyFraction(pANumerator * pBGivenANumerator, pADenominator * pBGivenADenominator)
  return {
    templateId: 'probabilidad-formal-arbol',
    prompt: `En un diagrama de arbol, P(A) = ${pANumerator}/${pADenominator} y P(B|A) = ${pBGivenANumerator}/${pBGivenADenominator}. Cual es la probabilidad de la ruta A luego B?`,
    correctAnswer: formatFraction(route.num, route.den),
    distractors: [
      formatFraction(pANumerator, pADenominator),
      formatFraction(pBGivenANumerator, pBGivenADenominator),
      formatFraction(pANumerator + pBGivenANumerator, pADenominator + pBGivenADenominator),
    ],
    explanationTemplate:
      'Paso 1: sigue la rama indicada en el arbol. Paso 2: multiplica las probabilidades de cada etapa de la ruta. Resultado: {answer}.',
    fingerprintSeed: { mode, pANumerator, pADenominator, pBGivenANumerator, pBGivenADenominator, route },
  }
}

const generateIntegratedModeling = ({ intent = {} }) => {
  const pool = [
    () => generateQuadraticFunction({ intent: { ...intent, focus: 'optimization' } }),
    () => generateFormalSystems2x2({ intent: { ...intent, focus: 'economic-model' } }),
    () => generateBasicAnalyticGeometry({ intent: { ...intent, focus: 'point-distance' } }),
    () => generateExtendedPythagoras({ intent: { ...intent, focus: 'plane-distance' } }),
    () => generateFormalCompoundProbability({ intent: { ...intent, focus: 'dependent-events' } }),
  ]
  const candidate = pick(pool)()
  return {
    ...candidate,
    templateId: `modelacion-integrada-${candidate.templateId}`,
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
  'operaciones-basicas': generateOperacionesBasicas,
  'jerarquia-operaciones': generateJerarquiaOperaciones,
  divisibilidad: generateDivisibilidad,
  fracciones: generateFractions,
  'figuras-planas': generateFigurasPlanas,
  angulos: generateAngles,
  'expresiones-algebraicas': generateAlgebraicExpressions,
  'ecuaciones-basicas': generateBasicEquation,
  estadistica: generateStatistics,
  'probabilidad-simple': generateProbabilitySimple,
  'unidades-de-medida': generateMeasurement,
  'potencias-propiedades': generatePowersProperties,
  'raices-cuadradas-cubicas': generateRootsSquaresCubes,
  'notacion-cientifica': generateScientificNotation,
  'proporcionalidad-compuesta': generateCompoundProportionality,
  'porcentajes-avanzados': generateAdvancedPercentages,
  polinomios: generatePolynomials,
  'productos-notables': generateNotableProducts,
  'factorizacion-basica': generateBasicFactorization,
  'ecuaciones-lineales-dos-pasos': generateTwoStepLinearEquations,
  'sistemas-ecuaciones': generateSystemsEquations,
  'teorema-de-pitagoras': generatePythagoras,
  'areas-compuestas': generateCompositeAreas,
  'semejanza-de-triangulos': generateTriangleSimilarity,
  'media-mediana-moda-rango': generateCentralTendencyRange,
  'probabilidad-compuesta-basica': generateCompoundProbability,
  'funcion-lineal-basica': generateLinearFunction,
  'productos-notables-completos': generateCompleteNotableProducts,
  'factorizacion-completa': generateCompleteFactorization,
  'fracciones-algebraicas': generateAlgebraicFractions,
  'ecuaciones-cuadraticas': generateQuadraticEquations,
  'sistemas-ecuaciones-2x2-formal': generateFormalSystems2x2,
  'funcion-lineal-formal': generateFormalLinearFunction,
  'funcion-cuadratica': generateQuadraticFunction,
  'semejanza-triangulos-formal': generateFormalTriangleSimilarity,
  'pitagoras-ampliado': generateExtendedPythagoras,
  'geometria-analitica-basica': generateBasicAnalyticGeometry,
  'estadistica-descriptiva-ampliada': generateExtendedDescriptiveStatistics,
  'probabilidad-compuesta-formal': generateFormalCompoundProbability,
  'modelacion-integrada': generateIntegratedModeling,
}

const resolveGenerator = (topic) => {
  const canonicalTopic = canonicalizeTopic(topic)
  if (TOPIC_GENERATORS[canonicalTopic]) return TOPIC_GENERATORS[canonicalTopic]

  const key = canonicalTopic
  if (key.includes('modelacion-integrada')) return generateIntegratedModeling
  if (key.includes('operacion')) return generateOperacionesBasicas
  if (key.includes('potencia')) return generatePowersProperties
  if (key.includes('raic')) return generateRootsSquaresCubes
  if (key.includes('cientifica')) return generateScientificNotation
  if (key.includes('proporcionalidad')) return generateCompoundProportionality
  if (key.includes('porcentaje')) return generateAdvancedPercentages
  if (key.includes('polinom')) return generatePolynomials
  if (key.includes('notable')) return key.includes('completo') ? generateCompleteNotableProducts : generateNotableProducts
  if (key.includes('factorizacion')) return key.includes('completa') ? generateCompleteFactorization : generateBasicFactorization
  if (key.includes('jerarquia')) return generateJerarquiaOperaciones
  if (key.includes('divisibilidad')) return generateDivisibilidad
  if (key.includes('fracciones-algebra')) return generateAlgebraicFractions
  if (key.includes('fraccion')) return generateFractions
  if (key.includes('analitica')) return generateBasicAnalyticGeometry
  if (key.includes('figura') || key.includes('geometr')) return generateFigurasPlanas
  if (key.includes('pitagoras')) return key.includes('ampliado') ? generateExtendedPythagoras : generatePythagoras
  if (key.includes('semejanza')) return key.includes('formal') ? generateFormalTriangleSimilarity : generateTriangleSimilarity
  if (key.includes('area')) return generateCompositeAreas
  if (key.includes('angulo')) return generateAngles
  if (key.includes('expresion') || key.includes('algebra')) return generateAlgebraicExpressions
  if (key.includes('sistema')) return key.includes('2x2') ? generateFormalSystems2x2 : generateSystemsEquations
  if (key.includes('cuadratica')) {
    if (key.includes('funcion')) return generateQuadraticFunction
    return generateQuadraticEquations
  }
  if (key.includes('ecuacion')) return generateBasicEquation
  if (key.includes('funcion')) return key.includes('formal') ? generateFormalLinearFunction : generateLinearFunction
  if (key.includes('estadistica')) return key.includes('ampliada') ? generateExtendedDescriptiveStatistics : generateStatistics
  if (key.includes('mediana') || key.includes('moda') || key.includes('rango')) return generateCentralTendencyRange
  if (key.includes('probabilidad')) {
    if (key.includes('formal')) return generateFormalCompoundProbability
    if (key.includes('compuesta')) return generateCompoundProbability
    return generateProbabilitySimple
  }
  if (key.includes('medida') || key.includes('conversion')) return generateMeasurement

  return generateGenericQuestion
}

export const generateQuestion = ({ grade, topic, difficulty = 1, lessonContext = {}, excludedFingerprints = new Set() }) => {
  const safeDifficulty = clampDifficulty(difficulty)
  const normalizedTopic = canonicalizeTopic(topic, grade)
  const blockedFingerprints =
    excludedFingerprints instanceof Set ? excludedFingerprints : new Set(excludedFingerprints || [])
  const safeLessonContext = lessonContext && typeof lessonContext === 'object' ? lessonContext : {}
  const lessonIntent = resolveLessonIntent({
    topic: normalizedTopic,
    ...safeLessonContext,
    difficulty: safeDifficulty,
  })

  if (!normalizedTopic) {
    throw new Error('topic es obligatorio para generar una pregunta.')
  }

  const type = getQuestionTypeByDifficulty(safeDifficulty)
  const generator = resolveGenerator(normalizedTopic)

  for (let attempt = 0; attempt < 40; attempt += 1) {
    const candidate = generator({
      grade,
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
      grade,
      topic: normalizedTopic,
      difficulty: safeDifficulty,
      type,
      candidate: rigorousCandidate,
    })

    if (blockedFingerprints.has(question.fingerprint)) {
      if (attempt >= 39) {
        const forcedQuestion = finalizeQuestion({
          grade,
          topic: normalizedTopic,
          difficulty: safeDifficulty,
          type,
          candidate: {
            ...rigorousCandidate,
            templateId: `${rigorousCandidate.templateId}-forced`,
            fingerprintSeed: {
              ...(rigorousCandidate.fingerprintSeed || {}),
              forcedVariant: randomUUID(),
            },
          },
        })
        return forcedQuestion
      }
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
