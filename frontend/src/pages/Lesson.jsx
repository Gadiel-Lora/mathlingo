import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import brainLogo from '../assets/brain-logo.png'
import { useProgress } from '../context/ProgressContext'
import { lessons } from '../data/lessons'

function Lesson() {
  const { id } = useParams()
  const lessonId = Number(id)
  const lesson = lessons.find((item) => item.id === lessonId)
  const { completeLesson, xp, level } = useProgress()

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [selectedOption, setSelectedOption] = useState(null)
  const [showFeedback, setShowFeedback] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [xpBeforeCompletion, setXpBeforeCompletion] = useState(null)

  useEffect(() => {
    setCurrentQuestionIndex(0)
    setSelectedOption(null)
    setShowFeedback(false)
    setCompleted(false)
    setXpBeforeCompletion(null)
  }, [lessonId])

  useEffect(() => {
    if (!completed || !Number.isInteger(lessonId) || xpBeforeCompletion !== null) return
    setXpBeforeCompletion(xp)
    completeLesson(lessonId)
  }, [completed, completeLesson, lessonId, xp, xpBeforeCompletion])

  if (!lesson) {
    return (
      <div className="min-h-screen bg-zinc-950 px-6 pt-20 pb-16 text-white">
        <div className="mx-auto max-w-3xl space-y-6 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-8 text-center shadow-lg shadow-black/30 backdrop-blur-sm">
          <h1 className="mx-auto max-w-2xl text-2xl font-semibold tracking-tight text-white">Leccion no encontrada</h1>
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

  const totalQuestions = lesson.questions.length
  const currentQuestion = lesson.questions[currentQuestionIndex]
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
                    key={`${option}-${index}`}
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
            <h2 className="mx-auto max-w-2xl text-3xl font-semibold tracking-tight text-white">🎉 Leccion completada</h2>
            <p className="text-2xl font-semibold text-indigo-400">🎉 +20 XP</p>
            {leveledUp && (
              <p className="text-3xl font-semibold tracking-tight text-emerald-400 transition-all duration-500">
                🚀 ¡Subiste a Nivel {level}!
              </p>
            )}
            <Link
              to="/dashboard"
              className="inline-block rounded-2xl bg-indigo-700 px-6 py-3 font-semibold tracking-tight transition-all duration-200 hover:translate-y-[-1px] hover:bg-indigo-600"
            >
              Volver al dashboard
            </Link>
          </section>
        )}
      </div>
    </div>
  )
}

export default Lesson
