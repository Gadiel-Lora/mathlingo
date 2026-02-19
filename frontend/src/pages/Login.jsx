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
    <div className="min-h-screen bg-zinc-950 px-6 pt-20 pb-16 text-white">
      <div className="mx-auto max-w-md rounded-2xl border border-zinc-800 bg-zinc-900/70 p-8 shadow-lg shadow-black/30 backdrop-blur-sm">
        <div className="space-y-6">
          <h1 className="max-w-2xl text-3xl font-semibold tracking-tight text-white">Login</h1>
          <p className="text-zinc-500">Ingresa para continuar tu progreso.</p>
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
              required
            />
          </label>

          <button
            type="submit"
            className="w-full rounded-2xl bg-indigo-700 px-6 py-3 text-sm font-semibold tracking-tight transition-all duration-200 hover:translate-y-[-1px] hover:bg-indigo-600"
          >
            Entrar
          </button>
        </form>

        <Link to="/" className="mt-12 inline-block text-sm text-zinc-400 transition-all duration-200 hover:text-indigo-400">
          Volver a inicio
        </Link>
      </div>
    </div>
  )
}

export default Login
