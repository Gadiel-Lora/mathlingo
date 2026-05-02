import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import brainLogo from '../assets/brain-logo.png'
import { useAuth } from '../context/AuthContext'
import { useProgress } from '../context/ProgressContext'
import { getUnlockedGradeIds, isLessonUnlockedInGrade } from '../lib/academicCurriculum'
import { academicApi } from '../services/academicApi'

function Branch() {
  const navigate = useNavigate()
  const { id } = useParams()
  const { profile } = useAuth()
  const { completedLessons, loadingProgress } = useProgress()

  const [branch, setBranch] = useState(null)
  const [grades, setGrades] = useState([])
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

        const [branchPayload, curriculumPayload] = await Promise.all([
          academicApi.getBranch(id),
          academicApi.getCurriculum(),
        ])
        if (!isMounted) return

        const allGrades = (curriculumPayload?.grades || []).slice().sort((left, right) => {
          return Number(left?.gradeNumber || 0) - Number(right?.gradeNumber || 0)
        })

        setGrades(allGrades)
        setBranch(branchPayload?.branch || null)
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

  const unlockedGradeIds = useMemo(() => {
    const unlocked = new Set(
      getUnlockedGradeIds({
        grades,
        completedLessons,
      }),
    )
    if (profile?.grade?.id) unlocked.add(String(profile.grade.id))
    return unlocked
  }, [completedLessons, grades, profile?.grade?.id])

  const gradeById = useMemo(() => {
    return new Map((grades || []).map((grade) => [String(grade.id), grade]))
  }, [grades])

  if (loading || loadingProgress) {
    return (
      <div className="cm-shell px-6 pt-20 pb-16">
        <div className="mx-auto max-w-6xl space-y-4">
          <div className="cm-card p-8">
            <div className="cm-skeleton h-6 w-1/4" />
            <div className="cm-skeleton mt-4 h-4 w-1/2" />
          </div>
          <div className="cm-card p-6">
            <div className="cm-skeleton h-5 w-1/3" />
            <div className="cm-skeleton mt-4 h-4 w-2/3" />
          </div>
        </div>
      </div>
    )
  }

  if (error || !branch) {
    return (
      <div className="cm-shell px-6 pt-20 pb-16">
        <div className="cm-card cm-page mx-auto max-w-5xl space-y-6 p-8 text-center">
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
      <div className="cm-orb cm-orb-cyan left-[-7rem] top-[8rem] h-64 w-64" />
      <div className="cm-orb cm-orb-coral right-[-4rem] top-[28rem] h-52 w-52" />

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

      <main className="cm-page mx-auto max-w-6xl px-6 pt-20 pb-16">
        <section className="mx-auto mb-10 max-w-2xl space-y-6 text-center">
          <img src={brainLogo} alt="Mathlingo brain logo" className="cm-float mx-auto w-full max-w-24 drop-shadow-2xl" />
          <h1 className="cm-reveal cm-delay-1 text-3xl font-semibold tracking-tight text-coastal-mist">{branch.name}</h1>
          <p className="cm-reveal cm-delay-2 text-coastal-mist/75">
            {branch.lessonCount} lecciones distribuidas en {branch.gradeCount} grados
          </p>
        </section>

        <section className="cm-stagger space-y-8">
          {(branch.modules || []).map((module) => {
            const moduleGrade = gradeById.get(String(module.gradeId)) || null
            const moduleGradeUnlocked = moduleGrade ? unlockedGradeIds.has(String(module.gradeId)) : false

            return (
              <article key={module.id} className="cm-card space-y-5 p-6">
                <header className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold tracking-wide text-coastal-mist/55">
                      {module.gradeName} - {module.areaName}
                    </p>
                    <h2 className="mt-2 text-xl font-semibold tracking-tight text-coastal-mist">
                      {module.lessonCount} lecciones
                    </h2>
                  </div>
                  <span className={`cm-badge ${moduleGradeUnlocked ? 'cm-badge-live' : 'cm-badge-locked'}`}>
                    {moduleGradeUnlocked ? 'Grado activo' : 'Grado bloqueado'}
                  </span>
                </header>

                {(module.topics || []).map((topic) => (
                  <div key={`${module.id}:${topic.id}`} className="rounded-2xl border border-coastal-steel/70 bg-coastal-ocean/50 p-4">
                    <h3 className="text-lg font-semibold tracking-tight">{topic.name}</h3>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      {(topic.lessons || []).map((lesson) => {
                        const lessonCompleted = completedLessons.includes(lesson.progressId)
                        const lessonUnlocked =
                          Boolean(moduleGrade) &&
                          moduleGradeUnlocked &&
                          isLessonUnlockedInGrade({
                            grade: moduleGrade,
                            lessonProgressId: lesson.progressId,
                            completedLessons,
                          })

                        return (
                          <button
                            key={`${module.id}:${topic.id}:${lesson.id}`}
                            type="button"
                            onClick={() => {
                              if (!lessonUnlocked) return
                              navigate(`/lesson/${lesson.routeId}`)
                            }}
                            disabled={!lessonUnlocked}
                            className={`rounded-xl border px-3 py-3 text-left transition-all duration-200 ${
                              lessonUnlocked
                                ? 'border-coastal-steel bg-coastal-steel/40 hover:-translate-y-0.5 hover:border-coastal-neon/40 hover:bg-coastal-steel'
                                : 'cursor-not-allowed border-coastal-steel/50 bg-coastal-ocean/70 opacity-60'
                            }`}
                          >
                            <p className="text-xs text-coastal-mist/65">
                              {lesson.type === 'exam' ? 'EXAMEN' : 'PRACTICA'} - Dificultad {lesson.difficulty}
                            </p>
                            <p className="mt-1 text-sm font-semibold">{lesson.title}</p>
                            <p className="mt-1 text-xs text-coastal-mist/60">
                              {lesson.questionCount || 4} problemas -{' '}
                              {lesson.problemMix === 'contextualized'
                                ? 'Contextualizados'
                                : lesson.problemMix === 'mechanical'
                                  ? 'Mecanicos'
                                  : 'Mixtos'}
                            </p>
                            <p
                              className={`mt-1 text-xs ${
                                lessonCompleted ? 'text-emerald-300' : lessonUnlocked ? 'text-coastal-mist/65' : 'text-amber-300'
                              }`}
                            >
                              {lessonCompleted
                                ? 'Completada'
                                : lessonUnlocked
                                  ? 'Disponible'
                                  : moduleGradeUnlocked
                                    ? 'Bloqueada por secuencia'
                                    : 'Bloqueada por grado'}
                            </p>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </article>
            )
          })}
        </section>
      </main>
    </div>
  )
}

export default Branch
