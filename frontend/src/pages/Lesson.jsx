import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import brainLogo from '../assets/brain-logo.png'

const lessons = [
  {
    id: 1,
    title: 'Sumas basicas',
    questions: [
      {
        question: 'Cuanto es 2 + 3?',
        options: ['4', '5', '6', '3'],
        correctIndex: 1,
      },
      {
        question: 'Cuanto es 7 + 1?',
        options: ['6', '8', '9', '7'],
        correctIndex: 1,
      },
    ],
  },
]

function Lesson() {
  const { id } = useParams()
  const lessonId = Number(id)
  const lesson = lessons.find((item) => item.id === lessonId)

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [selectedOption, setSelectedOption] = useState(null)
  const [showFeedback, setShowFeedback] = useState(false)
  const [completed, setCompleted] = useState(false)

  if (!lesson) {
    return (
      <div className="min-h-screen bg-zinc-950 px-6 py-12 text-white">
        <div className="mx-auto max-w-3xl rounded-2xl bg-zinc-900 p-8 text-center">
          <h1 className="text-2xl font-bold">Leccion no encontrada</h1>
          <Link
            to="/dashboard"
            className="mt-6 inline-block rounded-xl bg-blue-600 px-6 py-3 font-semibold transition-all duration-200 hover:bg-blue-500"
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
    <div className="min-h-screen bg-zinc-950 px-6 py-12 text-white">
      <div className="mx-auto max-w-3xl">
        <img src={brainLogo} alt="Mathlingo brain logo" className="mx-auto w-full max-w-24 drop-shadow-2xl" />

        {!completed ? (
          <section className="mt-8 rounded-2xl bg-zinc-900 p-8">
            <h1 className="text-3xl font-bold tracking-tight">{lesson.title}</h1>

            <div className="mt-6">
              <p className="mb-3 text-sm text-zinc-400">
                Progreso: {currentQuestionIndex}/{totalQuestions}
              </p>
              <div className="h-4 w-full rounded-full bg-zinc-800">
                <div
                  className="h-4 rounded-full bg-blue-600 transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <h2 className="mt-8 text-xl font-semibold">{currentQuestion.question}</h2>

            <div className="mt-6 space-y-3">
              {currentQuestion.options.map((option, index) => {
                const isSelected = selectedOption === index
                const isCorrect = currentQuestion.correctIndex === index
                const selectedWrong = showFeedback && isSelected && !isCorrect
                const shouldHighlightCorrect = showFeedback && isCorrect

                let stateClass = 'bg-zinc-900 hover:bg-zinc-800'
                if (selectedWrong) stateClass = 'bg-red-600 hover:bg-red-600'
                if (shouldHighlightCorrect) stateClass = 'bg-green-600 hover:bg-green-600'

                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => handleOptionClick(index)}
                    disabled={showFeedback}
                    className={`w-full rounded-xl p-4 text-left transition-all duration-200 ${stateClass} ${
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
                className="mt-6 rounded-xl bg-blue-600 px-6 py-3 font-semibold transition-all duration-200 hover:bg-blue-500"
              >
                Siguiente
              </button>
            )}
          </section>
        ) : (
          <section className="mt-8 rounded-2xl bg-zinc-900 p-8 text-center">
            <h2 className="text-3xl font-bold">🎉 Leccion completada</h2>
            <Link
              to="/dashboard"
              className="mt-6 inline-block rounded-xl bg-blue-600 px-6 py-3 font-semibold transition-all duration-200 hover:bg-blue-500"
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
