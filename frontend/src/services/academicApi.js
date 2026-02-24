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
  resetQuestion: (payload) => post('/question/reset', payload),
  generateFinalExam: (payload) => post('/final-exam/generate', payload),
  updateLevel: (payload) => post('/level/update', payload),
}
