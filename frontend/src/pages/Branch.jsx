import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import brainLogo from '../assets/brain-logo.png'
import { useProgress } from '../context/ProgressContext'
import { academicApi } from '../services/academicApi'

function Branch() {
  const navigate = useNavigate()
  const { id } = useParams()
  const { completedLessons } = useProgress()

  const [branch, setBranch] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let isMounted = true

    const loadBranch = async () => {
      if (!id) {
        if (isMounted) {
          setError('Rama no valida.')
          setLoading(false)
        }
        return
      }

      try {
        setLoading(true)
        setError('')
        const payload = await academicApi.getBranch(id)
        if (!isMounted) return

        setBranch(payload?.branch || null)
      } catch (loadError) {
        if (!isMounted) return
        setError(loadError?.message || 'No se pudo cargar la rama academica.')
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    void loadBranch()

    return () => {
      isMounted = false
    }
  }, [id])

  const completedSet = useMemo(() => new Set(completedLessons), [completedLessons])

  if (loading) {
    return (
      <div className="cm-shell px-6 pt-20 pb-16">
        <div className="cm-card mx-auto max-w-5xl p-8 text-center">
          <p className="text-coastal-mist/75">Cargando rama academica...</p>
        </div>
      </div>
    )
  }

  if (error || !branch) {
    return (
      <div className="cm-shell px-6 pt-20 pb-16">
        <div className="cm-card mx-auto max-w-5xl space-y-6 p-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-coastal-mist">No se pudo abrir la rama</h1>
          <p className="text-coastal-mist/75">{error || 'Rama no encontrada.'}</p>
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
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
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

      <main className="mx-auto max-w-6xl px-6 pt-20 pb-16">
        <section className="mx-auto mb-10 max-w-2xl space-y-6 text-center">
          <img src={brainLogo} alt="Mathlingo brain logo" className="mx-auto w-full max-w-24 drop-shadow-2xl" />
          <h1 className="text-3xl font-semibold tracking-tight text-coastal-mist">{branch.name}</h1>
          <p className="text-coastal-mist/75">
            {branch.lessonCount} lecciones distribuidas en {branch.gradeCount} grados
          </p>
        </section>

        <section className="space-y-8">
          {(branch.modules || []).map((module) => (
            <article key={module.id} className="cm-card space-y-5 p-6">
              <header>
                <p className="text-xs font-semibold tracking-wide text-coastal-mist/55">
                  {module.gradeName} - {module.areaName}
                </p>
                <h2 className="mt-2 text-xl font-semibold tracking-tight text-coastal-mist">{module.lessonCount} lecciones</h2>
              </header>

              {(module.topics || []).map((topic) => (
                <div key={`${module.id}:${topic.id}`} className="rounded-2xl border border-coastal-steel/70 bg-coastal-ocean/50 p-4">
                  <h3 className="text-lg font-semibold tracking-tight">{topic.name}</h3>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {(topic.lessons || []).map((lesson) => {
                      const completed = completedSet.has(lesson.progressId)
                      return (
                        <button
                          key={`${module.id}:${topic.id}:${lesson.id}`}
                          type="button"
                          onClick={() => navigate(`/lesson/${lesson.routeId}`)}
                          className="rounded-xl border border-coastal-steel bg-coastal-steel/40 px-3 py-3 text-left transition-all duration-200 hover:bg-coastal-steel"
                        >
                          <p className="text-xs text-coastal-mist/65">
                            {lesson.type === 'exam' ? 'EXAMEN' : 'PRACTICA'} - Dificultad {lesson.difficulty}
                          </p>
                          <p className="mt-1 text-sm font-semibold">{lesson.title}</p>
                          <p className={`mt-1 text-xs ${completed ? 'text-emerald-300' : 'text-coastal-mist/65'}`}>
                            {completed ? 'Completada' : 'Disponible'}
                          </p>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </article>
          ))}
        </section>
      </main>
    </div>
  )
}

export default Branch
