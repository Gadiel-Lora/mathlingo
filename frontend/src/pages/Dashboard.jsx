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
    <div className="cm-shell">
      <header className="cm-navbar">
        <nav className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <Link
            to="/"
            className="text-lg font-semibold tracking-wide text-coastal-neon transition-all duration-200 hover:opacity-90 sm:text-xl"
          >
            Mathlingo
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="cm-btn-secondary bg-transparent px-4 py-2 text-sm"
          >
            Cerrar sesion
          </button>
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-6 pt-20 pb-16">
        <section className="mx-auto mb-12 max-w-2xl space-y-6 text-center">
          <img src={brainLogo} alt="Mathlingo brain logo" className="mx-auto w-full max-w-32 drop-shadow-2xl" />
          <h1 className="text-3xl font-semibold tracking-tight">Hola, Usuario</h1>
          <p className="text-coastal-mist/55">Continua tu progreso en matematicas</p>
        </section>

        <section className="mt-12 grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="cm-card space-y-6 p-6">
            <p className="text-sm text-coastal-mist/75">Progreso general</p>
            <div className="h-4 w-full rounded-full bg-coastal-steel">
              <div
                className="h-4 rounded-full bg-coastal-wave transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-sm text-coastal-mist/75">
              {progress}% completado
              {totalLessons > 0 ? ` (${completedLessons.length}/${totalLessons} lecciones)` : ''}
            </p>
          </div>

          <div className="space-y-6">
            <div className="cm-card p-6">
              <p className="text-lg font-semibold tracking-tight">{currentStreak} dias seguidos</p>
            </div>

            <div className="cm-card space-y-6 p-6">
              <p className="text-lg font-semibold tracking-tight">Nivel {level}</p>
              <p className="text-sm text-coastal-mist/75">XP: {xp} / {nextLevelXp}</p>
              <div className="h-3 w-full rounded-full bg-coastal-steel">
                <div
                  className="h-3 rounded-full bg-coastal-wave transition-all duration-500"
                  style={{ width: `${xpProgress}%` }}
                />
              </div>
            </div>
          </div>
        </section>

        <section className="mt-12 space-y-6">
          {loadingCourses && (
            <div className="cm-card p-6 text-sm text-coastal-mist/75">
              Cargando cursos...
            </div>
          )}

          {!loadingCourses && coursesError && (
            <div className="rounded-2xl border border-red-600/40 bg-red-600/10 p-6 text-sm text-red-200 shadow-coastal">
              {coursesError}
            </div>
          )}

          {!loadingCourses &&
            !coursesError &&
            courses.map((course) => (
              <article
                key={course.id}
                onClick={() => navigate(`/course/${course.id}`)}
                className="cm-card cursor-pointer p-6 transition-all duration-200 hover:-translate-y-0.5 hover:bg-coastal-steel/80"
              >
                <h2 className="text-2xl font-semibold tracking-tight">{course.title}</h2>
                <p className="mt-2 text-coastal-mist/75">{course.description}</p>
                <p className="mt-4 text-sm font-semibold tracking-tight text-verdant-accent">{course.lessonCount} lecciones</p>
              </article>
            ))}
        </section>
      </main>
    </div>
  )
}

export default Dashboard

