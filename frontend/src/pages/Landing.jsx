import { Link } from 'react-router-dom'

import CerebritoMascot from '../components/CerebritoMascot'

function Landing() {
  return (
    <div className="cm-shell">
      <header className="cm-navbar fixed inset-x-0 top-0 z-50">
        <nav className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <Link
            to="/"
            className="text-lg font-semibold tracking-wide text-coastal-neon transition-all duration-200 hover:opacity-90 sm:text-xl"
          >
            Mathlingo
          </Link>
          <Link
            to="/login"
            className="text-sm font-semibold tracking-tight text-coastal-mist/75 transition-all duration-200 hover:text-coastal-neon"
          >
            Login
          </Link>
        </nav>
      </header>

      <main className="mx-auto flex min-h-screen max-w-5xl items-center justify-center px-6 pt-20 pb-16">
        <section className="mx-auto max-w-2xl space-y-6 text-center">
          <h1 className="mx-auto max-w-2xl text-center text-4xl font-semibold tracking-tight text-coastal-mist md:text-6xl">
            Aprende matematicas de forma inteligente
          </h1>
          <p className="mx-auto max-w-xl text-center text-lg text-coastal-mist/75 md:text-xl">
            Ejercicios adaptativos. Progreso real. Sin estres.
          </p>

          <CerebritoMascot className="mx-auto w-full max-w-[320px] drop-shadow-[0_0_28px_rgba(61,169,252,0.22)]" />

          <Link to="/dashboard" className="cm-btn-primary mt-10 px-7 text-base">
            Comenzar ahora
          </Link>
        </section>
      </main>
    </div>
  )
}

export default Landing

