import { Problem } from '../../types/lesson'

const lessonDefinitions = [
  {
    id: 'prob-001',
    title: 'Suma de fracciones',
    prompt: 'Suma las siguientes fracciones.',
    equation: '\\frac{1}{2} + \\frac{1}{3}',
    expectedAnswer: '5/6',
    explanation: 'Usa denominador comun 6 y suma los numeradores.'
  },
  {
    id: 'prob-002',
    title: 'Resta de fracciones',
    prompt: 'Resta las siguientes fracciones.',
    equation: '\\frac{5}{6} - \\frac{1}{3}',
    expectedAnswer: '1/2',
    explanation: 'Convierte ambas fracciones al mismo denominador antes de restar.'
  },
  {
    id: 'prob-003',
    title: 'Fraccion equivalente',
    prompt: 'Encuentra una fraccion equivalente a 2/3 con denominador 12.',
    equation: '\\frac{2}{3} = \\frac{x}{12}',
    expectedAnswer: '8',
    explanation: 'Multiplica numerador y denominador por el mismo valor.'
  },
  {
    id: 'prob-004',
    title: 'Compara fracciones',
    prompt: 'Cual fraccion es mayor?',
    equation: '\\frac{3}{4} \\text{ o } \\frac{2}{3}',
    expectedAnswer: '3/4',
    explanation: 'Convierte a un denominador comun o compara en decimal.'
  },
  {
    id: 'prob-005',
    title: 'Operacion mixta',
    prompt: 'Resuelve la siguiente operacion.',
    equation: '\\frac{1}{2} + \\frac{1}{4}',
    expectedAnswer: '3/4',
    explanation: 'Busca el minimo comun multiplo y opera en una sola base.'
  }
]

const replacementDefinitions = [
  {
    id: 'alt-001',
    title: 'Suma alternativa',
    prompt: 'Resuelve esta suma alternativa.',
    equation: '\\frac{2}{5} + \\frac{1}{5}',
    expectedAnswer: '3/5',
    explanation: 'Cuando el denominador ya es igual, solo sumas numeradores.'
  },
  {
    id: 'alt-002',
    title: 'Resta alternativa',
    prompt: 'Resuelve esta resta alternativa.',
    equation: '\\frac{7}{8} - \\frac{3}{8}',
    expectedAnswer: '1/2',
    explanation: 'Resta numeradores y simplifica el resultado si hace falta.'
  },
  {
    id: 'alt-003',
    title: 'Equivalencia alternativa',
    prompt: 'Completa la equivalencia.',
    equation: '\\frac{3}{4} = \\frac{x}{16}',
    expectedAnswer: '12',
    explanation: 'Escala numerador y denominador por el mismo factor.'
  }
]

const buildProblem = (definition: {
  id: string
  title: string
  prompt: string
  equation: string
  expectedAnswer: string
  explanation: string
}): Problem => ({
  id: definition.id,
  title: definition.title,
  content: [
    { type: 'text', value: definition.prompt },
    { type: 'equation', value: definition.equation }
  ],
  expectedAnswer: definition.expectedAnswer,
  skillId: 'fractions-basic',
  explanation: definition.explanation,
})

const hashRouteId = (routeId: string | undefined) => {
  return String(routeId ?? '')
    .split('')
    .reduce((sum, char) => sum + (char.codePointAt(0) || 0), 0)
}

export const getLessonProblemsForRoute = (routeId: string | undefined): Problem[] => {
  if (!routeId) return lessonProblems
  const startIndex = lessonDefinitions.length > 0 ? hashRouteId(routeId) % lessonDefinitions.length : 0
  return lessonDefinitions.map((_, index) => {
    const definition = lessonDefinitions[(startIndex + index) % lessonDefinitions.length]
    return buildProblem(definition)
  })
}

export const lessonProblems: Problem[] = lessonDefinitions.map(buildProblem)
export const replacementProblems: Problem[] = replacementDefinitions.map(buildProblem)
