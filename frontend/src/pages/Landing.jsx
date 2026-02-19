import { Link } from 'react-router-dom'

import CerebritoMascot from '../components/CerebritoMascot'

function Landing() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur">
        <nav className="max-w-6xl mx-auto flex items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link
            to="/"
            className="text-lg font-semibold tracking-tight transition-all duration-200 hover:opacity-90 sm:text-xl"
          >
            Mathlingo
          </Link>
          <Link
            to="/login"
            className="rounded-2xl border border-zinc-700 px-4 py-2 text-sm font-semibold tracking-tight text-zinc-200 transition-all duration-200 hover:border-blue-700 hover:text-blue-300"
          >
            Login
          </Link>
        </nav>
      </header>

      <main className="max-w-6xl mx-auto flex min-h-screen items-center justify-center px-4 pt-28 sm:px-6 lg:px-8">
        <section className="mx-auto py-24 text-center">
          <h1 className="mb-6 text-center text-4xl font-semibold tracking-tight text-white md:text-6xl">
            Aprende matematicas de forma inteligente
          </h1>
          <p className="mx-auto mb-10 max-w-xl text-center text-lg text-zinc-400 md:text-xl">
            Ejercicios adaptativos. Progreso real. Sin estres.
          </p>

          <CerebritoMascot className="mx-auto w-full max-w-[320px] drop-shadow-[0_0_28px_rgba(29,78,216,0.22)]" />

          <Link
            to="/dashboard"
            className="mt-10 inline-block rounded-2xl bg-blue-700 px-7 py-3 text-base font-semibold tracking-tight text-white transition-all duration-200 hover:translate-y-[-1px] hover:bg-blue-600"
          >
            Comenzar ahora
          </Link>
        </section>
      </main>
    </div>
  )
}

export default Landing
