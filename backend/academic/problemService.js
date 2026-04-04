/**
 * Servicio de acceso a Problemas reales almacenados en PostgreSQL.
 * Actúa como capa de datos previa al motor de generación en memoria.
 */
import prisma from '../lib/prismaClient.js';

/**
 * Encuentra un problema real de la BD que coincida con el tema y dificultad pedidos.
 * Busca primero por slug del skill, luego por categoría si no hay coincidencia exacta.
 * 
 * @param {object} options
 * @param {string} options.topic  - El topic/slug del curriculum (ej: 'ecuaciones-lineales-primer-grado')
 * @param {number} options.difficulty - Dificultad numérica del 1 al 10
 * @param {string[]} [options.excludedIds=[]] - IDs de problemas ya vistos (para no repetir)
 * @returns {Promise<object|null>} Problema formateado o null si no hay coincidencia
 */
export async function findRealProblemForTopic({ topic, difficulty, excludedIds = [] }) {
  if (!topic) return null;

  try {
    // 1. Buscar el Skill cuyo slug coincida con el topic del currículum
    const skill = await prisma.skill.findFirst({
      where: {
        OR: [
          { slug: { contains: topic.toLowerCase() } },
          { name: { contains: topic.toLowerCase().replace(/-/g, ' '), mode: 'insensitive' } },
        ]
      }
    });

    if (!skill) return null;

    // 2. Buscar un problema de ese skill con dificultad similar (±2)
    const problem = await prisma.problem.findFirst({
      where: {
        skillId: skill.id,
        difficulty: {
          gte: Math.max(1, difficulty - 2),
          lte: Math.min(10, difficulty + 2),
        },
        ...(excludedIds.length > 0 ? { id: { notIn: excludedIds } } : {}),
      },
      orderBy: { createdAt: 'asc' }, // Rotar problemas en orden
    });

    if (!problem) return null;

    // 3. Formatear al esquema que espera el frontend (igual que generateQuestion)
    return formatProblemAsQuestion(problem, skill);
  } catch (err) {
    console.warn('[problemService] Error consultando DB, fallback a motor AI:', err.message);
    return null;
  }
}

/**
 * Convierte un Problem de Prisma al formato interno de pregunta del sistema.
 */
function formatProblemAsQuestion(problem, skill) {
  const isMultipleChoice = problem.type === 'multiple_choice';
  const correctAnswer = problem.expectedAnswer;

  // Generar opciones (distractores numéricos simples si es múltiple opción)
  let options = [];
  if (isMultipleChoice) {
    const numeric = parseFloat(correctAnswer);
    if (!isNaN(numeric)) {
      const distractors = [numeric + 1, numeric - 1, numeric + 2].map((n) => String(n));
      options = shuffleArray([correctAnswer, ...distractors]).map((opt, i) => ({
        id: String.fromCharCode(65 + i), // A, B, C, D
        text: opt,
      }));
    } else {
      options = [{ id: 'A', text: correctAnswer }]; // Fallback
    }
  }

  return {
    id: problem.id,
    hash: `db-${problem.id}`,           // Prefijo para distinguirlo de preguntas generadas
    templateId: `db-template-${problem.id}`,
    fingerprint: `db-fp-${problem.id}`,
    source: 'database',                  // Marcamos el origen
    topic: skill.slug,
    category: skill.category,
    prompt: problem.question,
    type: isMultipleChoice ? 'multiple-choice' : 'input',
    options: isMultipleChoice ? options : [],
    correctAnswer,
    difficulty: problem.difficulty,
    hints: problem.hints || [],
    solution: problem.solution || '',
    explanationTemplate: problem.solution
      ? `Solución: ${problem.solution}`
      : 'Paso 1: Analiza el problema. Paso 2: Aplica la operación correcta. Resultado: {answer}.',
  };
}

function shuffleArray(arr) {
  const next = [...arr];
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}
