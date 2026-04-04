import prisma from '../lib/prismaClient.js'
import { emitPedagogicalEvent } from './n8nService.js'

const MANAGED_GRADE_CODES = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'S1', 'S2', 'S3', 'S4', 'S5', 'PREU']

const lessonProgressId = (gradeId, topicId, lessonId) => `${gradeId}:${topicId}:${lessonId}`
const lessonRouteId = (gradeId, topicId, lessonId) => `${gradeId}~${topicId}~${lessonId}`
const clamp = (value, min, max) => Math.max(min, Math.min(max, value))

const byOrder = (left, right) => Number(left?.order || 0) - Number(right?.order || 0)
const toMasteryMap = (rows = []) => new Map(rows.map((row) => [String(row.skillId), row]))
const toLessonStateMap = (rows = []) => new Map(rows.map((row) => [String(row.lessonId), row]))

const transformLesson = (lesson, gradeId, topicId, masteryMap, lessonStateMap) => {
  const linkedSkills = (lesson.lessonSkills || []).map((row) => row.skill)
  const skillMasteries = linkedSkills.map((skill) => Number(masteryMap.get(skill.id)?.masteryPercentage || 0))
  const mastery = skillMasteries.length
    ? Math.round(skillMasteries.reduce((sum, value) => sum + value, 0) / skillMasteries.length)
    : 0
  const state = lessonStateMap.get(lesson.id)

  return {
    id: lesson.id,
    title: lesson.title,
    type: lesson.isCapstone ? 'exam' : 'practice',
    difficulty: Number(lesson.difficulty || 1),
    xpReward: Number(lesson.xpReward || 0),
    questionCount: 4,
    problemMix: lesson.isCapstone ? 'advanced-modeling' : lesson.difficulty >= 7 ? 'mixed' : 'contextualized',
    subtopics: linkedSkills.map((skill) => skill.name),
    skills: linkedSkills.map((skill) => skill.id),
    routeId: lessonRouteId(gradeId, topicId, lesson.id),
    progressId: lessonProgressId(gradeId, topicId, lesson.id),
    mastery,
    status: state?.status || (mastery >= 85 ? 'COMPLETED' : 'AVAILABLE'),
    isGateLesson: Boolean(lesson.isGateLesson),
  }
}

const transformGrade = (grade, masteryMap = new Map(), lessonStateMap = new Map()) => {
  const areas = (grade.bimesters || [])
    .slice()
    .sort(byOrder)
    .map((bimester) => ({
      id: bimester.id,
      name: bimester.title,
      topics: (bimester.units || [])
        .slice()
        .sort(byOrder)
        .map((unit) => ({
          id: unit.id,
          name: unit.title,
          subtopics: [unit.theme],
          lessons: (unit.lessons || [])
            .slice()
            .sort(byOrder)
            .map((lesson) => transformLesson(lesson, grade.id, unit.id, masteryMap, lessonStateMap)),
        })),
    }))

  return {
    id: grade.id,
    code: grade.code,
    name: grade.name,
    gradeNumber: Number(grade.order || 0),
    levelName: grade.levelName,
    areas,
    finalExam: {
      questionRange: grade.isPreUniversity ? [16, 24] : [12, 18],
    },
  }
}

const curriculumInclude = {
  bimesters: {
    orderBy: { order: 'asc' },
    include: {
      units: {
        orderBy: { order: 'asc' },
        include: {
          lessons: {
            orderBy: { order: 'asc' },
            include: {
              lessonSkills: {
                orderBy: { order: 'asc' },
                include: { skill: true },
              },
            },
          },
        },
      },
    },
  },
}

export const fetchCurriculumGrades = async ({ masteryRows = [], lessonStateRows = [] } = {}) => {
  const grades = await prisma.grade.findMany({
    where: { code: { in: MANAGED_GRADE_CODES } },
    orderBy: { order: 'asc' },
    include: curriculumInclude,
  })

  const masteryMap = toMasteryMap(masteryRows)
  const lessonStateMap = toLessonStateMap(lessonStateRows)

  return grades.map((grade) => transformGrade(grade, masteryMap, lessonStateMap))
}

export const fetchCurriculumGrade = async (gradeId, options = {}) => {
  const grade = await prisma.grade.findUnique({
    where: { id: gradeId },
    include: curriculumInclude,
  })

  if (!grade) return null
  return transformGrade(grade, toMasteryMap(options.masteryRows), toLessonStateMap(options.lessonStateRows))
}

export const fetchCurriculumBranches = async () => {
  const grades = await fetchCurriculumGrades()
  const branchMap = new Map()

  for (const grade of grades) {
    for (const area of grade.areas || []) {
      for (const topic of area.topics || []) {
        for (const lesson of topic.lessons || []) {
          const branchId = String((lesson.skills?.[0] || '').split(':')[0] || lesson.title || '').toLowerCase()
          const linkedSkillId = lesson.skills?.[0] || ''
          const skill = linkedSkillId ? await prisma.skill.findUnique({ where: { id: linkedSkillId } }).catch(() => null) : null
          const domainId = String(skill?.domain || 'ARITHMETIC').toLowerCase()
          const domainName = skill?.category || domainId

          if (!branchMap.has(domainId)) {
            branchMap.set(domainId, {
              id: domainId,
              name: domainName,
              description: `Ruta autonoma por la rama ${domainName}.`,
              lessonCount: 0,
              gradeIds: new Set(),
              modules: [],
            })
          }

          const branch = branchMap.get(domainId)
          branch.gradeIds.add(grade.id)

          let module = branch.modules.find((item) => item.gradeId === grade.id && item.areaId === area.id)
          if (!module) {
            module = {
              id: `${grade.id}:${domainId}:${area.id}`,
              gradeId: grade.id,
              gradeName: grade.name,
              gradeNumber: grade.gradeNumber,
              areaId: area.id,
              areaName: domainName,
              lessonCount: 0,
              topics: [],
            }
            branch.modules.push(module)
          }

          let branchTopic = module.topics.find((item) => item.id === topic.id)
          if (!branchTopic) {
            branchTopic = {
              id: topic.id,
              name: topic.name,
              lessons: [],
            }
            module.topics.push(branchTopic)
          }

          branchTopic.lessons.push(lesson)
          module.lessonCount += 1
          branch.lessonCount += 1
        }
      }
    }
  }

  return [...branchMap.values()].map((branch) => ({
    ...branch,
    gradeCount: branch.gradeIds.size,
    gradeIds: [...branch.gradeIds],
    modules: branch.modules.sort((left, right) => left.gradeNumber - right.gradeNumber || left.areaName.localeCompare(right.areaName)),
  }))
}

const determineSkillState = (skill, masteryMap, dependencyMap, thresholdMap) => {
  const mastery = Number(masteryMap.get(skill.id)?.masteryPercentage || 0)
  if (mastery >= Number(skill.masteryThreshold || 70)) return { mastery, state: 'mastered' }
  const prerequisites = dependencyMap.get(skill.id) || []
  const unlocked = prerequisites.every((prerequisiteId) => Number(masteryMap.get(prerequisiteId)?.masteryPercentage || 0) >= Number(thresholdMap.get(prerequisiteId) || 70))
  return { mastery, state: unlocked ? 'unlocked' : 'locked' }
}

export const buildLearningOverview = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      grade: true,
      learningPath: true,
      skillProgress: true,
      lessonStates: true,
    },
  })

  if (!user) return null

  const currentGrade = await fetchCurriculumGrade(user.gradeId, {
    masteryRows: user.skillProgress,
    lessonStateRows: user.lessonStates,
  })

  const skills = await prisma.skill.findMany({
    orderBy: [{ difficulty: 'asc' }, { code: 'asc' }],
    include: {
      lesson: { select: { id: true, title: true, gradeId: true } },
      grade: { select: { id: true, name: true } },
      incomingDependencies: { select: { parentSkillId: true } },
      outgoingDependencies: { select: { childSkillId: true } },
    },
  })

  const masteryMap = toMasteryMap(user.skillProgress)
  const dependencyMap = new Map(skills.map((skill) => [skill.id, skill.incomingDependencies.map((item) => item.parentSkillId)]))
  const thresholdMap = new Map(skills.map((skill) => [skill.id, skill.masteryThreshold]))

  const nodes = skills.map((skill) => {
    const status = determineSkillState(skill, masteryMap, dependencyMap, thresholdMap)
    const failures = Number(masteryMap.get(skill.id)?.consecutiveFailures || 0)
    return {
      id: skill.id,
      name: skill.name,
      domain: String(skill.domain || '').toLowerCase(),
      branch: skill.branch,
      difficulty: skill.difficulty,
      mastery: status.mastery,
      state: status.state,
      failures,
      val: 3 + Math.min(5, Math.ceil(skill.difficulty / 2)),
      gradeName: skill.grade?.name || '',
      lessonId: skill.lessonId,
      lessonTitle: skill.lesson?.title || '',
      prerequisites: dependencyMap.get(skill.id) || [],
    }
  })

  const links = skills.flatMap((skill) => skill.outgoingDependencies.map((edge) => ({ source: skill.id, target: edge.childSkillId })))

  const recommendation = nodes
    .filter((node) => node.state === 'unlocked' && node.mastery < 85)
    .sort((left, right) => right.failures - left.failures || left.mastery - right.mastery || left.difficulty - right.difficulty)[0] || null

  const ancestorRecommendation = recommendation
    ? (recommendation.prerequisites || []).map((id) => nodes.find((node) => node.id === id)).find((node) => node && node.mastery < 70) || null
    : null

  const branchProgress = [...new Set(nodes.map((node) => node.domain))].map((domain) => {
    const branchNodes = nodes.filter((node) => node.domain === domain)
    const averageMastery = branchNodes.length
      ? Math.round(branchNodes.reduce((sum, node) => sum + node.mastery, 0) / branchNodes.length)
      : 0
    return {
      id: domain,
      mastery: averageMastery,
      unlocked: branchNodes.filter((node) => node.state !== 'locked').length,
      total: branchNodes.length,
    }
  })

  return {
    profile: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      grade: user.grade,
      learningPath: user.learningPath,
      selectedPathType: user.selectedPathType,
      totalXP: user.totalXP,
      currentLevel: user.currentLevel,
      currentStreak: user.currentStreak,
      learningStyle: user.learningStyle,
    },
    gradeMap: currentGrade,
    constellation: {
      nodes,
      links,
      branchProgress,
      recommendation,
      ancestorRecommendation,
    },
  }
}

export const resolveLearningPathId = async (gradeId, selectedPathType) => {
  if (selectedPathType === 'AUTONOMOUS') {
    const path = await prisma.learningPath.findFirst({ where: { type: 'AUTONOMOUS' }, orderBy: { isDefault: 'desc' } })
    return path?.id || null
  }

  const gradePath = await prisma.learningPath.findFirst({ where: { type: 'GRADE', gradeId } })
  return gradePath?.id || null
}

export const updateSelectedPath = async ({ userId, selectedPathType }) => {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { gradeId: true } })
  if (!user) return null

  const learningPathId = await resolveLearningPathId(user.gradeId, selectedPathType)
  return prisma.user.update({
    where: { id: userId },
    data: {
      selectedPathType,
      learningPathId,
      lastActivityAt: new Date(),
    },
  })
}

export const persistStudentResponseEvent = async ({ userId, skillId = null, lessonId = null, problemId = null, problemFingerprint, answer, normalizedAnswer = null, isCorrect, attemptNumber = 1, xpGained = 0, timeTaken = 0, learningPathType = 'GRADE', tutorUsed = false, context = {} }) => {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) return { skipped: true, reason: 'user_not_found' }

  const attempt = await prisma.problemAttempt.create({
    data: {
      userId,
      problemId,
      skillId,
      lessonId,
      problemFingerprint,
      answer,
      normalizedAnswer,
      isCorrect,
      attemptNumber,
      xpGained,
      timeTaken,
      learningPathType,
      tutorUsed,
      context,
    },
  })

  let progress = null
  if (skillId) {
    const existing = await prisma.userSkillProgress.findUnique({ where: { userId_skillId: { userId, skillId } } })
    const nextCorrect = Number(existing?.correctAttempts || 0) + (isCorrect ? 1 : 0)
    const nextIncorrect = Number(existing?.incorrectAttempts || 0) + (isCorrect ? 0 : 1)
    const totalAttempts = nextCorrect + nextIncorrect
    const masteryDelta = isCorrect ? 12 : -6
    const masteryPercentage = clamp(Number(existing?.masteryPercentage || 0) + masteryDelta, 0, 100)
    progress = await prisma.userSkillProgress.upsert({
      where: { userId_skillId: { userId, skillId } },
      update: {
        masteryPercentage,
        problemsSolved: { increment: isCorrect ? 1 : 0 },
        problemsTotal: { increment: 1 },
        correctAttempts: nextCorrect,
        incorrectAttempts: nextIncorrect,
        consecutiveFailures: isCorrect ? 0 : Number(existing?.consecutiveFailures || 0) + 1,
        accuracy: totalAttempts > 0 ? (nextCorrect / totalAttempts) * 100 : 0,
        completedAt: masteryPercentage >= 85 ? new Date() : existing?.completedAt || null,
      },
      create: {
        userId,
        skillId,
        masteryPercentage,
        problemsSolved: isCorrect ? 1 : 0,
        problemsTotal: 1,
        correctAttempts: nextCorrect,
        incorrectAttempts: nextIncorrect,
        consecutiveFailures: isCorrect ? 0 : 1,
        accuracy: totalAttempts > 0 ? (nextCorrect / totalAttempts) * 100 : 0,
        completedAt: masteryPercentage >= 85 ? new Date() : null,
      },
    })
  }

  if (lessonId) {
    const existingLessonState = await prisma.userLessonState.findUnique({ where: { userId_lessonId: { userId, lessonId } } })
    await prisma.userLessonState.upsert({
      where: { userId_lessonId: { userId, lessonId } },
      update: {
        attemptsCount: { increment: 1 },
        lastProblemAt: new Date(),
        status: isCorrect ? 'IN_PROGRESS' : existingLessonState?.status || 'AVAILABLE',
        masteryPercentage: progress?.masteryPercentage || existingLessonState?.masteryPercentage || 0,
        unlockedAt: existingLessonState?.unlockedAt || new Date(),
        completedAt: progress?.masteryPercentage >= 85 ? new Date() : existingLessonState?.completedAt || null,
      },
      create: {
        userId,
        lessonId,
        attemptsCount: 1,
        lastProblemAt: new Date(),
        status: isCorrect ? 'IN_PROGRESS' : 'AVAILABLE',
        masteryPercentage: progress?.masteryPercentage || 0,
        unlockedAt: new Date(),
        completedAt: progress?.masteryPercentage >= 85 ? new Date() : null,
      },
    })
  }

  const answerEvent = await emitPedagogicalEvent({
    userId,
    type: 'ANSWER_SUBMITTED',
    skillId,
    lessonId,
    problemAttemptId: attempt.id,
    payload: {
      isCorrect,
      attemptNumber,
      xpGained,
      learningPathType,
      tutorUsed,
      progress: progress ? { masteryPercentage: progress.masteryPercentage, consecutiveFailures: progress.consecutiveFailures } : null,
      context,
    },
  })

  if (progress && Number(progress.consecutiveFailures || 0) >= 2) {
    await emitPedagogicalEvent({
      userId,
      type: 'SKILL_FAILED_TWICE',
      skillId,
      lessonId,
      problemAttemptId: attempt.id,
      payload: {
        consecutiveFailures: progress.consecutiveFailures,
        masteryPercentage: progress.masteryPercentage,
        context,
      },
    })
  }

  if (progress && Number(progress.masteryPercentage || 0) >= 85) {
    await emitPedagogicalEvent({
      userId,
      type: 'MASTERY_UPDATED',
      skillId,
      lessonId,
      problemAttemptId: attempt.id,
      payload: {
        masteryPercentage: progress.masteryPercentage,
        context,
      },
    })
  }

  return { skipped: false, attempt, progress, answerEvent }
}
