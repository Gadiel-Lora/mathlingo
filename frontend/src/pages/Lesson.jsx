import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import brainLogo from '../assets/brain-logo.png'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../supabase/client'

const AI_API_BASE_URL = (import.meta.env.VITE_AI_API_URL || 'http://localhost:4000').replace(/\/$/, '')
const QUESTION_STATE_ENDPOINT = `${AI_API_BASE_URL}/api/question/state`
const QUESTION_SUBMIT_ENDPOINT = `${AI_API_BASE_URL}/api/question/submit`
const QUESTION_HELP_ENDPOINT = `${AI_API_BASE_URL}/api/question/help`

const MAX_ATTEMPTS = 3

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

const getQuestionTypeByDifficulty = (difficulty) => {
  return Number(difficulty) >= 3 ? 'input' : 'multiple-choice'
}

const normalizeAnswer = (value) => {
  return String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ')
}

const createDefaultQuestionState = (difficulty) => ({
  attempts: 0,
  assisted: false,
  locked: false,
  helpClicks: 0,
  questionType: getQuestionTypeByDifficulty(difficulty),
})

function Lesson() {
  const navigate = useNavigate()
  const { id } = useParams()
  const lessonId = id
  const { user } = useAuth()

  const learnerId = useMemo(() => {
    if (user?.id) return String(user.id)
    return `guest-${String(lessonId || 'lesson')}`
  }, [lessonId, user?.id])

  const [lesson, setLesson] = useState(null)
  const [questions, setQuestions] = useState([])
  const [loadingLesson, setLoadingLesson] = useState(true)
  const [lessonError, setLessonError] = useState('')
  const [completionSynced, setCompletionSynced] = useState(false)

  const [xp, setXp] = useState(0)
  const [sessionEarnedXp, setSessionEarnedXp] = useState(0)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [selectedOption, setSelectedOption] = useState(null)
  const [freeResponse, setFreeResponse] = useState('')
  const [feedbackMessage, setFeedbackMessage] = useState('')
  const [feedbackTone, setFeedbackTone] = useState('neutral')
  const [completed, setCompleted] = useState(false)
  const [xpBeforeCompletion, setXpBeforeCompletion] = useState(null)

  const [questionStates, setQuestionStates] = useState({})
  const [revealedAnswers, setRevealedAnswers] = useState({})

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
          (questionRows || []).map((row, index) => {
            const options = normalizeOptions(row.options)
            const correctIndex = Number(row.correct_index)
            const inferredDifficulty = Math.max(1, Math.min(3, toSafeInt(row.order_index) + 1 || index + 1))
            const questionType = getQuestionTypeByDifficulty(inferredDifficulty)

            return {
              id: String(row.id),
              lessonId: String(row.lesson_id),
              question: row.question || '',
              options,
              correctIndex,
              correctAnswer: options[correctIndex] || '',
              orderIndex: toSafeInt(row.order_index),
              difficulty: inferredDifficulty,
              questionType,
            }
          }),
        )
      } catch (error) {
        if (!isMounted) return
        setLessonError(error?.message || 'No se pudo cargar la leccion.')
      } finally {
        if (isMounted) setLoadingLesson(false)
      }
    }

    void loadLessonData()

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
    setFreeResponse('')
    setFeedbackMessage('')
    setFeedbackTone('neutral')
    setCompleted(false)
    setXpBeforeCompletion(null)
    setCompletionSynced(false)
    setSessionEarnedXp(0)
    setQuestionStates({})
    setRevealedAnswers({})
    setAiLoading(false)
    setAiAnswer('')
    setAiError('')
  }, [lessonId])

  const currentQuestion = questions[currentQuestionIndex] || null

  useEffect(() => {
    if (!currentQuestion || completed) return

    let isMounted = true

    const initQuestionState = async () => {
      try {
        const response = await fetch(QUESTION_STATE_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: learnerId,
            questionId: currentQuestion.id,
            difficulty: currentQuestion.difficulty,
          }),
        })

        const payload = await parseJsonResponse(response)
        if (!response.ok) {
          throw new Error(payload?.error || `Error HTTP ${response.status}`)
        }

        if (!isMounted) return

        setQuestionStates((prev) => {
          const existing = prev[currentQuestion.id] || createDefaultQuestionState(currentQuestion.difficulty)
          return {
            ...prev,
            [currentQuestion.id]: {
              ...existing,
              ...payload.state,
              questionType: payload.questionType || existing.questionType,
            },
          }
        })
      } catch (error) {
        if (!isMounted) return

        setQuestionStates((prev) => ({
          ...prev,
          [currentQuestion.id]: prev[currentQuestion.id] || createDefaultQuestionState(currentQuestion.difficulty),
        }))

        console.error('Error initializing question state:', error?.message || error)
      }
    }

    void initQuestionState()

    return () => {
      isMounted = false
    }
  }, [completed, currentQuestion, learnerId])

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
        const nextXp = currentXp + sessionEarnedXp

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
  }, [completed, completionSynced, lesson, lessonId, sessionEarnedXp, user?.id])

  if (loadingLesson) {
    return (
      <div className="cm-shell px-6 pt-20 pb-16">
        <div className="cm-card mx-auto max-w-3xl p-8 text-center">
          <p className="text-coastal-mist/75">Cargando leccion...</p>
        </div>
      </div>
    )
  }

  if (!lesson || lessonError || questions.length === 0) {
    return (
      <div className="cm-shell px-6 pt-20 pb-16">
        <div className="cm-card mx-auto max-w-3xl space-y-6 p-8 text-center">
          <h1 className="mx-auto max-w-2xl text-2xl font-semibold tracking-tight text-coastal-mist">Leccion no disponible</h1>
          <p className="text-coastal-mist/75">{lessonError || 'No hay preguntas disponibles para esta leccion.'}</p>
          <Link to="/dashboard" className="cm-btn-primary">
            Volver al dashboard
          </Link>
        </div>
      </div>
    )
  }

  const totalQuestions = questions.length
  const progress = Math.round((currentQuestionIndex / totalQuestions) * 100)
  const level = Math.floor(xp / 100) + 1
  const previousLevel = xpBeforeCompletion === null ? level : Math.floor(xpBeforeCompletion / 100) + 1
  const leveledUp = completed && xpBeforeCompletion !== null && level > previousLevel

  const questionState = currentQuestion
    ? questionStates[currentQuestion.id] || createDefaultQuestionState(currentQuestion.difficulty)
    : createDefaultQuestionState(1)

  const canSubmit = (() => {
    if (!currentQuestion || questionState.locked || aiLoading) return false
    if (questionState.questionType === 'input') return normalizeAnswer(freeResponse).length > 0
    return selectedOption !== null
  })()

  const canGoNext = Boolean(questionState.locked)

  const buildLessonContext = (question) => {
    const optionText = question.options.length > 0 ? `Opciones: ${question.options.join(', ')}.` : 'Sin opciones visibles.'
    return `Leccion: ${lesson.title}. Dificultad: ${question.difficulty}. Tipo: ${questionState.questionType}. ${optionText}`
  }

  const updateCurrentQuestionState = (nextState, extra = {}) => {
    if (!currentQuestion) return

    setQuestionStates((prev) => {
      const existing = prev[currentQuestion.id] || createDefaultQuestionState(currentQuestion.difficulty)
      return {
        ...prev,
        [currentQuestion.id]: {
          ...existing,
          ...nextState,
          ...extra,
        },
      }
    })
  }

  const submitAnswer = async () => {
    if (!currentQuestion || !canSubmit) return

    setAiError('')

    const userAnswer =
      questionState.questionType === 'input'
        ? freeResponse
        : currentQuestion.options[selectedOption] || String(selectedOption)

    const isCorrect =
      questionState.questionType === 'input'
        ? normalizeAnswer(freeResponse) === normalizeAnswer(currentQuestion.correctAnswer)
        : selectedOption === currentQuestion.correctIndex

    try {
      const response = await fetch(QUESTION_SUBMIT_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: learnerId,
          questionId: currentQuestion.id,
          difficulty: currentQuestion.difficulty,
          question: currentQuestion.question,
          lessonContext: buildLessonContext(currentQuestion),
          correctAnswer: currentQuestion.correctAnswer,
          submittedAnswer: userAnswer,
          isCorrect,
        }),
      })

      const payload = await parseJsonResponse(response)
      if (!response.ok) {
        throw new Error(payload?.error || `Error HTTP ${response.status}`)
      }

      updateCurrentQuestionState(payload.state, {
        questionType: payload.questionType || questionState.questionType,
      })

      const earnedXp = toSafeInt(payload?.xpAwarded)
      if (earnedXp > 0) {
        setSessionEarnedXp((prev) => prev + earnedXp)
        setXp((prev) => prev + earnedXp)
      }

      if (payload.correct) {
        setFeedbackTone('success')
        setFeedbackMessage(earnedXp > 0 ? `Correcto. +${earnedXp} XP` : 'Correcto. XP = 0')
        setAiAnswer('')
        return
      }

      if (payload.maxAttemptsReached) {
        setFeedbackTone('warning')
        setFeedbackMessage('Incorrecto, intenta nuevamente.')
        setAiAnswer(String(payload?.answer || '').trim())

        if (payload?.correctAnswer) {
          setRevealedAnswers((prev) => ({
            ...prev,
            [currentQuestion.id]: String(payload.correctAnswer),
          }))
        }
        return
      }

      setFeedbackTone('error')
      setFeedbackMessage('Incorrecto, intenta nuevamente.')
      setAiAnswer('')
    } catch (error) {
      setAiError(error?.message || 'No se pudo validar la respuesta en el backend.')
      console.error('Submit answer failed:', error)
    }
  }

  const requestHelp = async () => {
    if (!currentQuestion || questionState.locked || aiLoading) return

    setAiLoading(true)
    setAiError('')

    try {
      const nextMode = questionState.helpClicks >= 1 ? 'full' : 'hint'

      const response = await fetch(QUESTION_HELP_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: learnerId,
          questionId: currentQuestion.id,
          difficulty: currentQuestion.difficulty,
          mode: nextMode,
          question: currentQuestion.question,
          lessonContext: buildLessonContext(currentQuestion),
          correctAnswer: currentQuestion.correctAnswer,
        }),
      })

      const payload = await parseJsonResponse(response)
      if (!response.ok) {
        throw new Error(payload?.error || `Error HTTP ${response.status}`)
      }

      const receivedMode = payload?.mode === 'full' ? 'full' : 'hint'
      const nextHelpClicks = receivedMode === 'full' ? 2 : questionState.helpClicks + 1

      updateCurrentQuestionState(payload.state, {
        questionType: payload.questionType || questionState.questionType,
        helpClicks: nextHelpClicks,
      })

      setAiAnswer(String(payload?.answer || '').trim())

      if (receivedMode === 'full') {
        setFeedbackTone('warning')
        setFeedbackMessage('Resuelto con ayuda. XP = 0')

        if (payload?.correctAnswer) {
          setRevealedAnswers((prev) => ({
            ...prev,
            [currentQuestion.id]: String(payload.correctAnswer),
          }))
        }
      } else {
        setFeedbackTone('neutral')
        setFeedbackMessage('Pista cargada.')
      }
    } catch (error) {
      setAiError(error?.message || 'No se pudo solicitar ayuda IA.')
      console.error('Request help failed:', error)
    } finally {
      setAiLoading(false)
    }
  }

  const handleNext = () => {
    if (!canGoNext) return

    const isLastQuestion = currentQuestionIndex >= totalQuestions - 1
    if (isLastQuestion) {
      setCompleted(true)
      return
    }

    setCurrentQuestionIndex((prev) => prev + 1)
    setSelectedOption(null)
    setFreeResponse('')
    setFeedbackMessage('')
    setFeedbackTone('neutral')
    setAiAnswer('')
    setAiError('')
    setAiLoading(false)
  }

  return (
    <div className="cm-shell px-6 pt-20 pb-16">
      <div className="mx-auto max-w-3xl">
        <img src={brainLogo} alt="Mathlingo brain logo" className="mx-auto w-full max-w-24 drop-shadow-2xl" />

        {!completed ? (
          <section className="cm-card mt-12 space-y-6 p-8">
            <h1 className="mx-auto max-w-2xl text-3xl font-semibold tracking-tight text-coastal-mist">{lesson.title}</h1>

            <div className="space-y-4">
              <p className="text-sm text-coastal-mist/75">
                Progreso: {currentQuestionIndex}/{totalQuestions}
              </p>
              <div className="h-4 w-full rounded-full bg-coastal-steel">
                <div
                  className="h-4 rounded-full bg-coastal-wave transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-coastal-mist/80">
              <span className="rounded-full border border-coastal-steel px-3 py-1">
                Intentos: {questionState.attempts}/{MAX_ATTEMPTS}
              </span>
              <span className="rounded-full border border-coastal-steel px-3 py-1">
                Dificultad: {currentQuestion.difficulty}
              </span>
              <span className="rounded-full border border-coastal-steel px-3 py-1">
                Tipo: {questionState.questionType === 'input' ? 'Input libre' : 'Opcion multiple'}
              </span>
              {questionState.assisted && (
                <span className="rounded-full border border-amber-500/50 bg-amber-500/15 px-3 py-1 text-amber-200">
                  Resuelto con ayuda
                </span>
              )}
            </div>

            <h2 className="text-xl font-semibold tracking-tight">{currentQuestion.question}</h2>

            <div className="space-y-3">
              <button
                type="button"
                onClick={requestHelp}
                disabled={aiLoading || questionState.locked}
                className="cm-btn-secondary inline-flex items-center px-4 py-2 text-sm"
              >
                {aiLoading ? (
                  <>
                    <span className="cm-loader mr-2" />
                    Procesando...
                  </>
                ) : questionState.helpClicks >= 1 ? (
                  'Ver explicacion completa'
                ) : (
                  'Pedir pista IA'
                )}
              </button>

              {aiError && (
                <p className="rounded-2xl border border-red-600/40 bg-red-600/10 px-4 py-3 text-sm text-red-200">
                  {aiError}
                </p>
              )}

              {aiAnswer && (
                <div className="cm-card p-4">
                  <p className="text-xs font-semibold tracking-wide text-verdant-accent">
                    {questionState.helpClicks >= 2 || questionState.locked ? 'EXPLICACION' : 'PISTA'}
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-coastal-mist">{aiAnswer}</p>
                </div>
              )}
            </div>

            {questionState.questionType === 'multiple-choice' ? (
              <div className="space-y-3">
                {currentQuestion.options.map((option, index) => {
                  const isSelected = selectedOption === index

                  return (
                    <button
                      key={`${currentQuestion.id}-${index}`}
                      type="button"
                      onClick={() => {
                        if (questionState.locked) return
                        setSelectedOption(index)
                      }}
                      disabled={questionState.locked}
                      className={`w-full rounded-2xl p-4 text-left transition-all duration-200 ${
                        isSelected
                          ? 'border border-coastal-neon/70 bg-coastal-steel'
                          : 'border border-coastal-steel bg-coastal-ocean shadow-coastal hover:bg-coastal-steel/80'
                      } ${questionState.locked ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}
                    >
                      {option}
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="space-y-3">
                <label htmlFor="free-answer" className="text-sm text-coastal-mist/80">
                  Escribe tu respuesta
                </label>
                <input
                  id="free-answer"
                  value={freeResponse}
                  onChange={(event) => {
                    if (questionState.locked) return
                    setFreeResponse(event.target.value)
                  }}
                  disabled={questionState.locked}
                  className="w-full rounded-2xl border border-coastal-steel bg-coastal-ocean px-4 py-3 text-coastal-mist outline-none transition focus:border-coastal-neon/70"
                  placeholder="Ingresa tu respuesta"
                />
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <button type="button" onClick={submitAnswer} disabled={!canSubmit} className="cm-btn-primary disabled:opacity-50">
                Comprobar
              </button>

              {canGoNext && (
                <button type="button" onClick={handleNext} className="cm-btn-secondary">
                  {currentQuestionIndex >= totalQuestions - 1 ? 'Finalizar leccion' : 'Siguiente'}
                </button>
              )}
            </div>

            {feedbackMessage && (
              <p
                className={`rounded-2xl px-4 py-3 text-sm ${
                  feedbackTone === 'success'
                    ? 'border border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                    : feedbackTone === 'error'
                      ? 'border border-red-600/40 bg-red-600/10 text-red-200'
                      : feedbackTone === 'warning'
                        ? 'border border-amber-500/40 bg-amber-500/10 text-amber-200'
                        : 'border border-coastal-steel bg-coastal-ocean text-coastal-mist'
                }`}
              >
                {feedbackMessage}
              </p>
            )}

            {revealedAnswers[currentQuestion.id] && (
              <p className="rounded-2xl border border-coastal-neon/40 bg-coastal-steel/60 px-4 py-3 text-sm text-coastal-mist">
                Respuesta correcta: <strong>{revealedAnswers[currentQuestion.id]}</strong>
              </p>
            )}
          </section>
        ) : (
          <section className="cm-card mt-12 space-y-6 p-8 text-center transition-all duration-500">
            <h2 className="mx-auto max-w-2xl text-3xl font-semibold tracking-tight text-coastal-mist">Leccion completada</h2>
            <p className="text-2xl font-semibold text-coastal-neon">+{sessionEarnedXp} XP</p>
            {leveledUp && (
              <p className="text-3xl font-semibold tracking-tight text-verdant-accent transition-all duration-500">
                Subiste a Nivel {level}
              </p>
            )}
            <div className="space-x-3">
              <button
                type="button"
                onClick={() => navigate(`/course/${lesson.courseId}`)}
                className="cm-btn-secondary"
              >
                Volver al curso
              </button>
              <Link to="/dashboard" className="cm-btn-primary">
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
