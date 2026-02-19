import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import brainLogo from '../assets/brain-logo.png'
import { useProgress } from '../context/ProgressContext'
import { getCourses, getLessonsByCourseId } from '../lib/courses'

function Course() {
  const navigate = useNavigate()
  const { id } = useParams()
  const courseId = Number(id)
  const { completedLessons } = useProgress()

  const [course, setCourse] = useState(null)
  const [lessons, setLessons] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let isMounted = true

    const loadCourseData = async () => {
      if (!Number.isInteger(courseId) || courseId <= 0) {
        if (isMounted) {
          setError('Curso no valido.')
          setLoading(false)
        }
        return
      }

      try {
        setLoading(true)
        setError('')

        const [courses, lessonsData] = await Promise.all([getCourses(), getLessonsByCourseId(courseId)])

        if (!isMounted) return

        const selectedCourse = courses.find((item) => item.id === courseId) || null
        setCourse(selectedCourse)
        setLessons(lessonsData)
      } catch (loadError) {
        if (!isMounted) return
        setError(loadError?.message || 'No se pudo cargar el curso.')
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    loadCourseData()

    return () => {
      isMounted = false
    }
  }, [courseId])

  const lessonCards = useMemo(() => {
    return lessons.map((lesson, index) => {
      const previousLessonId = lessons[index - 1]?.id
      const locked = index !== 0 && !completedLessons.includes(previousLessonId)

      return {
        ...lesson,
        locked,
        completed: completedLessons.includes(lesson.id),
      }
    })
  }, [lessons, completedLessons])

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 px-6 pt-20 pb-16 text-white">
        <div className="mx-auto max-w-5xl rounded-2xl border border-zinc-800 bg-zinc-900/70 p-8 text-center shadow-lg shadow-black/30 backdrop-blur-sm">
          <p className="text-zinc-400">Cargando curso...</p>
        </div>
      </div>
    )
  }

  if (error || !course) {
    return (
      <div className="min-h-screen bg-zinc-950 px-6 pt-20 pb-16 text-white">
        <div className="mx-auto max-w-5xl space-y-6 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-8 text-center shadow-lg shadow-black/30 backdrop-blur-sm">
          <h1 className="text-2xl font-semibold tracking-tight text-white">No se pudo abrir el curso</h1>
          <p className="text-zinc-400">{error || 'Curso no encontrado.'}</p>
          <Link
            to="/dashboard"
            className="inline-block rounded-2xl bg-indigo-700 px-6 py-3 font-semibold tracking-tight text-white transition-all duration-200 hover:translate-y-[-1px] hover:bg-indigo-600"
          >
            Volver al dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <header className="border-b border-zinc-800 bg-zinc-950/90 backdrop-blur">
        <nav className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <Link
            to="/dashboard"
            className="text-lg font-semibold tracking-wide text-indigo-400 transition-all duration-200 hover:opacity-90 sm:text-xl"
          >
            Mathlingo
          </Link>
          <Link to="/dashboard" className="text-sm font-semibold tracking-tight text-zinc-400 transition-all duration-200 hover:text-indigo-400">
            Dashboard
          </Link>
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-6 pt-20 pb-16">
        <section className="mx-auto mb-12 max-w-2xl space-y-6 text-center">
          <img src={brainLogo} alt="Mathlingo brain logo" className="mx-auto w-full max-w-24 drop-shadow-2xl" />
          <h1 className="text-3xl font-semibold tracking-tight text-white">{course.title}</h1>
          <p className="text-zinc-400">{course.description}</p>
        </section>

        <section className="mt-12 space-y-6">
          {lessonCards.map((lesson, index) => (
            <article
              key={lesson.id}
              onClick={() => {
                if (lesson.locked) return
                navigate(`/lesson/${lesson.id}`)
              }}
              className={`rounded-2xl border border-zinc-800 p-6 shadow-lg shadow-black/30 backdrop-blur-sm ${
                lesson.locked
                  ? 'cursor-not-allowed bg-zinc-900/70 opacity-50'
                  : 'cursor-pointer bg-zinc-900/70 transition-all duration-200 hover:bg-zinc-800'
              }`}
            >
              <p className="text-xs font-semibold tracking-wide text-zinc-500">LECCION {index + 1}</p>
              <h2 className="mt-2 text-xl font-semibold tracking-tight">{lesson.title}</h2>
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

export default Course
