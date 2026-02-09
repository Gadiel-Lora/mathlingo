export const tokenStore = {
  get() {
    return localStorage.getItem('token') || ''
  },
  set(token) {
    localStorage.setItem('token', token)
  },
  getEmail() {
    return localStorage.getItem('session_email') || ''
  },
  setEmail(email) {
    localStorage.setItem('session_email', email)
  },
  getIsAdmin() {
    return localStorage.getItem('session_admin') === 'true'
  },
  setIsAdmin(value) {
    localStorage.setItem('session_admin', value ? 'true' : 'false')
  },
  clear() {
    localStorage.removeItem('token')
    localStorage.removeItem('session_email')
    localStorage.removeItem('session_admin')
  }
}
