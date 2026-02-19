import { Link } from 'react-router-dom'

import CerebritoMascot from '../components/CerebritoMascot'

function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-black text-white">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-zinc-950/80 backdrop-blur">
        <nav className="max-w-6xl mx-auto flex items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link
            to="/"
            className="text-lg font-semibold tracking-tight transition-all duration-200 hover:opacity-90 sm:text-xl"
          >
            Mathlingo
          </Link>
          <Link
            to="/login"
            className="rounded-lg border border-white/20 px-4 py-2 text-sm font-medium transition-all duration-200 hover:border-blue-400 hover:text-blue-300"
          >
            Login
          </Link>
        </nav>
      </header>

      <main className="max-w-6xl mx-auto flex min-h-screen items-center justify-center px-4 pt-28 sm:px-6 lg:px-8">
        <section className="mx-auto py-24 text-center">
          <h1 className="mb-6 text-center text-4xl font-bold text-white md:text-6xl">
            Aprende matematicas de forma inteligente
          </h1>
          <p className="mx-auto mb-10 max-w-xl text-center text-lg text-zinc-400 md:text-xl">
            Ejercicios adaptativos. Progreso real. Sin estres.
          </p>

          <CerebritoMascot className="mx-auto w-full max-w-[320px] animate-float drop-shadow-[0_0_32px_rgba(96,165,250,0.22)]" />

          <Link
            to="/dashboard"
            className="mt-10 inline-block rounded-xl bg-blue-600 px-7 py-3 text-base font-semibold text-white shadow-lg shadow-blue-500/20 transition-all duration-200 hover:scale-105 hover:bg-blue-500 active:scale-95"
          >
            Comenzar ahora
          </Link>
        </section>
      </main>
    </div>
  )
}

export default Landing
