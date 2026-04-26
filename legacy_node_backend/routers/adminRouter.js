import { randomUUID } from 'node:crypto'

import { Router } from 'express'

import prisma from '../lib/prismaClient.js'
import { buildPermissions, requireAdmin, requireAuth, resolveEffectiveRole, USER_ROLES } from '../middlewares/authMiddleware.js'
import { resolveLearningPathId } from '../services/learningBlueprintService.js'

const router = Router()

const GRADE_STAGES = new Set(['PRIMARY', 'SECONDARY', 'PRE_UNIVERSITY'])
const PATH_TYPES = new Set(['GRADE', 'AUTONOMOUS', 'HYBRID'])
const USER_ROLE_OPTIONS = new Set(Object.values(USER_ROLES))

const sanitize = (value) => String(value ?? '').trim()
const slugify = (value) => sanitize(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
const parseBoolean = (value, fallback = false) => {
  if (typeof value === 'boolean') return value
  const normalized = sanitize(value).toLowerCase()
  if (['1', 'true', 'yes', 'si'].includes(normalized)) return true
  if (['0', 'false', 'no'].includes(normalized)) return false
  return fallback
}
const parseInteger = (value, fallback = 0) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.floor(parsed)
}
const normalizeStage = (value) => {
  const normalized = sanitize(value).toUpperCase()
  return GRADE_STAGES.has(normalized) ? normalized : 'SECONDARY'
}
const normalizePathType = (value) => {
  const normalized = sanitize(value).toUpperCase()
  return PATH_TYPES.has(normalized) ? normalized : 'GRADE'
}
const normalizeRole = (value) => {
  const normalized = sanitize(value).toUpperCase()
  return USER_ROLE_OPTIONS.has(normalized) ? normalized : USER_ROLES.STUDENT
}

const handlePrismaError = (res, error, fallbackMessage) => {
  if (error?.code === 'P2002') {
    res.status(409).json({ error: 'Ya existe un registro con ese valor unico.' })
    return
  }

  console.error(fallbackMessage, error)
  res.status(500).json({ error: fallbackMessage })
}

const formatGrade = (grade) => ({
  id: grade.id,
  code: grade.code,
  name: grade.name,
  order: grade.order,
  stage: grade.stage,
  levelName: grade.levelName,
  foundationStyle: grade.foundationStyle,
  isPreUniversity: grade.isPreUniversity,
  counts: {
    users: Number(grade?._count?.users || 0),
    routes: Number(grade?._count?.learningPaths || 0),
    bimesters: Number(grade?._count?.bimesters || 0),
    lessons: Number(grade?._count?.lessons || 0),
    skills: Number(grade?._count?.skills || 0),
  },
})

const formatSubject = (subject) => ({
  id: subject.id,
  code: subject.code,
  name: subject.name,
  description: subject.description,
  counts: {
    routes: Number(subject?._count?.learningPaths || 0),
  },
})

const formatLearningPath = (path) => ({
  id: path.id,
  slug: path.slug,
  name: path.name,
  description: path.description,
  type: path.type,
  isAutonomous: path.isAutonomous,
  isDefault: path.isDefault,
  gradeId: path.gradeId,
  subjectId: path.subjectId,
  grade: path.grade
    ? {
        id: path.grade.id,
        name: path.grade.name,
        code: path.grade.code,
      }
    : null,
  subject: path.subject
    ? {
        id: path.subject.id,
        name: path.subject.name,
        code: path.subject.code,
      }
    : null,
  userCount: Number(path?._count?.users || 0),
  sequenceCount: Number(path?._count?.skillSequence || 0),
})

const formatUser = (user) => {
  const effectiveRole = resolveEffectiveRole(user, user)
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: effectiveRole,
    gradeId: user.gradeId,
    learningPathId: user.learningPathId,
    selectedPathType: user.selectedPathType,
    learningStyle: user.learningStyle,
    gradeLockEnabled: user.gradeLockEnabled,
    totalXP: user.totalXP,
    currentLevel: user.currentLevel,
    currentStreak: user.currentStreak,
    createdAt: user.createdAt,
    lastActivityAt: user.lastActivityAt,
    grade: user.grade
      ? {
          id: user.grade.id,
          name: user.grade.name,
          code: user.grade.code,
        }
      : null,
    learningPath: user.learningPath
      ? {
          id: user.learningPath.id,
          name: user.learningPath.name,
          slug: user.learningPath.slug,
          type: user.learningPath.type,
        }
      : null,
    permissions: buildPermissions(effectiveRole),
  }
}

const ensureGradeExists = async (gradeId) => {
  if (!gradeId) return null
  return prisma.grade.findUnique({ where: { id: gradeId } })
}

const ensureSubjectExists = async (subjectId) => {
  if (!subjectId) return null
  return prisma.subject.findUnique({ where: { id: subjectId } })
}

const ensureLearningPathExists = async (learningPathId) => {
  if (!learningPathId) return null
  return prisma.learningPath.findUnique({ where: { id: learningPathId } })
}

router.use(requireAuth, requireAdmin)

router.get('/meta', async (_req, res) => {
  try {
    const [grades, subjects, learningPaths] = await Promise.all([
      prisma.grade.findMany({ orderBy: { order: 'asc' }, select: { id: true, name: true, code: true, order: true } }),
      prisma.subject.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true, code: true } }),
      prisma.learningPath.findMany({
        orderBy: [{ type: 'asc' }, { name: 'asc' }],
        select: { id: true, name: true, slug: true, type: true, gradeId: true, subjectId: true },
      }),
    ])

    res.status(200).json({
      grades,
      subjects,
      learningPaths,
      enums: {
        gradeStages: [...GRADE_STAGES],
        pathTypes: [...PATH_TYPES],
        userRoles: [...USER_ROLE_OPTIONS],
      },
    })
  } catch (error) {
    handlePrismaError(res, error, 'No se pudo cargar la metadata administrativa.')
  }
})

router.get('/grades', async (_req, res) => {
  try {
    const grades = await prisma.grade.findMany({
      orderBy: { order: 'asc' },
      include: {
        _count: {
          select: {
            users: true,
            learningPaths: true,
            bimesters: true,
            lessons: true,
            skills: true,
          },
        },
      },
    })

    res.status(200).json({ grades: grades.map(formatGrade) })
  } catch (error) {
    handlePrismaError(res, error, 'No se pudo cargar los grados.')
  }
})

router.post('/grades', async (req, res) => {
  try {
    const id = sanitize(req.body?.id) || `grade-${parseInteger(req.body?.order, Date.now())}`
    const grade = await prisma.grade.create({
      data: {
        id,
        code: sanitize(req.body?.code).toUpperCase(),
        name: sanitize(req.body?.name),
        order: parseInteger(req.body?.order, 0),
        stage: normalizeStage(req.body?.stage),
        levelName: sanitize(req.body?.levelName) || 'Secundaria',
        foundationStyle: sanitize(req.body?.foundationStyle) || 'singapore-finland',
        isPreUniversity: parseBoolean(req.body?.isPreUniversity),
      },
      include: {
        _count: {
          select: {
            users: true,
            learningPaths: true,
            bimesters: true,
            lessons: true,
            skills: true,
          },
        },
      },
    })

    res.status(201).json({ grade: formatGrade(grade) })
  } catch (error) {
    handlePrismaError(res, error, 'No se pudo crear el grado.')
  }
})

router.put('/grades/:id', async (req, res) => {
  try {
    const grade = await prisma.grade.update({
      where: { id: sanitize(req.params?.id) },
      data: {
        code: sanitize(req.body?.code).toUpperCase(),
        name: sanitize(req.body?.name),
        order: parseInteger(req.body?.order, 0),
        stage: normalizeStage(req.body?.stage),
        levelName: sanitize(req.body?.levelName) || 'Secundaria',
        foundationStyle: sanitize(req.body?.foundationStyle) || 'singapore-finland',
        isPreUniversity: parseBoolean(req.body?.isPreUniversity),
      },
      include: {
        _count: {
          select: {
            users: true,
            learningPaths: true,
            bimesters: true,
            lessons: true,
            skills: true,
          },
        },
      },
    })

    res.status(200).json({ grade: formatGrade(grade) })
  } catch (error) {
    handlePrismaError(res, error, 'No se pudo actualizar el grado.')
  }
})

router.delete('/grades/:id', async (req, res) => {
  try {
    const gradeId = sanitize(req.params?.id)
    const grade = await prisma.grade.findUnique({
      where: { id: gradeId },
      include: {
        _count: {
          select: {
            users: true,
            learningPaths: true,
            bimesters: true,
            lessons: true,
            skills: true,
          },
        },
      },
    })

    if (!grade) {
      res.status(404).json({ error: 'Grado no encontrado.' })
      return
    }

    const blockers = Object.values(grade._count || {}).reduce((sum, value) => sum + Number(value || 0), 0)
    if (blockers > 0) {
      res.status(409).json({ error: 'No se puede eliminar un grado con usuarios, lecciones, skills o rutas asociadas.' })
      return
    }

    await prisma.grade.delete({ where: { id: gradeId } })
    res.status(204).send()
  } catch (error) {
    handlePrismaError(res, error, 'No se pudo eliminar el grado.')
  }
})

router.get('/subjects', async (_req, res) => {
  try {
    const subjects = await prisma.subject.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: {
            learningPaths: true,
          },
        },
      },
    })

    res.status(200).json({ subjects: subjects.map(formatSubject) })
  } catch (error) {
    handlePrismaError(res, error, 'No se pudo cargar las materias.')
  }
})

router.post('/subjects', async (req, res) => {
  try {
    const code = sanitize(req.body?.code).toUpperCase()
    const subject = await prisma.subject.create({
      data: {
        id: sanitize(req.body?.id) || randomUUID(),
        code,
        name: sanitize(req.body?.name),
        description: sanitize(req.body?.description) || 'Materia creada desde el panel administrativo.',
      },
      include: {
        _count: {
          select: {
            learningPaths: true,
          },
        },
      },
    })

    res.status(201).json({ subject: formatSubject(subject) })
  } catch (error) {
    handlePrismaError(res, error, 'No se pudo crear la materia.')
  }
})

router.put('/subjects/:id', async (req, res) => {
  try {
    const subject = await prisma.subject.update({
      where: { id: sanitize(req.params?.id) },
      data: {
        code: sanitize(req.body?.code).toUpperCase(),
        name: sanitize(req.body?.name),
        description: sanitize(req.body?.description) || 'Materia actualizada desde el panel administrativo.',
      },
      include: {
        _count: {
          select: {
            learningPaths: true,
          },
        },
      },
    })

    res.status(200).json({ subject: formatSubject(subject) })
  } catch (error) {
    handlePrismaError(res, error, 'No se pudo actualizar la materia.')
  }
})

router.delete('/subjects/:id', async (req, res) => {
  try {
    const subjectId = sanitize(req.params?.id)
    const subject = await prisma.subject.findUnique({
      where: { id: subjectId },
      include: {
        _count: {
          select: {
            learningPaths: true,
          },
        },
      },
    })

    if (!subject) {
      res.status(404).json({ error: 'Materia no encontrada.' })
      return
    }

    if (Number(subject?._count?.learningPaths || 0) > 0) {
      res.status(409).json({ error: 'No se puede eliminar una materia con rutas asociadas.' })
      return
    }

    await prisma.subject.delete({ where: { id: subjectId } })
    res.status(204).send()
  } catch (error) {
    handlePrismaError(res, error, 'No se pudo eliminar la materia.')
  }
})

router.get('/learning-paths', async (_req, res) => {
  try {
    const learningPaths = await prisma.learningPath.findMany({
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
      include: {
        grade: true,
        subject: true,
        _count: {
          select: {
            users: true,
            skillSequence: true,
          },
        },
      },
    })

    res.status(200).json({ learningPaths: learningPaths.map(formatLearningPath) })
  } catch (error) {
    handlePrismaError(res, error, 'No se pudo cargar las rutas.')
  }
})

router.post('/learning-paths', async (req, res) => {
  try {
    const type = normalizePathType(req.body?.type)
    const gradeId = sanitize(req.body?.gradeId) || null
    const subjectId = sanitize(req.body?.subjectId) || null
    const slug = slugify(req.body?.slug || req.body?.name)

    if (gradeId && !(await ensureGradeExists(gradeId))) {
      res.status(404).json({ error: 'El grado asociado no existe.' })
      return
    }

    if (subjectId && !(await ensureSubjectExists(subjectId))) {
      res.status(404).json({ error: 'La materia asociada no existe.' })
      return
    }

    const isDefault = parseBoolean(req.body?.isDefault)
    if (isDefault) {
      await prisma.learningPath.updateMany({
        where: type === 'GRADE' ? { type, gradeId } : { type },
        data: { isDefault: false },
      })
    }

    const learningPath = await prisma.learningPath.create({
      data: {
        id: sanitize(req.body?.id) || randomUUID(),
        slug,
        name: sanitize(req.body?.name),
        description: sanitize(req.body?.description) || 'Ruta creada desde el panel administrativo.',
        type,
        isAutonomous: type === 'AUTONOMOUS' || parseBoolean(req.body?.isAutonomous),
        isDefault,
        gradeId,
        subjectId,
      },
      include: {
        grade: true,
        subject: true,
        _count: {
          select: {
            users: true,
            skillSequence: true,
          },
        },
      },
    })

    res.status(201).json({ learningPath: formatLearningPath(learningPath) })
  } catch (error) {
    handlePrismaError(res, error, 'No se pudo crear la ruta.')
  }
})

router.put('/learning-paths/:id', async (req, res) => {
  try {
    const type = normalizePathType(req.body?.type)
    const gradeId = sanitize(req.body?.gradeId) || null
    const subjectId = sanitize(req.body?.subjectId) || null

    if (gradeId && !(await ensureGradeExists(gradeId))) {
      res.status(404).json({ error: 'El grado asociado no existe.' })
      return
    }

    if (subjectId && !(await ensureSubjectExists(subjectId))) {
      res.status(404).json({ error: 'La materia asociada no existe.' })
      return
    }

    const pathId = sanitize(req.params?.id)
    const isDefault = parseBoolean(req.body?.isDefault)
    if (isDefault) {
      await prisma.learningPath.updateMany({
        where: {
          id: { not: pathId },
          ...(type === 'GRADE' ? { type, gradeId } : { type }),
        },
        data: { isDefault: false },
      })
    }

    const learningPath = await prisma.learningPath.update({
      where: { id: pathId },
      data: {
        slug: slugify(req.body?.slug || req.body?.name),
        name: sanitize(req.body?.name),
        description: sanitize(req.body?.description) || 'Ruta actualizada desde el panel administrativo.',
        type,
        isAutonomous: type === 'AUTONOMOUS' || parseBoolean(req.body?.isAutonomous),
        isDefault,
        gradeId,
        subjectId,
      },
      include: {
        grade: true,
        subject: true,
        _count: {
          select: {
            users: true,
            skillSequence: true,
          },
        },
      },
    })

    res.status(200).json({ learningPath: formatLearningPath(learningPath) })
  } catch (error) {
    handlePrismaError(res, error, 'No se pudo actualizar la ruta.')
  }
})

router.delete('/learning-paths/:id', async (req, res) => {
  try {
    const learningPathId = sanitize(req.params?.id)
    const learningPath = await prisma.learningPath.findUnique({
      where: { id: learningPathId },
      include: {
        _count: {
          select: {
            users: true,
            skillSequence: true,
          },
        },
      },
    })

    if (!learningPath) {
      res.status(404).json({ error: 'Ruta no encontrada.' })
      return
    }

    if (Number(learningPath?._count?.users || 0) > 0) {
      res.status(409).json({ error: 'No se puede eliminar una ruta con usuarios asociados.' })
      return
    }

    await prisma.learningPath.delete({ where: { id: learningPathId } })
    res.status(204).send()
  } catch (error) {
    handlePrismaError(res, error, 'No se pudo eliminar la ruta.')
  }
})

router.get('/users', async (_req, res) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: [{ updatedAt: 'desc' }, { fullName: 'asc' }],
      include: {
        grade: true,
        learningPath: true,
      },
    })

    res.status(200).json({ users: users.map(formatUser) })
  } catch (error) {
    handlePrismaError(res, error, 'No se pudo cargar los usuarios.')
  }
})

router.patch('/users/:id', async (req, res) => {
  try {
    const userId = sanitize(req.params?.id)
    const existing = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        gradeId: true,
        selectedPathType: true,
        learningPathId: true,
      },
    })

    if (!existing) {
      res.status(404).json({ error: 'Usuario no encontrado.' })
      return
    }

    const gradeId = sanitize(req.body?.gradeId) || existing.gradeId
    if (!(await ensureGradeExists(gradeId))) {
      res.status(404).json({ error: 'El grado indicado no existe.' })
      return
    }

    const selectedPathType = normalizePathType(req.body?.selectedPathType || existing.selectedPathType)
    let learningPathId = sanitize(req.body?.learningPathId) || existing.learningPathId || null

    if (learningPathId) {
      const learningPath = await ensureLearningPathExists(learningPathId)
      if (!learningPath) {
        res.status(404).json({ error: 'La ruta seleccionada no existe.' })
        return
      }
    } else {
      learningPathId = await resolveLearningPathId(gradeId, selectedPathType)
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        fullName: sanitize(req.body?.fullName) || undefined,
        role: normalizeRole(req.body?.role || existing.role),
        gradeId,
        learningPathId,
        selectedPathType,
        learningStyle: sanitize(req.body?.learningStyle) || undefined,
        gradeLockEnabled:
          typeof req.body?.gradeLockEnabled === 'undefined'
            ? undefined
            : parseBoolean(req.body?.gradeLockEnabled, true),
        lastActivityAt: new Date(),
      },
      include: {
        grade: true,
        learningPath: true,
      },
    })

    res.status(200).json({ user: formatUser(user) })
  } catch (error) {
    handlePrismaError(res, error, 'No se pudo actualizar el usuario.')
  }
})

export default router
