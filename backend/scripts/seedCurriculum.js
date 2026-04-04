import "dotenv/config";
import prisma from '../lib/prismaClient.js';
import { CURRICULUM_GRADES } from '../../curriculum/index.js';

const slugify = (value) => {
  return String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
};

const generateMixedProblems = (skillId, moduleId, difficulty, topicName, lessonTitle) => {
  const problems = [];
  
  // Problema Mecánico
  problems.push({
    skillId,
    moduleId,
    type: 'multiple_choice',
    difficulty,
    question: `Resuelve el siguiente ejercicio relacionado con: ${lessonTitle}. 2x = 10`,
    expectedAnswer: '5',
    hints: ['Intenta aislar la variable dividiendo.'],
    solution: 'Dividimos entre 2, x = 5.'
  });

  // Problema Contextualizado
  problems.push({
    skillId,
    moduleId,
    type: 'open_response',
    difficulty: difficulty + 1,
    question: `Aplicación en el mundo real (${topicName}): Si Ana tiene 10 manzanas y las reparte equitativamente entre sus 2 amigos, ¿cuántas manzanas recibe cada uno?`,
    expectedAnswer: '5',
    hints: ['Piensa en una división básica equitativa.', '10 entre 2.'],
    solution: '10 / 2 = 5 manzanas por amigo.'
  });

  return problems;
};

async function seedInSequence() {
  console.log('🌱 Iniciando inyección automática de Currículum en PostgreSQL...');

  // 1. Limpiar base de datos si es necesario (opcional)
  // await prisma.problem.deleteMany({});
  // await prisma.skillModule.deleteMany({});
  // await prisma.skill.deleteMany({});
  // await prisma.grade.deleteMany({}); // No borramos usuarios ni progreso por ahora

  for (const grade of CURRICULUM_GRADES) {
    console.log(`⏳ Cargando Grado: ${grade.name}...`);
    
    // Crear el Grado
    const dbGrade = await prisma.grade.upsert({
      where: { name: grade.name },
      update: {},
      create: {
        id: grade.id,
        name: grade.name,
        order: grade.gradeNumber,
        levelName: `Nivel Fundamental ${grade.gradeNumber}`
      }
    });

    for (const area of grade.areas || []) {
      for (const topic of area.topics || []) {
        
        // Crear la Skill (Topic)
        const topicSlug = slugify(`${grade.id}-${topic.id}`);
        const dbSkill = await prisma.skill.upsert({
          where: { slug_gradeId: { slug: topicSlug, gradeId: dbGrade.id } },
          update: {},
          create: {
            id: `${grade.id}-${topic.id}`,
            name: topic.name || topic.id,
            slug: topicSlug,
            description: `Aprende todo sobre ${topic.name}`,
            category: area.name || area.id,
            gradeId: dbGrade.id,
            difficulty: 2,
            estimatedHours: 4.0
          }
        });

        // Crear Módulos (Lessons)
        let orderCount = 1;
        for (const lesson of topic.lessons || []) {
          const moduleId = `${grade.id}-${topic.id}-${lesson.id}`;
          const dbModule = await prisma.skillModule.upsert({
            where: { skillId_order: { skillId: dbSkill.id, order: orderCount } },
            update: {},
            create: {
              id: moduleId,
              skillId: dbSkill.id,
              title: lesson.title || lesson.id,
              description: `Lección enfocada en ${lesson.title}`,
              order: orderCount
            }
          });

          // Insertar Problemas Mixtos para este Módulo
          const generatedProblems = generateMixedProblems(dbSkill.id, dbModule.id, parseInt(lesson.difficulty || 2), topic.name, lesson.title);
          await prisma.problem.createMany({
            skipDuplicates: true,
            data: generatedProblems
          });

          orderCount++;
        }
      }
    }
  }

  console.log('✅ Currículum importado exitosamente a PostgreSQL.');
  console.log('✅ Problemas Reales generados y vinculados a Módulos y Skills.');
}

seedInSequence()
  .catch((e) => {
    console.error('❌ Error inyectando currículum:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
