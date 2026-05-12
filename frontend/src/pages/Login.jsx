import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'

import { useAuth } from '../context/AuthContext'

function Login() {
  const navigate = useNavigate()
  const { user, loading, login, loginWithGoogle } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState({ type: '', message: '' })

  if (!loading && user) return <Navigate to="/dashboard" replace />

  const handleSubmit = async (event) => {
    event.preventDefault()
    setFeedback({ type: '', message: '' })
    setSubmitting(true)

    try {
      await login(email, password)
      navigate('/dashboard', { replace: true })
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error?.message || 'No se pudo completar la autenticacion.',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleGoogleLogin = async () => {
    setFeedback({ type: '', message: '' })
    setSubmitting(true)
    try {
      await loginWithGoogle()
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error?.message || 'No se pudo iniciar con Google.',
      })
      setSubmitting(false)
    }
  }

  return (
    <div className="cm-shell">
      <header className="cm-navbar">
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link to="/" className="math-brand-lockup" aria-label="MathLingo inicio">
            <span className="math-brand-mark">x2</span>
            <span className="text-lg sm:text-xl">MathLingo</span>
          </Link>
          <Link to="/" className="math-nav-pill">
            Inicio
          </Link>
        </nav>
      </header>

      <main className="cm-page mx-auto max-w-6xl px-6 py-10">
        <div className="math-login-layout">
          <section className="math-formula-panel" aria-hidden="true">
            <div className="math-proof-board relative left-auto top-auto w-full translate-x-0">
              <div className="math-proof-row">
                <span>objetivo</span>
                <span>{'dominio >= 85%'}</span>
              </div>
              <div className="math-proof-row">
                <span>practica diaria</span>
                <span>+ precision</span>
              </div>
              <div className="math-proof-row">
                <span>ruta</span>
                <span>{'algebra -> calculo'}</span>
              </div>
            </div>
          </section>

          <section className="cm-card cm-reveal cm-delay-2 p-8">
            <div className="space-y-4">
              <span className="cm-badge cm-badge-live">Sesion academica segura</span>
              <div>
                <h1 className="text-3xl font-black text-slate-950">Ingresa a MathLingo</h1>
                <p className="mt-2 text-sm font-medium text-slate-600">
                  Continua tu progreso, tareas y mapa de habilidades matematicas.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={submitting}
              className="cm-btn-secondary mt-8 flex w-full gap-2 text-sm"
            >
              Continuar con Google
            </button>

            <div className="my-6 flex items-center gap-3 text-xs font-bold text-slate-400">
              <span className="h-px flex-1 bg-slate-200" />
              Correo academico
              <span className="h-px flex-1 bg-slate-200" />
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-700">Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="cm-input"
                  placeholder="tu@email.com"
                  autoComplete="email"
                  required
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-700">Contrasena</span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="cm-input"
                  placeholder="********"
                  autoComplete="current-password"
                  minLength={6}
                  required
                />
              </label>

              <button type="submit" disabled={submitting} className="cm-btn-primary flex w-full gap-2 text-sm">
                {submitting && <span className="cm-loader" />}
                {submitting ? 'Procesando...' : 'Entrar'}
              </button>

              <button
                type="button"
                onClick={() => navigate('/register')}
                disabled={submitting}
                className="cm-btn-secondary w-full text-sm"
              >
                Crear cuenta
              </button>

              {feedback.message && (
                <p
                  className={`rounded-lg border px-4 py-3 text-sm font-medium ${
                    feedback.type === 'error'
                      ? 'border-red-200 bg-red-50 text-red-700'
                      : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  }`}
                >
                  {feedback.message}
                </p>
              )}
            </form>
          </section>
        </div>
      </main>
    </div>
  )
}

export default Login
