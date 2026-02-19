import { Link } from 'react-router-dom'

function Dashboard() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-black px-4 py-16 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <Link
            to="/"
            className="rounded-lg border border-white/20 px-4 py-2 text-sm font-medium transition-all duration-200 hover:border-blue-400 hover:text-blue-300"
          >
            Volver
          </Link>
        </header>

        <section className="rounded-2xl border border-white/10 bg-zinc-900/70 p-6">
          <p className="text-zinc-300">Tu progreso y recomendaciones apareceran aqui.</p>
          <Link
            to="/lesson/1"
            className="mt-5 inline-block rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold transition-all duration-200 hover:bg-blue-500"
          >
            Ir a leccion de ejemplo
          </Link>
        </section>
      </div>
    </div>
  )
}

export default Dashboard
