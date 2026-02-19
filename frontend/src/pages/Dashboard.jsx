import { Link, useNavigate } from 'react-router-dom'

import brainLogo from '../assets/brain-logo.png'
import { useProgress } from '../context/ProgressContext'
import { lessons } from '../data/lessons'

function Dashboard() {
  const navigate = useNavigate()
  const { completedLessons, xp, level } = useProgress()

  const totalLessons = lessons.length
  const progress = Math.round((completedLessons.length / totalLessons) * 100)
  const xpProgress = xp % 100
  const nextLevelXp = level * 100

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
      <header className="border-b border-zinc-800 bg-zinc-950/90 backdrop-blur">
        <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
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

      <main className="mx-auto max-w-5xl px-6 py-12">
        <section className="text-center">
          <img src={brainLogo} alt="Mathlingo brain logo" className="mx-auto w-full max-w-32 drop-shadow-2xl" />
          <h1 className="mt-6 text-3xl font-semibold tracking-tight">Hola, Usuario 👋</h1>
          <p className="mt-2 text-zinc-400">Continua tu progreso en matematicas</p>
        </section>

        <section className="mt-10 grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-lg shadow-black/30">
            <p className="mb-3 text-sm text-zinc-400">Progreso general</p>
            <div className="h-4 w-full rounded-full bg-zinc-800">
              <div
                className="h-4 rounded-full bg-blue-700 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-2 text-sm text-zinc-400">{progress}% completado</p>
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-lg shadow-black/30">
              <p className="text-lg font-semibold">🔥 5 dias seguidos</p>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-lg shadow-black/30">
              <p className="text-lg font-semibold tracking-tight">Nivel {level}</p>
              <p className="mt-1 text-sm text-zinc-400">XP: {xp} / {nextLevelXp}</p>
              <div className="mt-4 h-3 w-full rounded-full bg-zinc-800">
                <div
                  className="h-3 rounded-full bg-blue-700 transition-all duration-500"
                  style={{ width: `${xpProgress}%` }}
                />
              </div>
            </div>
          </div>
        </section>

        <section className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
          {lessonCards.map((lesson) => (
            <article
              key={lesson.id}
              onClick={() => handleLessonClick(lesson)}
              className={`rounded-2xl p-6 ${
                lesson.locked
                  ? 'cursor-not-allowed border border-zinc-800 bg-zinc-900 opacity-50 shadow-lg shadow-black/30'
                  : 'cursor-pointer border border-zinc-800 bg-zinc-900 shadow-lg shadow-black/30 transition-all duration-200 hover:bg-zinc-800'
              }`}
            >
              <h2 className="text-xl font-semibold tracking-tight">{lesson.title}</h2>
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
