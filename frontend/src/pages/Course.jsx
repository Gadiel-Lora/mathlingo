import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import brainLogo from '../assets/brain-logo.png'
import { useAuth } from '../context/AuthContext'
import { getCourses, getLessonsByCourseId } from '../lib/courses'
import { supabase } from '../supabase/client'

function Course() {
  const navigate = useNavigate()
  const { id } = useParams()
  const { user } = useAuth()

  const [course, setCourse] = useState(null)
  const [lessons, setLessons] = useState([])
  const [lessonStatusMap, setLessonStatusMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let isMounted = true

    const loadCourseData = async () => {
      if (!id) {
        if (isMounted) {
          setError('Curso no valido.')
          setLoading(false)
        }
        return
      }

      try {
        setLoading(true)
        setError('')

        const [courses, lessonsData] = await Promise.all([getCourses(), getLessonsByCourseId(id)])

        const initializeProgress = async (courseLessons) => {
          if (!user?.id || courseLessons.length === 0) return

          const lessonIds = courseLessons.map((lesson) => lesson.id)

          const { data: existingRows, error: existingError } = await supabase
            .from('user_lesson_progress')
            .select('lesson_id')
            .eq('user_id', user.id)
            .in('lesson_id', lessonIds)

          if (existingError) throw existingError

          if ((existingRows || []).length > 0) return

          const payload = courseLessons.map((lesson, index) => ({
            user_id: user.id,
            lesson_id: lesson.id,
            status: index === 0 ? 'in_progress' : 'locked',
          }))

          const { error: insertError } = await supabase.from('user_lesson_progress').insert(payload)
          if (insertError) throw insertError
        }

        await initializeProgress(lessonsData)

        let statusMap = {}
        if (user?.id && lessonsData.length > 0) {
          const lessonIds = lessonsData.map((lesson) => lesson.id)
          const { data: progressRows, error: progressError } = await supabase
            .from('user_lesson_progress')
            .select('lesson_id, status')
            .eq('user_id', user.id)
            .in('lesson_id', lessonIds)

          if (progressError) throw progressError

          statusMap = (progressRows || []).reduce((acc, row) => {
            acc[row.lesson_id] = row.status
            return acc
          }, {})
        }

        if (!isMounted) return

        const selectedCourse = courses.find((item) => item.id === id) || null
        setCourse(selectedCourse)
        setLessons(lessonsData)
        setLessonStatusMap(statusMap)
      } catch (loadError) {
        if (!isMounted) return
        setError(loadError?.message || 'No se pudo cargar el curso.')
        setLessonStatusMap({})
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    loadCourseData()

    return () => {
      isMounted = false
    }
  }, [id, user?.id])

  const lessonCards = useMemo(() => {
    return lessons.map((lesson) => {
      const status = lessonStatusMap[lesson.id] || 'locked'
      const locked = status === 'locked'

      return {
        ...lesson,
        locked,
        completed: status === 'completed',
      }
    })
  }, [lessons, lessonStatusMap])

  if (loading) {
    return (
      <div className="cm-shell px-6 pt-20 pb-16">
        <div className="cm-card mx-auto max-w-5xl p-8 text-center">
          <p className="text-coastal-mist/75">Cargando curso...</p>
        </div>
      </div>
    )
  }

  if (error || !course) {
    return (
      <div className="cm-shell px-6 pt-20 pb-16">
        <div className="cm-card mx-auto max-w-5xl space-y-6 p-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-coastal-mist">No se pudo abrir el curso</h1>
          <p className="text-coastal-mist/75">{error || 'Curso no encontrado.'}</p>
          <Link to="/dashboard" className="cm-btn-primary">
            Volver al dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="cm-shell">
      <header className="cm-navbar">
        <nav className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <Link
            to="/dashboard"
            className="text-lg font-semibold tracking-wide text-coastal-neon transition-all duration-200 hover:opacity-90 sm:text-xl"
          >
            Mathlingo
          </Link>
          <Link to="/dashboard" className="cm-btn-secondary bg-transparent px-4 py-2 text-sm">
            Dashboard
          </Link>
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-6 pt-20 pb-16">
        <section className="mx-auto mb-12 max-w-2xl space-y-6 text-center">
          <img src={brainLogo} alt="Mathlingo brain logo" className="mx-auto w-full max-w-24 drop-shadow-2xl" />
          <h1 className="text-3xl font-semibold tracking-tight text-coastal-mist">{course.title}</h1>
          <p className="text-coastal-mist/75">{course.description}</p>
        </section>

        <section className="mt-12 space-y-6">
          {lessonCards.map((lesson, index) => (
            <article
              key={lesson.id}
              onClick={() => {
                if (lesson.locked) return
                navigate(`/lesson/${lesson.id}`)
              }}
              className={`cm-card p-6 ${
                lesson.locked
                  ? 'cursor-not-allowed bg-coastal-ocean/70 opacity-50'
                  : 'cursor-pointer bg-coastal-ocean/70 transition-all duration-200 hover:-translate-y-0.5 hover:bg-coastal-steel/80'
              }`}
            >
              <p className="text-xs font-semibold tracking-wide text-coastal-mist/55">LECCION {index + 1}</p>
              <h2 className="mt-2 text-xl font-semibold tracking-tight">{lesson.title}</h2>
              <p className="mt-2 text-sm text-coastal-mist/75">
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

