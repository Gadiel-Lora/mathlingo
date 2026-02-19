import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'

import { useAuth } from '../context/AuthContext'

function Login() {
  const navigate = useNavigate()
  const { user, loading, login } = useAuth()
  const [email, setEmail] = useState('')

  if (!loading && user) {
    return <Navigate to="/dashboard" replace />
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    const loggedUser = login(email)
    if (!loggedUser) return
    navigate('/dashboard', { replace: true })
  }

  return (
    <div className="min-h-screen bg-zinc-950 px-6 py-16 text-white">
      <div className="mx-auto max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-8 shadow-lg shadow-black/30">
        <div className="space-y-6">
          <h1 className="text-3xl font-semibold tracking-tight">Login</h1>
          <p className="text-zinc-500">Ingresa para continuar tu progreso.</p>
        </div>

        <form className="mt-12 space-y-6" onSubmit={handleSubmit}>
          <label className="block">
            <span className="mb-2 block text-sm text-zinc-300">Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white outline-none transition-all duration-200 focus:border-blue-700 focus:ring-1 focus:ring-blue-700/40"
              placeholder="tu@email.com"
              required
            />
          </label>

          <button
            type="submit"
            className="w-full rounded-2xl bg-blue-700 px-6 py-3 text-sm font-semibold tracking-tight transition-all duration-200 hover:translate-y-[-1px] hover:bg-blue-600"
          >
            Entrar
          </button>
        </form>

        <Link to="/" className="mt-12 inline-block text-sm text-zinc-400 transition-all duration-200 hover:text-blue-300">
          Volver a inicio
        </Link>
      </div>
    </div>
  )
}

export default Login
