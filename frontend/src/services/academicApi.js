const API_BASE = String(import.meta.env.VITE_AI_API_URL || 'http://localhost:4010').replace(/\/$/, '')
const ACADEMIC_BASE = `${API_BASE}/api/academic`

const parseJsonResponse = async (response) => {
  const body = await response.text()
  if (!body) return {}

  try {
    return JSON.parse(body)
  } catch {
    return { error: body }
  }
}

const post = async (path, payload) => {
  const response = await fetch(`${ACADEMIC_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await parseJsonResponse(response)

  if (!response.ok) {
    throw new Error(data?.error || `HTTP ${response.status}`)
  }

  return data
}

export const academicApi = {
  getCurriculum: async (grade) => {
    const suffix = grade ? `?grade=${encodeURIComponent(String(grade))}` : ''
    const response = await fetch(`${ACADEMIC_BASE}/curriculum${suffix}`)
    const data = await parseJsonResponse(response)
    if (!response.ok) throw new Error(data?.error || `HTTP ${response.status}`)
    return data
  },
  getBranches: async () => {
    const response = await fetch(`${ACADEMIC_BASE}/branches`)
    const data = await parseJsonResponse(response)
    if (!response.ok) throw new Error(data?.error || `HTTP ${response.status}`)
    return data
  },
  getBranch: async (branchId) => {
    const response = await fetch(`${ACADEMIC_BASE}/branches/${encodeURIComponent(String(branchId || ''))}`)
    const data = await parseJsonResponse(response)
    if (!response.ok) throw new Error(data?.error || `HTTP ${response.status}`)
    return data
  },
  generateQuestion: (payload) => post('/question/generate', payload),
  getQuestionState: (payload) => post('/question/state', payload),
  submitAnswer: (payload) => post('/question/submit', payload),
  requestHelp: (payload) => post('/question/help', payload),
  requestTutorChat: (payload) => post('/question/chat', payload),
  resetQuestion: (payload) => post('/question/reset', payload),
  generateFinalExam: (payload) => post('/final-exam/generate', payload),
  generateEvaluation: (payload) => post('/evaluation/generate', payload),
  getDomainMap: (payload) => post('/domain/map', payload),
  getAdaptiveRecommendation: (payload) => post('/adaptive/recommendation', payload),
  getRetentionProfile: (payload) => post('/retention/profile', payload),
  getRetentionDue: (payload) => post('/retention/due', payload),
  getStudentAnalytics: (payload) => post('/analytics/student', payload),
  getTeacherAnalytics: (payload) => post('/analytics/teacher', payload),
  getPredictiveOutcomes: (payload) => post('/predictive/outcomes', payload),
  getMasterContext: (payload) => post('/master-context', payload),
  getAdminAnalytics: async () => {
    const response = await fetch(`${ACADEMIC_BASE}/analytics/admin`)
    const data = await parseJsonResponse(response)
    if (!response.ok) throw new Error(data?.error || `HTTP ${response.status}`)
    return data
  },
  getAbstractionRanking: async (limit = 20) => {
    const response = await fetch(`${ACADEMIC_BASE}/analytics/ranking?limit=${encodeURIComponent(String(limit))}`)
    const data = await parseJsonResponse(response)
    if (!response.ok) throw new Error(data?.error || `HTTP ${response.status}`)
    return data
  },
  updateLevel: (payload) => post('/level/update', payload),
}
