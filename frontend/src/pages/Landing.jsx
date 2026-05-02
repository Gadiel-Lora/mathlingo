import { Link } from 'react-router-dom'

import CerebritoMascot from '../components/CerebritoMascot'

function Landing() {
  return (
    <div className="cm-shell">
      <div className="cm-orb cm-orb-cyan left-[-6rem] top-[8rem] h-56 w-56" />
      <div className="cm-orb cm-orb-coral right-[-4rem] top-[14rem] h-44 w-44" />

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

      <main className="cm-page mx-auto flex min-h-dvh max-w-5xl items-start justify-center px-6 pt-24 pb-16 md:items-center">
        <section className="mx-auto max-w-2xl space-y-6 text-center">
          <p className="cm-reveal cm-delay-1">
            <span className="cm-badge cm-badge-live">Aprendizaje adaptativo activo</span>
          </p>

          <h1 className="cm-reveal cm-delay-2 mx-auto max-w-2xl text-center text-4xl font-semibold tracking-tight text-coastal-mist md:text-6xl">
            Aprende matematicas de forma inteligente
          </h1>
          <p className="cm-reveal cm-delay-3 mx-auto max-w-xl text-center text-lg text-coastal-mist/75 md:text-xl">
            Ejercicios adaptativos. Progreso real. Sin estres.
          </p>

          <CerebritoMascot className="cm-float cm-reveal cm-delay-3 mx-auto w-full max-w-[320px] drop-shadow-[0_0_28px_rgba(61,169,252,0.22)]" />

          <div className="cm-reveal cm-delay-4 mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link to="/dashboard" className="cm-btn-primary px-7 text-base">
              Comenzar ahora
            </Link>
            <Link to="/login" className="cm-btn-secondary px-7 text-base">
              Ya tengo cuenta
            </Link>
          </div>
        </section>
      </main>
    </div>
  )
}

export default Landing
