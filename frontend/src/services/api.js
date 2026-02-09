import { http } from './http'

const mapDetail = (detail) => {
  const dictionary = {
    'Invalid credentials': 'Credenciales inválidas',
    'Admin access required': 'Acción solo para admin',
    'Email already registered': 'Email ya registrado',
    'Invalid module_id': 'Datos inválidos',
    'Invalid xp': 'Datos inválidos',
    'Progress already exists for this module': 'Progreso ya registrado'
  }
  return dictionary[detail]
}

const errorMessage = (error) => {
  if (!error?.response) {
    return 'Error de red'
  }

  const status = error.response.status
  const data = error.response.data
  const detail = data?.detail || data?.message
  const mapped = mapDetail(detail)

  if (mapped) {
    return mapped
  }

  if (status === 401) {
    return 'No autorizado'
  }

  if (status === 403) {
    return 'Acción solo para admin'
  }

  if (status === 400) {
    return detail || 'Datos inválidos'
  }

  return detail || error?.message || 'Request failed'
}

const request = async (method, url, data, config) => {
  try {
    const response = await http.request({ method, url, data, ...config })
    return response.data
  } catch (error) {
    throw new Error(errorMessage(error))
  }
}

export const api = {
  register(payload) {
    return request('post', '/auth/register', payload)
  },
  loginToken(email, password) {
    const form = new URLSearchParams()
    form.append('username', email)
    form.append('password', password)
    return request('post', '/auth/token', form, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    })
  },
  listModules() {
    return request('get', '/modules/')
  },
  createModule(payload) {
    return request('post', '/modules/', payload)
  },
  listProgress() {
    return request('get', '/progress/')
  },
  addProgress(payload) {
    return request('post', '/progress/', payload)
  },
  progressSummary() {
    return request('get', '/progress/summary')
  },
  promoteUser(payload) {
    return request('post', '/users/promote', payload)
  },
  listUsers() {
    return request('get', '/users/')
  }
}
