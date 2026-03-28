import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import Navbar from './Navbar'
import ProblemArea from './ProblemArea'
import EditorModal from './EditorModal'
import AISidebar from './AISidebar'
import LessonCompletionView from './LessonCompletionView'
import { useLessonStore } from '../../store/lessonStore'
import { useAIStore } from '../../store/aiStore'

const successDelayMs = 2000

const getTimeSpentInSeconds = (problemStartTime: number) =>
  Math.max(1, Math.floor((Date.now() - problemStartTime) / 1000))

export default function LessonView() {
  const {
    currentProblem,
    problemIndex,
    totalProblems,
    answer,
    setAnswer,
    feedbackState,
    attemptCount,
    maxAttempts,
    totalXp,
    clearFeedback,
    resetLesson,
    submitAnswer,
    skipProblem,
    moveToNextProblem,
    goToNextLesson,
  } = useLessonStore()

  const { sidebarOpen, toggleSidebar } = useAIStore()

  const [problemStartTime, setProblemStartTime] = useState(Date.now())
  const [xpEarned, setXpEarned] = useState(0)
  const [bonusEarned, setBonusEarned] = useState(0)
  const [timeTakenSeconds, setTimeTakenSeconds] = useState(0)
  const [showSuccessAnim, setShowSuccessAnim] = useState(false)
  const [solvedCorrect, setSolvedCorrect] = useState(0)
  const [solvedIncorrect, setSolvedIncorrect] = useState(0)
  const [skippedProblems, setSkippedProblems] = useState(0)
  const [timeSpentTotal, setTimeSpentTotal] = useState(0)
  const nextTimeoutRef = useRef<number | null>(null)

  useEffect(() => {
    resetLesson()
    setProblemStartTime(Date.now())
    setXpEarned(0)
    setBonusEarned(0)
    setTimeTakenSeconds(0)
    setShowSuccessAnim(false)
    setSolvedCorrect(0)
    setSolvedIncorrect(0)
    setSkippedProblems(0)
    setTimeSpentTotal(0)

    return () => {
      if (nextTimeoutRef.current !== null) {
        window.clearTimeout(nextTimeoutRef.current)
      }
    }
  }, [resetLesson])

  useEffect(() => {
    const handlePopState = () => {
      window.history.pushState(null, '', window.location.href)
      toast.error('No puedes regresar a problemas anteriores.')
    }

    window.history.pushState(null, '', window.location.href)
    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [])

  const clearNextTimeout = () => {
    if (nextTimeoutRef.current !== null) {
      window.clearTimeout(nextTimeoutRef.current)
      nextTimeoutRef.current = null
    }
  }

  const resetTransientUi = () => {
    setXpEarned(0)
    setBonusEarned(0)
    setTimeTakenSeconds(0)
    setShowSuccessAnim(false)
    setProblemStartTime(Date.now())
  }

  const handleOpenAISidebar = () => {
    if (!sidebarOpen) {
      toggleSidebar()
    }
  }

  const handleNextProblem = async () => {
    clearNextTimeout()
    await moveToNextProblem()
    resetTransientUi()
  }

  const handleRetry = () => {
    setAnswer('')
    clearFeedback()
  }

  const handleSkip = async () => {
    if (!currentProblem) {
      return
    }

    clearNextTimeout()
    const timeSpent = getTimeSpentInSeconds(problemStartTime)
    await skipProblem()
    setSkippedProblems((value) => value + 1)
    setTimeSpentTotal((value) => value + timeSpent)
    resetTransientUi()
    toast.message('Problema saltado. Recibes otro problema.')
  }

  const handleSubmit = async () => {
    if (!currentProblem || !answer.trim()) {
      return
    }

    const timeSpent = getTimeSpentInSeconds(problemStartTime)
    const nextAttempt = attemptCount + 1
    const { correct, xp } = await submitAnswer(answer, timeSpent)

    if (correct) {
      const bonus = Math.max(0, xp - 100)
      setXpEarned(xp)
      setBonusEarned(bonus)
      setTimeTakenSeconds(timeSpent)
      setSolvedCorrect((value) => value + 1)
      setTimeSpentTotal((value) => value + timeSpent)
      setShowSuccessAnim(true)

      clearNextTimeout()
      nextTimeoutRef.current = window.setTimeout(() => {
        setShowSuccessAnim(false)
        void handleNextProblem()
      }, successDelayMs)

      return
    }

    if (nextAttempt >= maxAttempts) {
      setSolvedIncorrect((value) => value + 1)
      setTimeSpentTotal((value) => value + timeSpent)
    }
  }

  const completionStats = useMemo(
    () => ({
      totalProblems,
      solvedCorrect,
      solvedIncorrect,
      skipped: skippedProblems,
      accuracy: totalProblems > 0 ? Math.round((solvedCorrect / totalProblems) * 100) : 0,
      totalXp,
      timeSpent: timeSpentTotal,
      skillProgress: 65,
      nextSkill: 'Fracciones avanzadas',
    }),
    [skippedProblems, solvedCorrect, solvedIncorrect, timeSpentTotal, totalProblems, totalXp],
  )

  const showCompletion = currentProblem === null && problemIndex >= totalProblems

  if (showCompletion) {
    return <LessonCompletionView stats={completionStats} onNextLesson={goToNextLesson} />
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar
        lessonName="Fracciones basicas"
        currentProblemIndex={problemIndex}
        totalProblems={totalProblems}
      />

      <main className="min-h-screen pt-[60px]">
        <ProblemArea
          problem={currentProblem}
          onAiChatClick={handleOpenAISidebar}
          onHintClick={handleOpenAISidebar}
        />

        <EditorModal
          isOpen
          answer={answer}
          onChange={setAnswer}
          onSubmit={handleSubmit}
          onClear={() => setAnswer('')}
          feedbackState={feedbackState}
          attemptCount={attemptCount}
          maxAttempts={maxAttempts}
          onRetry={handleRetry}
          xpEarned={xpEarned}
          bonusEarned={bonusEarned}
          timeTakenSeconds={timeTakenSeconds}
          explanation={currentProblem?.explanation}
          onNext={handleNextProblem}
          onSkip={handleSkip}
        />

        <AISidebar />

        {showSuccessAnim && (
          <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: [1, 1.08, 1] }}
              transition={{ duration: 0.6 }}
              className="rounded-xl bg-green-500 px-6 py-4 text-2xl font-bold text-white shadow-xl"
            >
              Correcto
            </motion.div>
          </div>
        )}
      </main>
    </div>
  )
}
