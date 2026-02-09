import { useEffect, useMemo, useState } from 'react'
import { api } from './services/api'
import { tokenStore } from './services/tokenStore'

const initialNotice = { type: '', message: '' }

export default function App() {
  const [notice, setNotice] = useState(initialNotice)
  const [token, setToken] = useState(tokenStore.get())
  const [sessionEmail, setSessionEmail] = useState(tokenStore.getEmail())
  const [isAdmin, setIsAdmin] = useState(tokenStore.getIsAdmin())

  const [registerEmail, setRegisterEmail] = useState('')
  const [registerPassword, setRegisterPassword] = useState('')

  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')

  const [modules, setModules] = useState([])
  const [moduleTitle, setModuleTitle] = useState('')
  const [moduleDescription, setModuleDescription] = useState('')

  const [progress, setProgress] = useState([])
  const [progressModuleId, setProgressModuleId] = useState('')
  const [progressXp, setProgressXp] = useState('')
  const [summary, setSummary] = useState(null)

  const [promoteEmail, setPromoteEmail] = useState('')

  const [loading, setLoading] = useState({
    register: false,
    login: false,
    modules: false,
    createModule: false,
    progress: false,
    addProgress: false,
    summary: false,
    promote: false,
    adminCheck: false
  })

  const hasToken = useMemo(() => Boolean(token), [token])

  const setLoadingState = (key, value) => {
    setLoading((prev) => ({ ...prev, [key]: value }))
  }

  const showNotice = (type, message) => {
    setNotice({ type, message })
    window.setTimeout(() => setNotice(initialNotice), 5000)
  }

  const loadModules = async () => {
    setLoadingState('modules', true)
    try {
      const data = await api.listModules()
      setModules(data)
    } catch (error) {
      showNotice('error', error.message)
    } finally {
      setLoadingState('modules', false)
    }
  }

  const loadProgress = async () => {
    if (!token) return
    setLoadingState('progress', true)
    try {
      const data = await api.listProgress()
      setProgress(data)
    } catch (error) {
      showNotice('error', error.message)
    } finally {
      setLoadingState('progress', false)
    }
  }

  const loadSummary = async () => {
    if (!token) return
    setLoadingState('summary', true)
    try {
      const data = await api.progressSummary()
      setSummary(data)
    } catch (error) {
      showNotice('error', error.message)
    } finally {
      setLoadingState('summary', false)
    }
  }

  const checkAdmin = async () => {
    if (!token) {
      setIsAdmin(false)
      tokenStore.setIsAdmin(false)
      return
    }

    setLoadingState('adminCheck', true)
    try {
      await api.listUsers()
      setIsAdmin(true)
      tokenStore.setIsAdmin(true)
    } catch (error) {
      if (
        error.message === 'Acción solo para admin' ||
        error.message === 'No autorizado'
      ) {
        setIsAdmin(false)
        tokenStore.setIsAdmin(false)
      } else {
        showNotice('error', error.message)
      }
    } finally {
      setLoadingState('adminCheck', false)
    }
  }

  useEffect(() => {
    loadModules()
  }, [])

  useEffect(() => {
    if (token) {
      loadProgress()
      loadSummary()
      checkAdmin()
    } else {
      setProgress([])
      setSummary(null)
      setIsAdmin(false)
      tokenStore.setIsAdmin(false)
    }
  }, [token])

  const handleRegister = async (event) => {
    event.preventDefault()
    setLoadingState('register', true)
    try {
      await api.register({ email: registerEmail, password: registerPassword })
      showNotice('success', 'User registered')
      setRegisterEmail('')
      setRegisterPassword('')
    } catch (error) {
      showNotice('error', error.message)
    } finally {
      setLoadingState('register', false)
    }
  }

  const handleLogin = async (event) => {
    event.preventDefault()
    setLoadingState('login', true)
    try {
      const data = await api.loginToken(loginEmail, loginPassword)
      tokenStore.set(data.access_token)
      tokenStore.setEmail(loginEmail)
      setToken(data.access_token)
      setSessionEmail(loginEmail)
      showNotice('success', 'Token saved')
      setLoginPassword('')
    } catch (error) {
      showNotice('error', error.message)
    } finally {
      setLoadingState('login', false)
    }
  }

  const handleLogout = () => {
    tokenStore.clear()
    setToken('')
    setSessionEmail('')
    setIsAdmin(false)
    showNotice('success', 'Token cleared')
  }

  const handleCreateModule = async (event) => {
    event.preventDefault()
    setLoadingState('createModule', true)
    try {
      const data = await api.createModule({
        title: moduleTitle,
        description: moduleDescription || null
      })
      setModules((prev) => [data, ...prev])
      setModuleTitle('')
      setModuleDescription('')
      showNotice('success', 'Module created')
    } catch (error) {
      showNotice('error', error.message)
    } finally {
      setLoadingState('createModule', false)
    }
  }

  const handleAddProgress = async (event) => {
    event.preventDefault()
    setLoadingState('addProgress', true)
    try {
      const payload = {
        module_id: Number(progressModuleId),
        xp: Number(progressXp)
      }
      const data = await api.addProgress(payload)
      setProgress((prev) => [data, ...prev])
      setProgressModuleId('')
      setProgressXp('')
      loadSummary()
      showNotice('success', 'Progress saved')
    } catch (error) {
      showNotice('error', error.message)
    } finally {
      setLoadingState('addProgress', false)
    }
  }

  const handlePromote = async (event) => {
    event.preventDefault()
    setLoadingState('promote', true)
    try {
      const data = await api.promoteUser({ email: promoteEmail })
      showNotice('success', `Promoted: ${data.email}`)
      setPromoteEmail('')
    } catch (error) {
      showNotice('error', error.message)
    } finally {
      setLoadingState('promote', false)
    }
  }

  return (
    <div className="app">
      <header className="hero">
        <div>
          <p className="eyebrow">Mathlingo</p>
          <h1>Adaptive learning, built for clarity.</h1>
          <p className="lead">
            Manage users, modules, and progress from one calm dashboard.
          </p>
        </div>
        <div className="token">
          <span>Sesión</span>
          <code>{hasToken ? 'Activa' : 'Inactiva'}</code>
          {sessionEmail && <span className="muted">{sessionEmail}</span>}
          {hasToken && (
            <span className="muted">
              {loading.adminCheck
                ? 'Rol: verificando...'
                : isAdmin
                ? 'Rol: admin'
                : 'Rol: user'}
            </span>
          )}
          <code>{hasToken ? `${token.slice(0, 18)}...` : 'No token'}</code>
          <button type="button" onClick={handleLogout} disabled={!hasToken}>
            Logout
          </button>
        </div>
      </header>

      {notice.message && (
        <div className={`notice ${notice.type}`}>{notice.message}</div>
      )}

      <main className="grid">
        <section className="card stagger">
          <h2>Auth</h2>
          <form onSubmit={handleRegister}>
            <label>
              Email
              <input
                type="email"
                value={registerEmail}
                onChange={(event) => setRegisterEmail(event.target.value)}
                required
              />
            </label>
            <label>
              Password
              <input
                type="password"
                value={registerPassword}
                onChange={(event) => setRegisterPassword(event.target.value)}
                required
              />
            </label>
            <button type="submit" disabled={loading.register}>
              {loading.register ? 'Registrando...' : 'Register'}
            </button>
          </form>
          <div className="divider" />
          <form onSubmit={handleLogin}>
            <label>
              Email
              <input
                type="email"
                value={loginEmail}
                onChange={(event) => setLoginEmail(event.target.value)}
                required
              />
            </label>
            <label>
              Password
              <input
                type="password"
                value={loginPassword}
                onChange={(event) => setLoginPassword(event.target.value)}
                required
              />
            </label>
            <button type="submit" disabled={loading.login}>
              {loading.login ? 'Ingresando...' : 'Login (token)'}
            </button>
          </form>
        </section>

        <section className="card stagger">
          <h2>Modules</h2>
          <button
            type="button"
            className="ghost"
            onClick={loadModules}
            disabled={loading.modules}
          >
            {loading.modules ? 'Cargando...' : 'Refresh modules'}
          </button>
          <ul className="list">
            {modules.length === 0 && <li>No modules yet</li>}
            {modules.map((module) => (
              <li key={module.id}>
                <strong>{module.title}</strong>
                <span>{module.description || 'No description'}</span>
              </li>
            ))}
          </ul>
          <div className="divider" />
          <form onSubmit={handleCreateModule}>
            <label>
              Title
              <input
                value={moduleTitle}
                onChange={(event) => setModuleTitle(event.target.value)}
                required
              />
            </label>
            <label>
              Description
              <input
                value={moduleDescription}
                onChange={(event) => setModuleDescription(event.target.value)}
              />
            </label>
            <button
              type="submit"
              disabled={!hasToken || !isAdmin || loading.createModule}
            >
              {loading.createModule ? 'Creando...' : 'Create module (admin)'}
            </button>
          </form>
        </section>

        <section className="card stagger">
          <h2>Progress</h2>
          <button
            type="button"
            className="ghost"
            onClick={loadProgress}
            disabled={!hasToken || loading.progress}
          >
            {loading.progress ? 'Cargando...' : 'Refresh progress'}
          </button>
          <ul className="list">
            {progress.length === 0 && <li>No progress yet</li>}
            {progress.map((item) => (
              <li key={item.id}>
                <strong>Module {item.module_id}</strong>
                <span>{item.xp} XP</span>
              </li>
            ))}
          </ul>
          <div className="summary">
            <span>Total XP</span>
            <strong>{summary ? summary.total_xp : 0}</strong>
          </div>
          <div className="divider" />
          <form onSubmit={handleAddProgress}>
            <label>
              Module ID
              <input
                type="number"
                value={progressModuleId}
                onChange={(event) => setProgressModuleId(event.target.value)}
                required
              />
            </label>
            <label>
              XP
              <input
                type="number"
                value={progressXp}
                onChange={(event) => setProgressXp(event.target.value)}
                required
              />
            </label>
            <button type="submit" disabled={!hasToken || loading.addProgress}>
              {loading.addProgress ? 'Guardando...' : 'Add progress'}
            </button>
          </form>
        </section>

        <section className="card stagger">
          <h2>Admin</h2>
          <p className="muted">Promote a user to admin.</p>
          <form onSubmit={handlePromote}>
            <label>
              User email
              <input
                type="email"
                value={promoteEmail}
                onChange={(event) => setPromoteEmail(event.target.value)}
                required
              />
            </label>
            <button
              type="submit"
              disabled={!hasToken || !isAdmin || loading.promote}
            >
              {loading.promote ? 'Promoviendo...' : 'Promote user'}
            </button>
          </form>
        </section>
      </main>
    </div>
  )
}
