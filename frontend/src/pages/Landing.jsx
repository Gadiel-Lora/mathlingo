import { Link } from 'react-router-dom'

import CerebritoMascot from '../components/CerebritoMascot'

function Landing() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur">
        <nav className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <Link
            to="/"
            className="text-lg font-semibold tracking-tight transition-all duration-200 hover:opacity-90 sm:text-xl"
          >
            Mathlingo
          </Link>
          <Link
            to="/login"
            className="text-sm font-semibold tracking-tight text-zinc-400 transition-all duration-200 hover:text-blue-300"
          >
            Login
          </Link>
        </nav>
      </header>

      <main className="mx-auto flex min-h-screen max-w-5xl items-center justify-center px-6 pt-16">
        <section className="mx-auto space-y-6 py-16 text-center">
          <h1 className="text-center text-4xl font-semibold tracking-tight text-white md:text-6xl">
            Aprende matematicas de forma inteligente
          </h1>
          <p className="mx-auto max-w-xl text-center text-lg text-zinc-400 md:text-xl">
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
