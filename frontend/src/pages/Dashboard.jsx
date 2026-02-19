import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import brainLogo from '../assets/brain-logo.png'
import { useAuth } from '../context/AuthContext'
import { useProgress } from '../context/ProgressContext'
import { getCourses } from '../lib/courses'

function Dashboard() {
  const navigate = useNavigate()
  const { logout } = useAuth()
  const { completedLessons, xp, level, currentStreak } = useProgress()

  const [courses, setCourses] = useState([])
  const [loadingCourses, setLoadingCourses] = useState(true)
  const [coursesError, setCoursesError] = useState('')

  useEffect(() => {
    let isMounted = true

    const loadCourses = async () => {
      try {
        setLoadingCourses(true)
        setCoursesError('')
        const data = await getCourses()
        if (!isMounted) return
        setCourses(data)
      } catch (error) {
        if (!isMounted) return
        setCoursesError(error?.message || 'No se pudieron cargar los cursos.')
      } finally {
        if (isMounted) setLoadingCourses(false)
      }
    }

    loadCourses()

    return () => {
      isMounted = false
    }
  }, [])

  const totalLessons = useMemo(
    () => courses.reduce((acc, course) => acc + Number(course.lessonCount || 0), 0),
    [courses],
  )

  const progress = totalLessons > 0 ? Math.round((completedLessons.length / totalLessons) * 100) : 0
  const xpProgress = xp % 100
  const nextLevelXp = level * 100

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <header className="border-b border-zinc-800 bg-zinc-950/90 backdrop-blur">
        <nav className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <Link
            to="/"
            className="text-lg font-semibold tracking-wide text-indigo-400 transition-all duration-200 hover:opacity-90 sm:text-xl"
          >
            Mathlingo
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="text-sm font-semibold tracking-tight text-zinc-400 transition-all duration-200 hover:text-indigo-400"
          >
            Cerrar sesion
          </button>
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-6 pt-20 pb-16">
        <section className="mx-auto mb-12 max-w-2xl space-y-6 text-center">
          <img src={brainLogo} alt="Mathlingo brain logo" className="mx-auto w-full max-w-32 drop-shadow-2xl" />
          <h1 className="text-3xl font-semibold tracking-tight">Hola, Usuario</h1>
          <p className="text-zinc-500">Continua tu progreso en matematicas</p>
        </section>

        <section className="mt-12 grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="space-y-6 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6 shadow-lg shadow-black/30 backdrop-blur-sm">
            <p className="text-sm text-zinc-400">Progreso general</p>
            <div className="h-4 w-full rounded-full bg-zinc-800">
              <div
                className="h-4 rounded-full bg-indigo-700 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-sm text-zinc-400">
              {progress}% completado
              {totalLessons > 0 ? ` (${completedLessons.length}/${totalLessons} lecciones)` : ''}
            </p>
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6 shadow-lg shadow-black/30 backdrop-blur-sm">
              <p className="text-lg font-semibold tracking-tight">{currentStreak} dias seguidos</p>
            </div>

            <div className="space-y-6 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6 shadow-lg shadow-black/30 backdrop-blur-sm">
              <p className="text-lg font-semibold tracking-tight">Nivel {level}</p>
              <p className="text-sm text-zinc-400">XP: {xp} / {nextLevelXp}</p>
              <div className="h-3 w-full rounded-full bg-zinc-800">
                <div
                  className="h-3 rounded-full bg-indigo-700 transition-all duration-500"
                  style={{ width: `${xpProgress}%` }}
                />
              </div>
            </div>
          </div>
        </section>

        <section className="mt-12 space-y-6">
          {loadingCourses && (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6 text-sm text-zinc-400 shadow-lg shadow-black/30 backdrop-blur-sm">
              Cargando cursos...
            </div>
          )}

          {!loadingCourses && coursesError && (
            <div className="rounded-2xl border border-red-600/40 bg-red-600/10 p-6 text-sm text-red-200 shadow-lg shadow-black/30">
              {coursesError}
            </div>
          )}

          {!loadingCourses &&
            !coursesError &&
            courses.map((course) => (
              <article
                key={course.id}
                onClick={() => navigate(`/course/${course.id}`)}
                className="cursor-pointer rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6 shadow-lg shadow-black/30 backdrop-blur-sm transition-all duration-200 hover:bg-zinc-800"
              >
                <h2 className="text-2xl font-semibold tracking-tight">{course.title}</h2>
                <p className="mt-2 text-zinc-400">{course.description}</p>
                <p className="mt-4 text-sm font-semibold tracking-tight text-indigo-400">{course.lessonCount} lecciones</p>
              </article>
            ))}
        </section>
      </main>
    </div>
  )
}

export default Dashboard
