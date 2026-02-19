import { Link, useParams } from 'react-router-dom'

function Lesson() {
  const { id } = useParams()

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-black px-4 py-16 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Leccion {id}</h1>
          <Link
            to="/dashboard"
            className="rounded-lg border border-white/20 px-4 py-2 text-sm font-medium transition-all duration-200 hover:border-blue-400 hover:text-blue-300"
          >
            Dashboard
          </Link>
        </header>

        <section className="rounded-2xl border border-white/10 bg-zinc-900/70 p-6">
          <p className="text-zinc-300">Pantalla base de ejercicio.</p>
        </section>
      </div>
    </div>
  )
}

export default Lesson
