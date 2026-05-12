import { Link } from 'react-router-dom'

function Landing() {
  return (
    <div className="cm-shell">
      <header className="cm-navbar fixed inset-x-0 top-0 z-50">
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link to="/" className="math-brand-lockup" aria-label="MathLingo inicio">
            <span className="math-brand-mark">x2</span>
            <span className="text-lg sm:text-xl">MathLingo</span>
          </Link>
          <Link to="/login" className="math-nav-pill">
            Ingresar
          </Link>
        </nav>
      </header>

      <main className="cm-page relative overflow-hidden px-6 pt-24">
        <div className="math-hero-scene" aria-hidden="true">
          <div className="math-equation-strip">
            <span>f(x) = 2x + 5</span>
            <span>a^2 + b^2 = c^2</span>
            <span>y = mx + b</span>
            <span>P(A) = n(A)/n(S)</span>
          </div>
          <div className="math-proof-board">
            <div className="math-proof-row">
              <span>1. 2x + 5 = 13</span>
              <span>x = 4</span>
            </div>
            <div className="math-proof-row">
              <span>2. A = (b * h) / 2</span>
              <span>A = 20</span>
            </div>
            <div className="math-proof-row">
              <span>3. f'(x) = 3x^2 - 4</span>
              <span>pendiente</span>
            </div>
          </div>
        </div>

        <section className="relative z-10 mx-auto flex min-h-[78dvh] max-w-5xl flex-col items-center justify-center pb-12 text-center">
          <p className="cm-reveal cm-delay-1">
            <span className="cm-badge cm-badge-live">Ruta adaptativa de matematicas</span>
          </p>

          <h1 className="cm-reveal cm-delay-2 mx-auto mt-6 max-w-4xl text-4xl font-black leading-[1.04] text-coastal-mist md:text-6xl">
            Domina matematicas con practica guiada y progreso medible
          </h1>
          <p className="cm-reveal cm-delay-3 mx-auto mt-5 max-w-2xl text-base font-medium text-slate-600 md:text-xl">
            Un entorno claro para resolver, medir dominio y avanzar desde aritmetica hasta algebra, geometria y calculo.
          </p>

          <div className="cm-reveal cm-delay-4 mt-9 flex flex-wrap items-center justify-center gap-3">
            <Link to="/dashboard" className="cm-btn-primary px-7 text-base">
              Abrir panel
            </Link>
            <Link to="/login" className="cm-btn-secondary px-7 text-base">
              Continuar cuenta
            </Link>
          </div>
        </section>

        <section className="relative z-10 mx-auto grid max-w-5xl grid-cols-1 gap-4 pb-16 md:grid-cols-3">
          {[
            ['Algebra', '2x + 5 = 13', 'Ecuaciones, funciones y factorizacion.'],
            ['Geometria', 'A = (b*h)/2', 'Areas, angulos y demostraciones visuales.'],
            ['Analisis', 'f(x) = x^2', 'Patrones, graficas y lectura de cambios.'],
          ].map(([title, formula, copy]) => (
            <article key={title} className="math-feature-card">
              <span className="math-formula-token">{formula}</span>
              <h2 className="mt-4 text-lg font-black text-slate-900">{title}</h2>
              <p className="mt-2 text-sm font-medium text-slate-600">{copy}</p>
            </article>
          ))}
        </section>
      </main>
    </div>
  )
}

export default Landing
