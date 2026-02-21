import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import brainLogo from '../assets/brain-logo.png'
import { useProgress } from '../context/ProgressContext'
import { getLessonById, getQuestionsByLessonId } from '../lib/courses'

function Lesson() {
  const navigate = useNavigate()
  const { id } = useParams()
  const lessonId = Number(id)
  const { completeLesson, xp, level } = useProgress()

  const [lesson, setLesson] = useState(null)
  const [questions, setQuestions] = useState([])
  const [loadingLesson, setLoadingLesson] = useState(true)
  const [lessonError, setLessonError] = useState('')

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
      if (!Number.isInteger(lessonId) || lessonId <= 0) {
        if (isMounted) {
          setLessonError('Leccion no valida.')
          setLoadingLesson(false)
        }
        return
      }

      try {
        setLoadingLesson(true)
        setLessonError('')

        const [lessonData, questionData] = await Promise.all([getLessonById(lessonId), getQuestionsByLessonId(lessonId)])
        if (!isMounted) return

        if (!lessonData) {
          setLesson(null)
          setQuestions([])
          setLessonError('Leccion no encontrada.')
          return
        }

        setLesson(lessonData)
        setQuestions(questionData)
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
    setCurrentQuestionIndex(0)
    setSelectedOption(null)
    setShowFeedback(false)
    setCompleted(false)
    setXpBeforeCompletion(null)
    setAiLoading(false)
    setAiAnswer('')
    setAiError('')
  }, [lessonId])

  useEffect(() => {
    if (!completed || !Number.isInteger(lessonId) || xpBeforeCompletion !== null) return
    setXpBeforeCompletion(xp)
    void completeLesson(lessonId)
  }, [completed, completeLesson, lessonId, xp, xpBeforeCompletion])

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

      const response = await fetch('http://localhost:4000/api/ai-help', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: currentQuestion.question,
          lessonContext,
        }),
      })

      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload?.error || 'No se pudo obtener ayuda de IA.')
      }

      setAiAnswer(String(payload?.answer || '').trim())
    } catch (error) {
      setAiError(error?.message || 'Error de red al consultar ayuda IA.')
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
