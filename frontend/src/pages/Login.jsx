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
          message: 'Revisa tu correo para confirmar tu cuenta.',
        })
        setIsRegisterMode(false)
        setPassword('')
      } else {
        await login(email, password)
        navigate('/dashboard', { replace: true })
      }
    } catch (error) {
      const rawErrorMessage = error?.message || ''
      const loginNeedsEmailConfirmation =
        !isRegisterMode && rawErrorMessage.toLowerCase().includes('email not confirmed')

      setFeedback({
        type: 'error',
        message: loginNeedsEmailConfirmation
          ? 'Debes confirmar tu correo antes de iniciar sesion.'
          : rawErrorMessage || 'No se pudo completar la autenticacion.',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="cm-shell px-6 pt-20 pb-16">
      <div className="cm-card mx-auto max-w-md p-8">
        <div className="space-y-6">
          <h1 className="max-w-2xl text-3xl font-semibold tracking-tight text-coastal-mist">
            {isRegisterMode ? 'Crear cuenta' : 'Login'}
          </h1>
          <p className="text-coastal-mist/55">
            {isRegisterMode ? 'Crea tu cuenta para comenzar.' : 'Ingresa para continuar tu progreso.'}
          </p>
        </div>

        <form className="mt-12 space-y-6" onSubmit={handleSubmit}>
          <label className="block">
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

          <label className="block">
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
            className="cm-btn-primary w-full text-sm"
          >
            {submitting ? 'Procesando...' : isRegisterMode ? 'Registrarme' : 'Entrar'}
          </button>

          <button
            type="button"
            onClick={() => {
              setIsRegisterMode((prev) => !prev)
              setFeedback({ type: '', message: '' })
            }}
            disabled={submitting}
            className="cm-btn-secondary w-full text-sm"
          >
            {isRegisterMode ? 'Ya tengo cuenta' : 'Crear cuenta'}
          </button>

          {feedback.message && (
            <p
              className={`rounded-2xl border px-4 py-3 text-sm ${
                feedback.type === 'error'
                  ? 'border-red-600/40 bg-red-600/10 text-red-200'
                  : 'border-verdant-accent/50 bg-verdant-luxe/20 text-verdant-accent'
              }`}
            >
              {feedback.message}
            </p>
          )}
        </form>

        <Link to="/" className="mt-12 inline-block text-sm text-coastal-mist/75 transition-all duration-200 hover:text-coastal-neon">
          Volver a inicio
        </Link>
      </div>
    </div>
  )
}

export default Login

