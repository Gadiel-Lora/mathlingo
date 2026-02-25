import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import brainLogo from '../assets/brain-logo.png'
import { useProgress } from '../context/ProgressContext'
import {
  buildFinalExamProgressId,
  encodeLessonRouteId,
  flattenGradeLessons,
  getUnlockedGradeIds,
  isFinalExamUnlockedInGrade,
  isGradeUnlocked,
  isLessonUnlockedInGrade,
} from '../lib/academicCurriculum'
import { academicApi } from '../services/academicApi'

function Course() {
  const navigate = useNavigate()
  const { id } = useParams()
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
    return new Set(
      getUnlockedGradeIds({
        grades,
        completedLessons,
      }),
    )
  }, [completedLessons, grades])

  const gradeUnlocked = useMemo(() => {
    if (!grade?.id) return false
    return isGradeUnlocked({
      grades,
      gradeId: grade.id,
      completedLessons,
    })
  }, [completedLessons, grade?.id, grades])

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
        <div className="cm-card mx-auto max-w-5xl p-8 text-center">
          <p className="text-coastal-mist/75">Cargando grado...</p>
        </div>
      </div>
    )
  }

  if (error || !grade) {
    return (
      <div className="cm-shell px-6 pt-20 pb-16">
        <div className="cm-card mx-auto max-w-5xl space-y-6 p-8 text-center">
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
        <div className="cm-card mx-auto max-w-5xl space-y-6 p-8 text-center">
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
          <h1 className="text-3xl font-semibold tracking-tight text-coastal-mist">{grade.name}</h1>
          <p className="text-coastal-mist/75">
            {grade.areas?.length || 0} modulos - {lessonCards.length} lecciones
          </p>
        </section>

        <section className="mt-12 space-y-6">
          {lessonCards.map((lesson, index) => (
            <article
              key={lesson.progressId}
              onClick={() => {
                if (lesson.locked) return
                navigate(`/lesson/${lesson.routeId}`)
              }}
              className={`cm-card p-6 ${
                lesson.locked
                  ? 'cursor-not-allowed bg-coastal-ocean/70 opacity-50'
                  : 'cursor-pointer bg-coastal-ocean/70 transition-all duration-200 hover:-translate-y-0.5 hover:bg-coastal-steel/80'
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
              <h2 className="mt-2 text-xl font-semibold tracking-tight">{lesson.lessonTitle}</h2>
              <p className="mt-2 text-sm text-coastal-mist/75">
                {lesson.locked ? 'Bloqueada' : lesson.completed ? 'Completada' : 'Lista para continuar'}
              </p>
              <p className="mt-2 text-xs text-coastal-mist/65">
                Dificultad {lesson.difficulty} - {lesson.questionCount || 4} problemas -{' '}
                {lesson.problemMix === 'contextualized'
                  ? 'Contextualizados'
                  : lesson.problemMix === 'mechanical'
                    ? 'Mecanicos'
                    : 'Mixtos'}
              </p>
              <p className="mt-1 text-xs text-coastal-mist/65">
                XP base {lesson.xpReward}
              </p>
            </article>
          ))}

          <article
            onClick={() => {
              if (!allRegularLessonsCompleted) return
              navigate(`/lesson/${finalExamRouteId}`)
            }}
            className={`cm-card p-6 ${
              allRegularLessonsCompleted
                ? 'cursor-pointer bg-coastal-ocean/70 transition-all duration-200 hover:-translate-y-0.5 hover:bg-coastal-steel/80'
                : 'cursor-not-allowed bg-coastal-ocean/70 opacity-50'
            }`}
          >
            <div className="flex flex-wrap items-center gap-2 text-xs text-coastal-mist/55">
              <span>EXAMEN FINAL</span>
              <span>-</span>
              <span>Ayuda IA bloqueada</span>
              <span>-</span>
              <span>XP x2 si apruebas</span>
            </div>
            <h2 className="mt-2 text-xl font-semibold tracking-tight">Examen Final del Grado</h2>
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
