import { Link, useNavigate } from 'react-router-dom'

import brainLogo from '../assets/brain-logo.png'
import { useProgress } from '../context/ProgressContext'
import { lessons } from '../data/lessons'

function Dashboard() {
  const navigate = useNavigate()
  const { completedLessons } = useProgress()

  const totalLessons = lessons.length
  const progress = Math.round((completedLessons.length / totalLessons) * 100)

  const lessonCards = lessons.map((lesson, index) => {
    const previousLessonId = lessons[index - 1]?.id
    const locked = index !== 0 && !completedLessons.includes(previousLessonId)

    return {
      ...lesson,
      locked,
      completed: completedLessons.includes(lesson.id),
    }
  })

  const handleLessonClick = (lesson) => {
    if (lesson.locked) return
    navigate(`/lesson/${lesson.id}`)
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <header className="border-b border-white/10 bg-zinc-950/80 backdrop-blur">
        <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
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

      <main className="mx-auto max-w-5xl px-6 py-12">
        <section className="text-center">
          <img src={brainLogo} alt="Mathlingo brain logo" className="mx-auto w-full max-w-32 drop-shadow-2xl" />
          <h1 className="mt-6 text-3xl font-bold tracking-tight">Hola, Usuario 👋</h1>
          <p className="mt-2 text-zinc-400">Continua tu progreso en matematicas</p>
        </section>

        <section className="mt-10 grid gap-6 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <p className="mb-3 text-sm text-zinc-400">Progreso general</p>
            <div className="h-4 w-full rounded-full bg-zinc-800">
              <div
                className="h-4 rounded-full bg-blue-600 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-2 text-sm text-zinc-500">{progress}% completado</p>
          </div>

          <div className="rounded-2xl bg-zinc-900 p-6 shadow-lg">
            <p className="text-lg font-semibold">🔥 5 dias seguidos</p>
          </div>
        </section>

        <section className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
          {lessonCards.map((lesson) => (
            <article
              key={lesson.id}
              onClick={() => handleLessonClick(lesson)}
              className={`rounded-2xl p-6 ${
                lesson.locked
                  ? 'cursor-not-allowed bg-zinc-900 opacity-50'
                  : 'cursor-pointer bg-zinc-900 transition-all duration-200 hover:bg-zinc-800'
              }`}
            >
              <h2 className="text-xl font-semibold">{lesson.title}</h2>
              <p className="mt-2 text-sm text-zinc-400">
                {lesson.locked ? 'Bloqueada' : lesson.completed ? 'Completada' : 'Lista para continuar'}
              </p>
            </article>
          ))}
        </section>
      </main>
    </div>
  )
}

export default Dashboard
