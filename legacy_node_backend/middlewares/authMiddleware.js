import { createClient } from '@supabase/supabase-js'

import prisma from '../lib/prismaClient.js'

const supabaseUrl = process.env.SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || ''

export const USER_ROLES = Object.freeze({
  STUDENT: 'STUDENT',
  TEACHER: 'TEACHER',
  ADMIN: 'ADMIN',
})

const USER_ROLE_LIST = Object.freeze(Object.values(USER_ROLES))
const ADMIN_ROLE_ALIASES = new Set(['admin', 'administrator'])
const TEACHER_ROLE_ALIASES = new Set(['teacher', 'profesor', 'professor', 'docente'])
const STUDENT_ROLE_ALIASES = new Set(['student', 'estudiante', 'alumno'])

const readAllowlist = (value, transform = (item) => item) =>
  new Set(
    String(value || '')
      .split(',')
      .map((item) => transform(String(item ?? '').trim()))
      .filter(Boolean),
  )

const adminEmailAllowlist = readAllowlist(process.env.ADMIN_EMAILS, (item) => item.toLowerCase())
const adminUserIdAllowlist = readAllowlist(process.env.ADMIN_USER_IDS)
const teacherEmailAllowlist = readAllowlist(process.env.TEACHER_EMAILS, (item) => item.toLowerCase())
const teacherUserIdAllowlist = readAllowlist(process.env.TEACHER_USER_IDS)

if (!supabaseUrl || !supabaseKey) {
  console.warn('[auth] Cuidado: faltan credenciales de Supabase en el backend (.env)')
}

const supabase = createClient(supabaseUrl, supabaseKey)

export const normalizeStoredRole = (value) => {
  const normalized = String(value ?? '').trim().toUpperCase()
  return USER_ROLE_LIST.includes(normalized) ? normalized : USER_ROLES.STUDENT
}

const normalizeMetadataRoles = (authUser) => {
  const appMetadata = authUser?.app_metadata || {}
  const userMetadata = authUser?.user_metadata || {}
  const rawRoles = [
    authUser?.role,
    appMetadata?.role,
    userMetadata?.role,
    ...(Array.isArray(appMetadata?.roles) ? appMetadata.roles : []),
    ...(Array.isArray(userMetadata?.roles) ? userMetadata.roles : []),
  ]

  return rawRoles
    .map((value) => String(value ?? '').trim().toLowerCase())
    .filter(Boolean)
}

const resolveMetadataRole = (authUser) => {
  const roles = normalizeMetadataRoles(authUser)

  if (roles.some((role) => ADMIN_ROLE_ALIASES.has(role))) return USER_ROLES.ADMIN
  if (roles.some((role) => TEACHER_ROLE_ALIASES.has(role))) return USER_ROLES.TEACHER
  if (roles.some((role) => STUDENT_ROLE_ALIASES.has(role))) return USER_ROLES.STUDENT
  return null
}

const resolveAllowlistedRole = (authUser) => {
  const email = String(authUser?.email || '').trim().toLowerCase()
  const userId = String(authUser?.id || '').trim()

  if ((email && adminEmailAllowlist.has(email)) || (userId && adminUserIdAllowlist.has(userId))) {
    return USER_ROLES.ADMIN
  }

  if ((email && teacherEmailAllowlist.has(email)) || (userId && teacherUserIdAllowlist.has(userId))) {
    return USER_ROLES.TEACHER
  }

  return null
}

export const resolveEffectiveRole = (authUser, dbUser = null) => {
  const storedRole = normalizeStoredRole(dbUser?.role || authUser?.role)
  const metadataRole = resolveMetadataRole(authUser)
  const allowlistedRole = resolveAllowlistedRole(authUser)

  if ([storedRole, metadataRole, allowlistedRole].includes(USER_ROLES.ADMIN)) return USER_ROLES.ADMIN
  if ([storedRole, metadataRole, allowlistedRole].includes(USER_ROLES.TEACHER)) return USER_ROLES.TEACHER
  return USER_ROLES.STUDENT
}

export const buildPermissions = (role) => {
  const normalizedRole = normalizeStoredRole(role)
  const isAdmin = normalizedRole === USER_ROLES.ADMIN
  const isTeacher = normalizedRole === USER_ROLES.TEACHER
  const isStudent = normalizedRole === USER_ROLES.STUDENT
  const isStaff = isAdmin || isTeacher

  return {
    role: normalizedRole,
    isAdmin,
    isTeacher,
    isStudent,
    isStaff,
    canAccessAdminPanel: isAdmin,
    canManageUsers: isAdmin,
    canManageRoles: isAdmin,
    canManageCurriculum: isAdmin,
    canManageSubjects: isAdmin,
    canManageLearningPaths: isAdmin,
    canViewOwnAnalytics: true,
    canViewOwnRetention: true,
    canViewRoster: isStaff,
    canViewStudentAnalytics: isStaff,
    canViewCohortAnalytics: isStaff,
    canViewAdministrativeAnalytics: isAdmin,
    canReviewRetention: isStaff,
    canActOnOwnProgress: true,
  }
}

const loadDbUser = async (userId) => {
  if (!userId) return null
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, role: true, gradeId: true, learningPathId: true },
  })
}

const ensureRoleContext = async (req) => {
  if (!req.user?.id) {
    const error = new Error('No autorizado. Falta sesion valida.')
    error.statusCode = 401
    throw error
  }

  if (req.effectiveRole && req.permissions) {
    return {
      dbUser: req.dbUser || null,
      effectiveRole: req.effectiveRole,
      permissions: req.permissions,
    }
  }

  const dbUser = req.dbUser || (await loadDbUser(req.user.id))
  const effectiveRole = resolveEffectiveRole(req.user, dbUser)
  const permissions = buildPermissions(effectiveRole)

  req.dbUser = dbUser
  req.effectiveRole = effectiveRole
  req.permissions = permissions

  return { dbUser, effectiveRole, permissions }
}

export const isAdminUser = (authUser, dbUser = null) => resolveEffectiveRole(authUser, dbUser) === USER_ROLES.ADMIN
export const isStaffUser = (authUser, dbUser = null) => {
  const role = resolveEffectiveRole(authUser, dbUser)
  return role === USER_ROLES.ADMIN || role === USER_ROLES.TEACHER
}

export const canAccessUserId = (req, targetUserId, options = {}) => {
  const requestedUserId = String(targetUserId ?? '').trim()
  if (!requestedUserId) return false

  const requesterUserId = String(req.user?.id || '').trim()
  if (requesterUserId && requesterUserId === requestedUserId) return true

  if (options.allowStaff === false) return false

  return Boolean(req.permissions?.isStaff)
}

export const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'No autorizado. Falta token de autenticacion.' })
      return
    }

    const token = authHeader.split(' ')[1]
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token)

    if (error || !user) {
      console.error('[auth] Error validando token:', error?.message)
      res.status(401).json({ error: 'Token invalido, manipulado o expirado.' })
      return
    }

    req.user = user
    next()
  } catch (error) {
    console.error('[auth] Error interno de autenticacion:', error)
    res.status(500).json({ error: 'Error interno verificando la sesion.' })
  }
}

export const attachRoleContext = async (req, res, next) => {
  try {
    await ensureRoleContext(req)
    next()
  } catch (error) {
    if (error?.statusCode === 401) {
      res.status(401).json({ error: error.message })
      return
    }

    console.error('[auth] Error resolviendo contexto de rol:', error)
    res.status(500).json({ error: 'Error interno verificando permisos del usuario.' })
  }
}

export const requireStaff = async (req, res, next) => {
  try {
    const { permissions } = await ensureRoleContext(req)

    if (!permissions.isStaff) {
      res.status(403).json({ error: 'Acceso restringido a personal docente o administradores.' })
      return
    }

    next()
  } catch (error) {
    if (error?.statusCode === 401) {
      res.status(401).json({ error: error.message })
      return
    }

    console.error('[auth] Error resolviendo permisos staff:', error)
    res.status(500).json({ error: 'Error interno verificando permisos del usuario.' })
  }
}

export const requireAdmin = async (req, res, next) => {
  try {
    const { permissions } = await ensureRoleContext(req)

    if (!permissions.isAdmin) {
      res.status(403).json({ error: 'Acceso restringido al panel administrativo.' })
      return
    }

    next()
  } catch (error) {
    if (error?.statusCode === 401) {
      res.status(401).json({ error: error.message })
      return
    }

    console.error('[auth] Error resolviendo permisos admin:', error)
    res.status(500).json({ error: 'Error interno verificando permisos administrativos.' })
  }
}
