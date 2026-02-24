import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import brainLogo from '../assets/brain-logo.png'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../supabase/client'

const AI_API_BASE_URL = (import.meta.env.VITE_AI_API_URL || 'http://localhost:4000').replace(/\/$/, '')
const AI_HELP_ENDPOINT = `${AI_API_BASE_URL}/api/ai-help`

const parseJsonResponse = async (response) => {
  const rawBody = await response.text()
  if (!rawBody) return {}

  try {
    return JSON.parse(rawBody)
  } catch {
    return { error: rawBody }
  }
}

const normalizeOptions = (value) => {
  if (!Array.isArray(value)) return []
  return value.map((item) => String(item))
}

const toSafeInt = (value) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 0) return 0
  return Math.floor(parsed)
}

function Lesson() {
  const navigate = useNavigate()
  const { id } = useParams()
  const lessonId = id
  const { user } = useAuth()

  const [lesson, setLesson] = useState(null)
  const [questions, setQuestions] = useState([])
  const [loadingLesson, setLoadingLesson] = useState(true)
  const [lessonError, setLessonError] = useState('')
  const [completionSynced, setCompletionSynced] = useState(false)

  const [xp, setXp] = useState(0)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [selectedOption, setSelectedOption] = useState(null)
  const [showFeedback, setShowFeedback] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [xpBeforeCompletion, setXpBeforeCompletion] = useState(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiAnswer, setAiAnswer] = useState('')
  const [aiError, setAiError] = useState('')

  useEffect(() => {
    let isMounted = true

    const loadLessonData = async () => {
      if (!lessonId) {
        if (isMounted) {
          setLessonError('Leccion no valida.')
          setLoadingLesson(false)
        }
        return
      }

      try {
        setLoadingLesson(true)
        setLessonError('')

        const { data: lessonRow, error: lessonQueryError } = await supabase
          .from('lessons')
          .select('id, title, course_id, order_index')
          .eq('id', lessonId)
          .maybeSingle()

        if (lessonQueryError) throw lessonQueryError
        if (!lessonRow) {
          if (!isMounted) return
          setLesson(null)
          setQuestions([])
          setLessonError('Leccion no encontrada.')
          return
        }

        const { data: questionRows, error: questionQueryError } = await supabase
          .from('questions')
          .select('id, lesson_id, question, options, correct_index, order_index')
          .eq('lesson_id', lessonId)
          .order('order_index', { ascending: true })
          .order('id', { ascending: true })

        if (questionQueryError) throw questionQueryError
        if (!isMounted) return

        setLesson({
          id: String(lessonRow.id),
          title: lessonRow.title || `Leccion ${lessonRow.id}`,
          courseId: String(lessonRow.course_id),
          orderIndex: toSafeInt(lessonRow.order_index),
        })

        setQuestions(
          (questionRows || []).map((row) => ({
            id: String(row.id),
            lessonId: String(row.lesson_id),
            question: row.question || '',
            options: normalizeOptions(row.options),
            correctIndex: Number(row.correct_index),
            orderIndex: toSafeInt(row.order_index),
          })),
        )
      } catch (error) {
        if (!isMounted) return
        setLessonError(error?.message || 'No se pudo cargar la leccion.')
      } finally {
        if (isMounted) setLoadingLesson(false)
      }
    }

    loadLessonData()

    return () => {
      isMounted = false
    }
  }, [lessonId])

  useEffect(() => {
    let isMounted = true

    const loadXp = async () => {
      if (!user?.id) {
        if (isMounted) setXp(0)
        return
      }

      const { data, error } = await supabase.from('progress').select('xp').eq('user_id', user.id).maybeSingle()
      if (error) {
        console.error('Error loading XP:', error.message)
        if (isMounted) setXp(0)
        return
      }

      if (isMounted) {
        setXp(toSafeInt(data?.xp))
      }
    }

    void loadXp()

    return () => {
      isMounted = false
    }
  }, [user?.id])

  useEffect(() => {
    setCurrentQuestionIndex(0)
    setSelectedOption(null)
    setShowFeedback(false)
    setCompleted(false)
    setXpBeforeCompletion(null)
    setCompletionSynced(false)
    setAiLoading(false)
    setAiAnswer('')
    setAiError('')
  }, [lessonId])

  useEffect(() => {
    if (!completed || completionSynced || !user?.id || !lessonId || !lesson) return

    let isMounted = true

    const syncCompletion = async () => {
      try {
        const now = new Date().toISOString()

        const { error: completeCurrentError } = await supabase
          .from('user_lesson_progress')
          .update({ status: 'completed', completed_at: now })
          .eq('user_id', user.id)
          .eq('lesson_id', lessonId)

        if (completeCurrentError) throw completeCurrentError

        const { data: courseLessons, error: courseLessonsError } = await supabase
          .from('lessons')
          .select('id, order_index')
          .eq('course_id', lesson.courseId)
          .order('order_index', { ascending: true })
          .order('id', { ascending: true })

        if (courseLessonsError) throw courseLessonsError

        const orderedLessonIds = (courseLessons || []).map((row) => String(row.id))
        const currentIndex = orderedLessonIds.findIndex((value) => value === String(lessonId))
        const nextLessonId = currentIndex >= 0 ? orderedLessonIds[currentIndex + 1] : null

        if (nextLessonId) {
          const { error: unlockError } = await supabase
            .from('user_lesson_progress')
            .update({ status: 'in_progress' })
            .eq('user_id', user.id)
            .eq('lesson_id', nextLessonId)
            .eq('status', 'locked')

          if (unlockError) throw unlockError
        }

        const { data: progressRow, error: progressFetchError } = await supabase
          .from('progress')
          .select('xp')
          .eq('user_id', user.id)
          .maybeSingle()

        if (progressFetchError) throw progressFetchError

        const currentXp = toSafeInt(progressRow?.xp)
        const nextXp = currentXp + 20

        if (progressRow) {
          const { error: progressUpdateError } = await supabase
            .from('progress')
            .update({ xp: nextXp, updated_at: now })
            .eq('user_id', user.id)

          if (progressUpdateError) throw progressUpdateError
        } else {
          const { error: progressInsertError } = await supabase.from('progress').insert({
            user_id: user.id,
            completed_lessons: [],
            xp: nextXp,
            current_streak: 0,
          })

          if (progressInsertError) throw progressInsertError
        }

        if (isMounted) {
          setXpBeforeCompletion(currentXp)
          setXp(nextXp)
          setCompletionSynced(true)
        }
      } catch (error) {
        console.error('Error syncing lesson completion:', error?.message || error)
        if (isMounted) setCompletionSynced(true)
      }
    }

    void syncCompletion()

    return () => {
      isMounted = false
    }
  }, [completed, completionSynced, lesson, lessonId, user?.id])

  if (loadingLesson) {
    return (
      <div className="min-h-screen bg-zinc-950 px-6 pt-20 pb-16 text-white">
        <div className="mx-auto max-w-3xl rounded-2xl border border-zinc-800 bg-zinc-900/70 p-8 text-center shadow-lg shadow-black/30 backdrop-blur-sm">
          <p className="text-zinc-400">Cargando leccion...</p>
        </div>
      </div>
    )
  }

  if (!lesson || lessonError || questions.length === 0) {
    return (
      <div className="min-h-screen bg-zinc-950 px-6 pt-20 pb-16 text-white">
        <div className="mx-auto max-w-3xl space-y-6 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-8 text-center shadow-lg shadow-black/30 backdrop-blur-sm">
          <h1 className="mx-auto max-w-2xl text-2xl font-semibold tracking-tight text-white">Leccion no disponible</h1>
          <p className="text-zinc-400">{lessonError || 'No hay preguntas disponibles para esta leccion.'}</p>
          <Link
            to="/dashboard"
            className="inline-block rounded-2xl bg-indigo-700 px-6 py-3 font-semibold tracking-tight transition-all duration-200 hover:translate-y-[-1px] hover:bg-indigo-600"
          >
            Volver al dashboard
          </Link>
        </div>
      </div>
    )
  }

  const totalQuestions = questions.length
  const currentQuestion = questions[currentQuestionIndex]
  const progress = Math.round((currentQuestionIndex / totalQuestions) * 100)
  const level = Math.floor(xp / 100) + 1
  const previousLevel = xpBeforeCompletion === null ? level : Math.floor(xpBeforeCompletion / 100) + 1
  const leveledUp = completed && xpBeforeCompletion !== null && level > previousLevel

  const handleOptionClick = (optionIndex) => {
    if (showFeedback || completed) return
    setSelectedOption(optionIndex)
    setShowFeedback(true)
  }

  const handleNext = () => {
    const isLastQuestion = currentQuestionIndex >= totalQuestions - 1
    if (isLastQuestion) {
      setCompleted(true)
      return
    }

    setCurrentQuestionIndex((prev) => prev + 1)
    setSelectedOption(null)
    setShowFeedback(false)
    setAiAnswer('')
    setAiError('')
    setAiLoading(false)
  }

  const askAI = async () => {
    setAiLoading(true)
    setAiError('')
    setAiAnswer('')

    try {
      const lessonContext = `Leccion: ${lesson.title}. Pregunta ${currentQuestionIndex + 1} de ${totalQuestions}. Opciones: ${currentQuestion.options.join(', ')}.`

      const response = await fetch(AI_HELP_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: currentQuestion.question,
          lessonContext,
        }),
      })

      const payload = await parseJsonResponse(response)
      if (!response.ok) {
        const backendError = [payload?.error, payload?.details]
          .filter((value) => Boolean(String(value || '').trim()))
          .map((value) => String(value).trim())
          .join(' | ')
        const message = backendError || `Error HTTP ${response.status}`
        const providerStatus = payload?.providerStatus ? ` (status proveedor ${payload.providerStatus})` : ''
        const requestId = payload?.requestId ? ` [requestId: ${payload.requestId}]` : ''
        throw new Error(`${message}${providerStatus}${requestId}`)
      }

      const answer = String(payload?.answer || '').trim()
      if (!answer) {
        throw new Error('El backend respondio sin contenido de ayuda.')
      }

      setAiAnswer(answer)
    } catch (error) {
      const frontendOrigin = typeof window !== 'undefined' ? window.location.origin : 'frontend'
      const networkError = `No se pudo conectar con ${AI_HELP_ENDPOINT} desde ${frontendOrigin}. Verifica backend y CORS.`
      if (error instanceof TypeError) {
        setAiError(networkError)
      } else {
        setAiError(error?.message || networkError)
      }
      console.error('AI help request failed:', error)
    } finally {
      setAiLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 px-6 pt-20 pb-16 text-white">
      <div className="mx-auto max-w-3xl">
        <img src={brainLogo} alt="Mathlingo brain logo" className="mx-auto w-full max-w-24 drop-shadow-2xl" />

        {!completed ? (
          <section className="mt-12 space-y-6 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-8 shadow-lg shadow-black/30 backdrop-blur-sm">
            <h1 className="mx-auto max-w-2xl text-3xl font-semibold tracking-tight text-white">{lesson.title}</h1>

            <div className="space-y-6">
              <p className="text-sm text-zinc-400">
                Progreso: {currentQuestionIndex}/{totalQuestions}
              </p>
              <div className="h-4 w-full rounded-full bg-zinc-800">
                <div
                  className="h-4 rounded-full bg-indigo-700 transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <h2 className="text-xl font-semibold tracking-tight">{currentQuestion.question}</h2>

            <div className="space-y-3">
              <button
                type="button"
                onClick={askAI}
                disabled={aiLoading}
                className="inline-flex items-center rounded-2xl border border-zinc-700 px-4 py-2 text-sm font-semibold tracking-tight text-zinc-200 transition-all duration-200 hover:border-indigo-500/50 hover:text-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {aiLoading ? (
                  <>
                    <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-zinc-500 border-t-indigo-400" />
                    Procesando...
                  </>
                ) : (
                  'Ayuda IA'
                )}
              </button>

              {aiError && (
                <p className="rounded-2xl border border-red-600/40 bg-red-600/10 px-4 py-3 text-sm text-red-200">
                  {aiError}
                </p>
              )}

              {aiAnswer && (
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 shadow-lg shadow-black/30 backdrop-blur-sm">
                  <p className="text-xs font-semibold tracking-wide text-indigo-400">AYUDA IA</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-200">{aiAnswer}</p>
                </div>
              )}
            </div>

            <div className="space-y-3">
              {currentQuestion.options.map((option, index) => {
                const isSelected = selectedOption === index
                const isCorrect = currentQuestion.correctIndex === index
                const selectedWrong = showFeedback && isSelected && !isCorrect
                const shouldHighlightCorrect = showFeedback && isCorrect

                let stateClass = 'border border-zinc-800 bg-zinc-900 shadow-lg shadow-black/30 hover:bg-zinc-800'
                if (selectedWrong) stateClass = 'border border-red-600/40 bg-red-600/10'
                if (shouldHighlightCorrect) stateClass = 'border border-emerald-600/40 bg-emerald-600/10'

                return (
                  <button
                    key={`${currentQuestion.id}-${index}`}
                    type="button"
                    onClick={() => handleOptionClick(index)}
                    disabled={showFeedback}
                    className={`w-full rounded-2xl p-4 text-left transition-all duration-200 ${stateClass} ${
                      showFeedback ? 'cursor-default' : 'cursor-pointer'
                    }`}
                  >
                    {option}
                  </button>
                )
              })}
            </div>

            {showFeedback && (
              <button
                type="button"
                onClick={handleNext}
                className="rounded-2xl bg-indigo-700 px-6 py-3 font-semibold tracking-tight transition-all duration-200 hover:translate-y-[-1px] hover:bg-indigo-600"
              >
                Siguiente
              </button>
            )}
          </section>
        ) : (
          <section className="mt-12 space-y-6 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-8 text-center shadow-lg shadow-black/30 backdrop-blur-sm transition-all duration-500">
            <h2 className="mx-auto max-w-2xl text-3xl font-semibold tracking-tight text-white">Leccion completada</h2>
            <p className="text-2xl font-semibold text-indigo-400">+20 XP</p>
            {leveledUp && (
              <p className="text-3xl font-semibold tracking-tight text-emerald-400 transition-all duration-500">
                Subiste a Nivel {level}
              </p>
            )}
            <div className="space-x-3">
              <button
                type="button"
                onClick={() => navigate(`/course/${lesson.courseId}`)}
                className="inline-block rounded-2xl border border-zinc-700 px-6 py-3 font-semibold tracking-tight text-zinc-200 transition-all duration-200 hover:border-indigo-500/50 hover:text-indigo-400"
              >
                Volver al curso
              </button>
              <Link
                to="/dashboard"
                className="inline-block rounded-2xl bg-indigo-700 px-6 py-3 font-semibold tracking-tight transition-all duration-200 hover:translate-y-[-1px] hover:bg-indigo-600"
              >
                Ir al dashboard
              </Link>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

export default Lesson
