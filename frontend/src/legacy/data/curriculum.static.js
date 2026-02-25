export const curriculum = [
  {
    id: 'grade-1-alto-rendimiento',
    level: 1,
    title: '1ro Secundaria - Matematicas (Alto Rendimiento)',
    objective:
      'Comprension solida de numeros, operaciones, relaciones algebraicas, geometria plana, estadistica, probabilidad y medicion aplicada.',
    modules: [
      {
        id: 'numeros-naturales',
        title: '1. Numeros Naturales',
        topics: [
          {
            id: 'operaciones-basicas',
            title: 'Operaciones Basicas',
            difficultyRange: [1, 3],
            problemMix: 'contextualized',
            questionCountRange: [3, 3],
            subtopics: ['suma con dinero', 'multiplicacion para agrupar', 'division para repartir'],
          },
        ],
      },
      {
        id: 'aritmetica-fundamental',
        title: '2. Aritmetica Fundamental',
        topics: [
          {
            id: 'jerarquia-operaciones',
            title: 'Jerarquia de Operaciones',
            difficultyRange: [4, 6],
            problemMix: 'mixed',
            questionCountRange: [4, 4],
            subtopics: ['operaciones combinadas', 'prioridad operatoria'],
          },
          {
            id: 'divisibilidad',
            title: 'Divisibilidad',
            difficultyRange: [4, 6],
            problemMix: 'mixed',
            questionCountRange: [4, 4],
            subtopics: ['multiplos', 'divisores', 'criterios 2,3,5,10', 'primos y compuestos'],
          },
          {
            id: 'fracciones',
            title: 'Fracciones',
            difficultyRange: [4, 6],
            problemMix: 'mixed',
            questionCountRange: [4, 5],
            subtopics: ['representacion', 'equivalentes', 'comparacion', 'suma, resta y multiplicacion'],
          },
        ],
      },
      {
        id: 'geometria',
        title: '3. Geometria',
        topics: [
          {
            id: 'figuras-planas',
            title: 'Figuras Planas',
            difficultyRange: [4, 5],
            problemMix: 'mixed',
            questionCountRange: [4, 5],
            subtopics: ['triangulos', 'cuadrilateros', 'perimetro', 'area'],
          },
          {
            id: 'angulos',
            title: 'Angulos',
            difficultyRange: [4, 6],
            problemMix: 'mixed',
            questionCountRange: [4, 4],
            subtopics: ['tipos', 'medicion con transportador', 'complementarios y suplementarios'],
          },
        ],
      },
      {
        id: 'algebra-basica',
        title: '4. Algebra Basica',
        topics: [
          {
            id: 'expresiones-algebraicas',
            title: 'Expresiones Algebraicas',
            difficultyRange: [4, 5],
            problemMix: 'mixed',
            questionCountRange: [4, 4],
            subtopics: ['variables', 'traduccion verbal', 'evaluacion', 'simplificacion'],
          },
          {
            id: 'ecuaciones-basicas',
            title: 'Ecuaciones Basicas',
            difficultyRange: [4, 6],
            problemMix: 'mixed',
            questionCountRange: [4, 5],
            subtopics: ['x+a=b', 'ax=b', 'dos operaciones', 'traduccion de contexto'],
          },
        ],
      },
      {
        id: 'estadistica-probabilidad',
        title: '5. Estadistica y Probabilidad',
        topics: [
          {
            id: 'estadistica',
            title: 'Estadistica',
            difficultyRange: [2, 3],
            problemMix: 'contextualized',
            questionCountRange: [3, 4],
            subtopics: ['recoleccion de datos', 'tabla de frecuencia', 'grafico de barras', 'media aritmetica'],
          },
          {
            id: 'probabilidad-simple',
            title: 'Probabilidad Simple',
            difficultyRange: [4, 6],
            problemMix: 'mixed',
            questionCountRange: [3, 4],
            subtopics: ['espacio muestral', 'experimentos simples', 'probabilidad basica'],
          },
        ],
      },
      {
        id: 'medicion',
        title: '6. Medicion',
        topics: [
          {
            id: 'unidades-de-medida',
            title: 'Unidades de Medida',
            difficultyRange: [2, 3],
            problemMix: 'contextualized',
            questionCountRange: [3, 4],
            subtopics: ['longitud', 'masa', 'capacidad', 'conversion de unidades'],
          },
        ],
      },
    ],
    finalExam: {
      suggestedQuestions: 60,
      sections: [
        { id: 'aritmetica', count: 15 },
        { id: 'geometria', count: 12 },
        { id: 'algebra', count: 12 },
        { id: 'estadistica-probabilidad', count: 11 },
        { id: 'medicion', count: 10 },
      ],
    },
  },
]

export const getQuestionTypeByDifficulty = (difficulty) => {
  return Number(difficulty) >= 4 ? 'input' : 'multiple-choice'
}
