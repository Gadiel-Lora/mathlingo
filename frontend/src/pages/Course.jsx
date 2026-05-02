import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import brainLogo from '../assets/brain-logo.png'
import { useAuth } from '../context/AuthContext'
import { useProgress } from '../context/ProgressContext'
import {
  buildFinalExamProgressId,
  encodeLessonRouteId,
  flattenGradeLessons,
  getUnlockedGradeIds,
  isFinalExamUnlockedInGrade,
  isLessonUnlockedInGrade,
} from '../lib/academicCurriculum'
import { academicApi } from '../services/academicApi'

function Course() {
  const navigate = useNavigate()
  const { id } = useParams()
  const { profile } = useAuth()
  const { completedLessons, loadingProgress } = useProgress()

  const [grades, setGrades] = useState([])
  const [grade, setGrade] = useState(null)
  const [lessons, setLessons] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let isMounted = true

    const loadGrade = async () => {
      if (!id) {
        if (isMounted) {
          setError('Grado no valido.')
          setLoading(false)
        }
        return
      }

      try {
        setLoading(true)
        setError('')

        const payload = await academicApi.getCurriculum()
        if (!isMounted) return

        const allGrades = (payload?.grades || []).slice().sort((left, right) => {
          return Number(left?.gradeNumber || 0) - Number(right?.gradeNumber || 0)
        })
        const selectedGrade = allGrades.find((gradeItem) => String(gradeItem.id) === String(id)) || null

        setGrades(allGrades)
        if (!selectedGrade) {
          setGrade(null)
          setLessons([])
          setError('Grado no encontrado.')
          return
        }

        const rows = flattenGradeLessons(selectedGrade).sort((a, b) => a.globalIndex - b.globalIndex)
        setGrade(selectedGrade)
        setLessons(rows)
      } catch (loadError) {
        if (!isMounted) return
        setError(loadError?.message || 'No se pudo cargar el grado.')
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    void loadGrade()

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

  const gradeUnlocked = useMemo(() => {
    if (!grade?.id) return false
    return unlockedGradeIds.has(String(grade.id))
  }, [grade?.id, unlockedGradeIds])

  const lessonCards = useMemo(() => {
    if (!grade?.id) return []

    const completedSet = new Set(completedLessons)
    const isCurrentGradeUnlocked = unlockedGradeIds.has(String(grade.id))

    return lessons.map((lesson) => {
      const completed = completedSet.has(lesson.progressId)
      const locked =
        !isCurrentGradeUnlocked ||
        !isLessonUnlockedInGrade({
          grade,
          lessonProgressId: lesson.progressId,
          completedLessons,
        })

      return {
        ...lesson,
        completed,
        locked,
        routeId: encodeLessonRouteId({
          gradeId: lesson.gradeId,
          topicId: lesson.topicId,
          lessonId: lesson.lessonId,
        }),
      }
    })
  }, [completedLessons, grade, lessons, unlockedGradeIds])

  const allRegularLessonsCompleted = useMemo(() => {
    if (!grade) return false
    return isFinalExamUnlockedInGrade({
      grade,
      completedLessons,
    })
  }, [completedLessons, grade])

  const finalExamRouteId = useMemo(() => {
    if (!grade?.id) return ''
    return encodeLessonRouteId({
      gradeId: grade.id,
      topicId: 'final-exam',
      lessonId: 'final-exam',
    })
  }, [grade?.id])

  const finalExamCompleted = useMemo(() => {
    if (!grade?.id) return false
    return completedLessons.includes(buildFinalExamProgressId(grade.id))
  }, [completedLessons, grade?.id])

  const finalExamQuestionText = useMemo(() => {
    const range = grade?.finalExam?.questionRange
    if (!Array.isArray(range) || range.length < 2) return 'Cantidad variable'
    const [min, max] = range.map((value) => Number(value))
    if (!Number.isFinite(min) || !Number.isFinite(max)) return 'Cantidad variable'
    if (min === max) return `${Math.floor(min)} preguntas`
    return `${Math.floor(min)}-${Math.floor(max)} preguntas`
  }, [grade?.finalExam?.questionRange])

  if (loading || loadingProgress) {
    return (
      <div className="cm-shell px-6 pt-20 pb-16">
        <div className="mx-auto max-w-5xl space-y-3">
          <div className="cm-card p-8">
            <div className="cm-skeleton h-5 w-1/4" />
            <div className="cm-skeleton mt-4 h-4 w-2/3" />
          </div>
          <div className="cm-card p-6">
            <div className="cm-skeleton h-5 w-1/3" />
            <div className="cm-skeleton mt-4 h-4 w-4/5" />
            <div className="cm-skeleton mt-4 h-4 w-1/2" />
          </div>
        </div>
      </div>
    )
  }

  if (error || !grade) {
    return (
      <div className="cm-shell px-6 pt-20 pb-16">
        <div className="cm-card cm-page mx-auto max-w-5xl space-y-6 p-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-coastal-mist">No se pudo abrir el grado</h1>
          <p className="text-coastal-mist/75">{error || 'Grado no encontrado.'}</p>
          <Link to="/dashboard" className="cm-btn-primary">
            Volver al dashboard
          </Link>
        </div>
      </div>
    )
  }

  if (!gradeUnlocked) {
    return (
      <div className="cm-shell px-6 pt-20 pb-16">
        <div className="cm-card cm-page mx-auto max-w-5xl space-y-6 p-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-coastal-mist">Grado bloqueado</h1>
          <p className="text-coastal-mist/75">
            Este grado se desbloquea cuando completas academicamente el grado anterior.
          </p>
          <Link to="/dashboard" className="cm-btn-primary">
            Volver al dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="cm-shell">
      <div className="cm-orb cm-orb-cyan left-[-7rem] top-[8rem] h-56 w-56" />
      <div className="cm-orb cm-orb-gold right-[-5rem] top-[24rem] h-48 w-48" />

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

      <main className="cm-page mx-auto max-w-5xl px-6 pt-20 pb-16">
        <section className="mx-auto mb-12 max-w-2xl space-y-6 text-center">
          <img src={brainLogo} alt="Mathlingo brain logo" className="cm-float mx-auto w-full max-w-24 drop-shadow-2xl" />
          <h1 className="cm-reveal cm-delay-1 text-3xl font-semibold tracking-tight text-coastal-mist">{grade.name}</h1>
          <p className="cm-reveal cm-delay-2 text-coastal-mist/75">
            {grade.areas?.length || 0} modulos - {lessonCards.length} lecciones
          </p>
        </section>

        <section className="cm-stagger mt-12 space-y-6">
          {lessonCards.map((lesson, index) => (
            <article
              key={lesson.progressId}
              onClick={() => {
                if (lesson.locked) return
                navigate(`/lesson/${lesson.routeId}`)
              }}
              className={`cm-card p-6 ${
                lesson.locked ? 'cursor-not-allowed bg-coastal-ocean/70 opacity-50' : 'cm-card-interactive bg-coastal-ocean/70'
              }`}
            >
              <div className="flex flex-wrap items-center gap-2 text-xs text-coastal-mist/55">
                <span>LECCION {index + 1}</span>
                <span>-</span>
                <span>{lesson.areaName}</span>
                <span>-</span>
                <span>{lesson.topicName}</span>
                {lesson.lessonType === 'exam' && (
                  <>
                    <span>-</span>
                    <span className="font-semibold text-amber-300">EXAMEN</span>
                  </>
                )}
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-semibold tracking-tight">{lesson.lessonTitle}</h2>
                <span
                  className={`cm-badge ${
                    lesson.locked ? 'cm-badge-locked' : lesson.completed ? 'cm-badge-live' : 'border-coastal-steel text-coastal-mist/80'
                  }`}
                >
                  {lesson.locked ? 'Bloqueada' : lesson.completed ? 'Completada' : 'Disponible'}
                </span>
              </div>
              <p className="mt-2 text-xs text-coastal-mist/65">
                Dificultad {lesson.difficulty} - {lesson.questionCount || 4} problemas -{' '}
                {lesson.problemMix === 'contextualized'
                  ? 'Contextualizados'
                  : lesson.problemMix === 'mechanical'
                    ? 'Mecanicos'
                    : 'Mixtos'}
              </p>
              <p className="mt-1 text-xs text-coastal-mist/65">XP base {lesson.xpReward}</p>
            </article>
          ))}

          <article
            onClick={() => {
              if (!allRegularLessonsCompleted) return
              navigate(`/lesson/${finalExamRouteId}`)
            }}
            className={`cm-card p-6 ${
              allRegularLessonsCompleted ? 'cm-card-interactive bg-coastal-ocean/70' : 'cursor-not-allowed bg-coastal-ocean/70 opacity-50'
            }`}
          >
            <div className="flex flex-wrap items-center gap-2 text-xs text-coastal-mist/55">
              <span>EXAMEN FINAL</span>
              <span>-</span>
              <span>Ayuda IA bloqueada</span>
              <span>-</span>
              <span>XP x2 si apruebas</span>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-semibold tracking-tight">Examen Final del Grado</h2>
              <span className={`cm-badge ${allRegularLessonsCompleted ? 'cm-badge-live' : 'cm-badge-locked'}`}>
                {finalExamCompleted ? 'Completado' : allRegularLessonsCompleted ? 'Listo' : 'Bloqueado'}
              </span>
            </div>
            <p className="mt-2 text-sm text-coastal-mist/75">
              {finalExamCompleted
                ? 'Completado'
                : allRegularLessonsCompleted
                  ? 'Listo para rendir'
                  : 'Completa todas las lecciones para desbloquearlo'}
            </p>
            <p className="mt-2 text-xs text-coastal-mist/65">{finalExamQuestionText}</p>
          </article>
        </section>
      </main>
    </div>
  )
}

export default Course
