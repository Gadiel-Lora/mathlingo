import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import Navbar from './Navbar'
import ProblemArea from './ProblemArea'
import EditorModal from './EditorModal'
import AISidebar from './AISidebar'
import LessonCompletionView from './LessonCompletionView'
import { useLessonStore } from '../../store/lessonStore'

export default function LessonView() {
  const { 
    currentProblem, 
    problemIndex, 
    totalProblems,
    answer, 
    setAnswer, 
    feedbackState,
    setFeedbackState,
    attemptCount,
    maxAttempts,
    toggleAISidebar 
  } = useLessonStore()

  const [problemStartTime, setProblemStartTime] = useState(Date.now())
  const [xpEarned, setXpEarned] = useState(0)
  const [bonusEarned, setBonusEarned] = useState(0)
  const [timeTakenSeconds, setTimeTakenSeconds] = useState(0)
  const [showSuccessAnim, setShowSuccessAnim] = useState(false)

  // Prevenir atrás del navegador (P10)
  useEffect(() => {
    window.history.pushState(null, '', window.location.href)
    
    const handlePopState = () => {
      window.history.pushState(null, '', window.location.href)
      toast.error('No puedes regresar a problemas anteriores')
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  // For testing purposes during P1-P2, we inject a dummy problem if null
  useEffect(() => {
    // Only init if problemIndex is 0
    if (useLessonStore.getState().problemIndex === 0) {
      useLessonStore.setState({
        currentProblem: {
          id: "prob-001",
          title: "Suma de Fracciones",
          content: [
            { type: "text", value: "Suma las siguientes fracciones:" },
            { type: "equation", value: "\\frac{1}{2} + \\frac{1}{3}" },
            { type: "image", url: "https://placehold.co/600x200/png?text=Fracciones+visuales", alt: "Fracciones visuales" }
          ],
          expectedAnswer: "5/6",
          skillId: "fractions-basic"
        },
        problemIndex: 0,
        totalProblems: 5
      })
      setProblemStartTime(Date.now())
    }
  }, [])

  const handleNextProblem = () => {
    console.log('Siguiente problema (P8/P11)')
    useLessonStore.setState(state => ({ problemIndex: state.problemIndex + 1 }))
  }

  const handleSkip = () => {
    // P9 Skip Problem Logic
    console.log('Guardar intento como "skipped"')
    
    // Obtener "otro" problema (no avanza el índice total)
    useLessonStore.setState({
      currentProblem: {
        id: "prob-002",
        title: "Suma de Fracciones - Alternativo",
        content: [
          { type: "text", value: "Suma las siguientes fracciones (problema alternativo tras saltar):" },
          { type: "equation", value: "\\frac{1}{4} + \\frac{2}{4}" }
        ],
        expectedAnswer: "3/4",
        skillId: "fractions-basic"
      },
      attemptCount: 0
    })
    
    // Reset state
    setAnswer('')
    setFeedbackState({ status: 'none', message: '', attemptNumber: 1, showFeedback: false })
    setProblemStartTime(Date.now())
  }

  const handleSubmit = () => {
    if (answer.trim() === currentProblem?.expectedAnswer) {
      // P7 Correct Flow
      const timeToSolve = Date.now() - problemStartTime
      const xpBase = 100
      const bonus = timeToSolve < 120000 ? 50 : 0
      const totalXp = xpBase + bonus
      
      setXpEarned(totalXp)
      setBonusEarned(bonus)
      setTimeTakenSeconds(Math.floor(timeToSolve / 1000))
      setShowSuccessAnim(true)
      
      setFeedbackState({
        status: 'correct',
        message: '¡Correcto!',
        attemptNumber: attemptCount,
        showFeedback: true
      })
      // Auto-move after 2.5s
      setTimeout(() => {
        setShowSuccessAnim(false)
        handleNextProblem()
        setAnswer('')
        setFeedbackState({ status: 'none', message: '', attemptNumber: 1, showFeedback: false })
      }, 2500)
    } else {
      // P6 Incorrect Flow
      const nextAttempt = attemptCount + 1
      
      let msg = 'Respuesta incorrecta.'
      if (nextAttempt === 1) msg = 'Intenta de nuevo.'
      else if (nextAttempt === 2) msg = '⚠️ Última oportunidad.'
      else if (nextAttempt >= 3) msg = 'Has agotado tus intentos. Revisemos la explicación.'

      useLessonStore.setState({ attemptCount: nextAttempt })
      
      setFeedbackState({ 
        status: 'incorrect', 
        message: msg, 
        attemptNumber: nextAttempt, 
        showFeedback: true 
      })
    }
  }

  // Display Completion View if lesson is finished
  if (totalProblems > 0 && problemIndex >= totalProblems) {
    const mockStats = {
      totalProblems: 5,
      solvedCorrect: 4,
      solvedIncorrect: 1,
      skipped: 0,
      accuracy: 80,
      totalXp: 450,
      timeSpent: 1200, 
      skillProgress: 65,
      nextSkill: "Fracciones Avanzadas"
    }

    return (
      <LessonCompletionView 
        stats={mockStats} 
        onNextLesson={() => console.log('Siguiente lección triggereada')} 
      />
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pt-[60px] overflow-hidden">
      <Navbar 
        lessonName="Introducción a Fracciones" 
        currentProblemIndex={problemIndex} 
        totalProblems={totalProblems} 
      />
      
      <main className="flex-1 relative">
        <ProblemArea 
          problem={currentProblem} 
          onAiChatClick={toggleAISidebar}        // Trigger: Click en botón "💬 AI Tutor"
          onHintClick={toggleAISidebar}          // Trigger: Click en botón "[?] HINT"
        />
        
        <EditorModal 
          isOpen={true} 
          answer={answer}
          onChange={setAnswer}
          onSubmit={handleSubmit}
          onClear={() => setAnswer('')}
          onClose={() => {}} // NO puede cerrar
          feedbackState={feedbackState}
          attemptCount={attemptCount}
          maxAttempts={maxAttempts}
          onRetry={() => {
            setAnswer('')
            setFeedbackState({ ...feedbackState, showFeedback: false, status: 'none', message: '' })
          }}
          xpEarned={xpEarned}
          bonusEarned={bonusEarned}
          timeTakenSeconds={timeTakenSeconds}
          onNext={handleNextProblem}
          onSkip={handleSkip}
        />
        
        <AISidebar />

        {/* --- P7 Success Animations --- */}
        {showSuccessAnim && (
          <>
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 flex items-center justify-center z-[60] pointer-events-none"
            >
              <motion.div
                initial={{ scale: 1 }}
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 0.6 }}
                className="bg-green-500 text-white px-8 py-5 rounded-2xl shadow-2xl text-4xl font-extrabold"
              >
                ✓ ¡Correcto!
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 0, x: 0, scale: 0.5 }}
              animate={{ opacity: 1, y: -200, x: 100, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
              className="fixed right-10 bottom-40 z-[60] text-3xl font-extrabold text-green-500 pointer-events-none drop-shadow-md"
            >
              +{xpEarned} XP 🎉
            </motion.div>
          </>
        )}
      </main>
    </div>
  )
}

