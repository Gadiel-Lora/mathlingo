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
          message: 'Cuenta creada. Si no iniciaste sesion automaticamente, revisa tu correo y luego entra.',
        })
        setIsRegisterMode(false)
        setPassword('')
      } else {
        await login(email, password)
        navigate('/dashboard', { replace: true })
      }
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error?.message || 'No se pudo completar la autenticacion.',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 px-6 pt-20 pb-16 text-white">
      <div className="mx-auto max-w-md rounded-2xl border border-zinc-800 bg-zinc-900/70 p-8 shadow-lg shadow-black/30 backdrop-blur-sm">
        <div className="space-y-6">
          <h1 className="max-w-2xl text-3xl font-semibold tracking-tight text-white">
            {isRegisterMode ? 'Crear cuenta' : 'Login'}
          </h1>
          <p className="text-zinc-500">
            {isRegisterMode ? 'Crea tu cuenta para comenzar.' : 'Ingresa para continuar tu progreso.'}
          </p>
        </div>

        <form className="mt-12 space-y-6" onSubmit={handleSubmit}>
          <label className="block">
            <span className="mb-2 block text-sm text-zinc-300">Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white outline-none transition-all duration-200 focus:border-indigo-700 focus:ring-1 focus:ring-indigo-500/30"
              placeholder="tu@email.com"
              autoComplete="email"
              required
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm text-zinc-300">Contrasena</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white outline-none transition-all duration-200 focus:border-indigo-700 focus:ring-1 focus:ring-indigo-500/30"
              placeholder="********"
              autoComplete={isRegisterMode ? 'new-password' : 'current-password'}
              minLength={6}
              required
            />
          </label>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-2xl bg-indigo-700 px-6 py-3 text-sm font-semibold tracking-tight transition-all duration-200 hover:translate-y-[-1px] hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-60"
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
            className="w-full rounded-2xl border border-zinc-700 px-6 py-3 text-sm font-semibold tracking-tight text-zinc-300 transition-all duration-200 hover:border-indigo-500/50 hover:text-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isRegisterMode ? 'Ya tengo cuenta' : 'Crear cuenta'}
          </button>

          {feedback.message && (
            <p
              className={`rounded-2xl border px-4 py-3 text-sm ${
                feedback.type === 'error'
                  ? 'border-red-600/40 bg-red-600/10 text-red-200'
                  : 'border-emerald-600/40 bg-emerald-600/10 text-emerald-200'
              }`}
            >
              {feedback.message}
            </p>
          )}
        </form>

        <Link to="/" className="mt-12 inline-block text-sm text-zinc-400 transition-all duration-200 hover:text-indigo-400">
          Volver a inicio
        </Link>
      </div>
    </div>
  )
}

export default Login
