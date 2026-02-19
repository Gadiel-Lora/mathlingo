import { Link } from 'react-router-dom'

import CerebritoMascot from '../components/CerebritoMascot'

function Landing() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur">
        <nav className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <Link
            to="/"
            className="text-lg font-semibold tracking-wide text-indigo-400 transition-all duration-200 hover:opacity-90 sm:text-xl"
          >
            Mathlingo
          </Link>
          <Link
            to="/login"
            className="text-sm font-semibold tracking-tight text-zinc-400 transition-all duration-200 hover:text-indigo-400"
          >
            Login
          </Link>
        </nav>
      </header>

      <main className="mx-auto flex min-h-screen max-w-5xl items-center justify-center px-6 pt-20 pb-16">
        <section className="mx-auto max-w-2xl space-y-6 text-center">
          <h1 className="mx-auto max-w-2xl text-center text-4xl font-semibold tracking-tight text-white md:text-6xl">
            Aprende matematicas de forma inteligente
          </h1>
          <p className="mx-auto max-w-xl text-center text-lg text-zinc-400 md:text-xl">
            Ejercicios adaptativos. Progreso real. Sin estres.
          </p>

          <CerebritoMascot className="mx-auto w-full max-w-[320px] drop-shadow-[0_0_28px_rgba(99,102,241,0.24)]" />

          <Link
            to="/dashboard"
            className="mt-10 inline-block rounded-2xl bg-indigo-700 px-7 py-3 text-base font-semibold tracking-tight text-white transition-all duration-200 hover:translate-y-[-1px] hover:bg-indigo-600"
          >
            Comenzar ahora
          </Link>
        </section>
      </main>
    </div>
  )
}

export default Landing
