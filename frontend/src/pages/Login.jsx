import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'

import { useAuth } from '../context/AuthContext'

function Login() {
  const navigate = useNavigate()
  const { user, loading, login, register } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isRegisterMode, setIsRegisterMode] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState({ type: '', message: '' })

  if (!loading && user) {
    return <Navigate to="/dashboard" replace />
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setFeedback({ type: '', message: '' })
    setSubmitting(true)

    try {
      if (isRegisterMode) {
        await register(email, password)
        setFeedback({
          type: 'success',
          message: 'Cuenta local creada. Sesion iniciada.',
        })
        navigate('/dashboard', { replace: true })
      } else {
        await login(email, password)
        navigate('/dashboard', { replace: true })
      }
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error?.message || 'No se pudo completar la autenticacion local.',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="cm-shell">
      <div className="cm-orb cm-orb-cyan left-[-5rem] top-[9rem] h-52 w-52" />
      <div className="cm-orb cm-orb-gold right-[-4rem] top-[20rem] h-44 w-44" />

      <main className="cm-page px-6 pt-20 pb-16">
        <div className="cm-card cm-reveal cm-delay-2 mx-auto max-w-md p-8">
          <div className="space-y-6">
            <p className="cm-reveal cm-delay-1">
              <span className="cm-badge cm-badge-live">Sesión local segura</span>
            </p>
            <h1 className="cm-reveal cm-delay-2 max-w-2xl text-3xl font-semibold tracking-tight text-coastal-mist">
              Login
            </h1>
            <p className="cm-reveal cm-delay-3 text-coastal-mist/55">
              Ingresa para continuar tu progreso.
            </p>
          </div>

          <form className="mt-12 space-y-6" onSubmit={handleSubmit}>
            <label className="cm-reveal cm-delay-1 block">
              <span className="mb-2 block text-sm text-coastal-mist/85">Email</span>
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

            <label className="cm-reveal cm-delay-2 block">
              <span className="mb-2 block text-sm text-coastal-mist/85">Contrasena</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="cm-input"
                placeholder="********"
                autoComplete={isRegisterMode ? 'new-password' : 'current-password'}
                minLength={6}
                required
              />
            </label>

            <button
              type="submit"
              disabled={submitting}
              className="cm-btn-primary cm-reveal cm-delay-3 flex w-full items-center justify-center gap-2 text-sm"
            >
              {submitting && <span className="cm-loader" />}
              {submitting ? 'Procesando...' : isRegisterMode ? 'Registrarme' : 'Entrar'}
            </button>

            <button
              type="button"
              onClick={() => navigate('/register')}
              disabled={submitting}
              className="cm-btn-secondary cm-reveal cm-delay-4 w-full text-sm"
            >
              Crear cuenta nueva
            </button>

            {feedback.message && (
              <p
                className={`cm-reveal rounded-2xl border px-4 py-3 text-sm ${
                  feedback.type === 'error'
                    ? 'border-red-600/40 bg-red-600/10 text-red-200'
                    : 'border-verdant-accent/50 bg-verdant-luxe/20 text-verdant-accent'
                }`}
              >
                {feedback.message}
              </p>
            )}
          </form>

          <Link to="/" className="cm-reveal cm-delay-4 mt-12 inline-block text-sm text-coastal-mist/75 transition-all duration-200 hover:text-coastal-neon">
            Volver a inicio
          </Link>
        </div>
      </main>
    </div>
  )
}

export default Login
