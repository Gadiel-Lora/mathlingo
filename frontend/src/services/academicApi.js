import { supabase } from '../lib/supabase'

const API_BASE = String(import.meta.env.VITE_AI_API_URL || 'http://localhost:4000').replace(/\/$/, '')
const ACADEMIC_BASE = `${API_BASE}/api/academic`
const AUTH_BASE = `${API_BASE}/api/auth`
const LEARNING_BASE = `${API_BASE}/api/learning`
const ADMIN_BASE = `${API_BASE}/api/admin`

const getAuthHeaders = async () => {
  const { data: { session } } = await supabase.auth.getSession()
  const headers = { 'Content-Type': 'application/json' }
  if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`
  return headers
}

const parseJsonResponse = async (response) => {
  const body = await response.text()
  if (!body) return {}
  try {
    return JSON.parse(body)
  } catch {
    return { error: body }
  }
}

const request = async (url, options = {}) => {
  const response = await fetch(url, options)
  const data = await parseJsonResponse(response)
  if (!response.ok) throw new Error(data?.detail || data?.error || `HTTP ${response.status}`)
  return data
}

const post = async (base, path, payload) => {
  const headers = await getAuthHeaders()
  return request(`${base}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  })
}

const send = async (method, url, payload) => {
  const headers = await getAuthHeaders()
  return request(url, {
    method,
    headers,
    ...(typeof payload === 'undefined' ? {} : { body: JSON.stringify(payload) }),
  })
}

const get = async (url) => {
  const headers = await getAuthHeaders()
  return request(url, { headers })
}

export const academicApi = {
  getCurriculum: async (grade) => get(
    grade
      ? `${ACADEMIC_BASE}/curriculum?grade=${encodeURIComponent(String(grade))}`
      : `${ACADEMIC_BASE}/curriculum`,
  ),
  getBranches: async () => get(`${ACADEMIC_BASE}/branches`),
  getBranch: async (branchId) => get(`${ACADEMIC_BASE}/branches/${encodeURIComponent(String(branchId))}`),
  getLearningOverview: async () => get(`${LEARNING_BASE}/overview`),
  updateLearningPath: (payload) => post(LEARNING_BASE, '/path', payload),
  recordStudentResponse: (payload) => post(LEARNING_BASE, '/events/answer', payload),
  requestHintEvent: (payload) => post(LEARNING_BASE, '/events/hint', payload),
  markLessonCompleted: (payload) => post(LEARNING_BASE, '/events/lesson-completed', payload),

  generateQuestion: (payload) => post(ACADEMIC_BASE, '/question/generate', payload),
  getQuestionState: (payload) => post(ACADEMIC_BASE, '/question/state', payload),
  submitAnswer: (payload) => post(ACADEMIC_BASE, '/question/submit', payload),
  requestHelp: (payload) => post(ACADEMIC_BASE, '/question/help', payload),
  requestTutorChat: (payload) => post(ACADEMIC_BASE, '/question/chat', payload),
  resetQuestion: (payload) => post(ACADEMIC_BASE, '/question/reset', payload),
  generateFinalExam: (payload) => post(ACADEMIC_BASE, '/final-exam/generate', payload),
  generateEvaluation: (payload) => post(ACADEMIC_BASE, '/evaluation/generate', payload),
  getDomainMap: (payload) => post(ACADEMIC_BASE, '/domain/map', payload),
  getAdaptiveRecommendation: (payload) => post(ACADEMIC_BASE, '/adaptive/recommendation', payload),
  getRetentionProfile: (payload) => post(ACADEMIC_BASE, '/retention/profile', payload),
  getRetentionDue: (payload) => post(ACADEMIC_BASE, '/retention/due', payload),
  getStudentAnalytics: (payload) => post(ACADEMIC_BASE, '/analytics/student', payload),
  getTeacherAnalytics: (payload) => post(ACADEMIC_BASE, '/analytics/teacher', payload),
  getPredictiveOutcomes: (payload) => post(ACADEMIC_BASE, '/predictive/outcomes', payload),
  getMasterContext: (payload) => post(ACADEMIC_BASE, '/master-context', payload),
  updateLevel: (payload) => post(ACADEMIC_BASE, '/level/update', payload),
  getAdminAnalytics: async () => get(`${ACADEMIC_BASE}/analytics/admin`),
  getAbstractionRanking: async (limit = 20) => get(`${ACADEMIC_BASE}/analytics/ranking?limit=${encodeURIComponent(String(limit))}`),
  getAdminMeta: async () => get(`${ADMIN_BASE}/meta`),
  getAdminGrades: async () => get(`${ADMIN_BASE}/grades`),
  createAdminGrade: async (payload) => send('POST', `${ADMIN_BASE}/grades`, payload),
  updateAdminGrade: async (gradeId, payload) => send('PUT', `${ADMIN_BASE}/grades/${encodeURIComponent(String(gradeId))}`, payload),
  deleteAdminGrade: async (gradeId) => send('DELETE', `${ADMIN_BASE}/grades/${encodeURIComponent(String(gradeId))}`),
  getAdminSubjects: async () => get(`${ADMIN_BASE}/subjects`),
  createAdminSubject: async (payload) => send('POST', `${ADMIN_BASE}/subjects`, payload),
  updateAdminSubject: async (subjectId, payload) => send('PUT', `${ADMIN_BASE}/subjects/${encodeURIComponent(String(subjectId))}`, payload),
  deleteAdminSubject: async (subjectId) => send('DELETE', `${ADMIN_BASE}/subjects/${encodeURIComponent(String(subjectId))}`),
  getAdminLearningPaths: async () => get(`${ADMIN_BASE}/learning-paths`),
  createAdminLearningPath: async (payload) => send('POST', `${ADMIN_BASE}/learning-paths`, payload),
  updateAdminLearningPath: async (pathId, payload) => send('PUT', `${ADMIN_BASE}/learning-paths/${encodeURIComponent(String(pathId))}`, payload),
  deleteAdminLearningPath: async (pathId) => send('DELETE', `${ADMIN_BASE}/learning-paths/${encodeURIComponent(String(pathId))}`),
  getAdminUsers: async () => get(`${ADMIN_BASE}/users`),
  updateAdminUser: async (userId, payload) => send('PATCH', `${ADMIN_BASE}/users/${encodeURIComponent(String(userId))}`, payload),

  syncUser: async (payload) => {
    const headers = await getAuthHeaders()
    return request(`${AUTH_BASE}/sync`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    })
  },
  getUserProfile: async () => get(`${AUTH_BASE}/profile`),
}
