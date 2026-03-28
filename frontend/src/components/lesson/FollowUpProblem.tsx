import { useState } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { Problem } from '../../types/lesson'
import { useAIStore } from '../../store/aiStore'

interface FollowUpProblemProps {
  problem: Problem
}

export default function FollowUpProblem({ problem }: FollowUpProblemProps) {
  const [answer, setAnswer] = useState('')
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null)
  const { addMessage, language } = useAIStore()

  const handleSubmit = () => {
    if (!answer.trim()) return
    const correct = answer.trim() === problem.expectedAnswer
    setIsCorrect(correct)
    if (correct) {
      toast.success('¡Excelente! Has dominado este concepto.')
      
      // P33-P35 Genuine Celebration
      addMessage({
        id: Math.random().toString(36).substring(7),
        studentId: 'sys',
        problemId: problem.id,
        role: 'ai',
        content: language === 'en' 
          ? "🎉 Amazing job! I noticed you applied the concepts perfectly. You've earned a temporary motivation multiplier! Keep it up!"
          : "🎉 ¡Impresionante! Detecté que aplicaste la estrategia perfectamente resolviéndolo tú mismo. ¡Has ganado un multiplicador de motivación temporal! Sigue así.",
        timestamp: new Date(),
        messageType: 'general'
      })
    } else {
      toast.error('Intenta de nuevo.')
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg text-left"
    >
      <p className="font-semibold text-green-800 mb-3 flex items-center gap-2">
        <span>✓</span> ¡Explicación completada! Ahora practica:
      </p>
      <div className="bg-white p-4 rounded border border-green-300 shadow-sm">
        <h4 className="font-medium text-gray-800 mb-2">{problem.title}</h4>
        <div className="text-sm text-gray-700 mb-4">
          {problem.content.map((item, idx) => (
            <div key={idx} className="mb-2">
              {item.type === 'text' && <p>{item.value}</p>}
              {item.type === 'equation' && <p className="text-center font-mono my-2">{item.value}</p>}
            </div>
          ))}
        </div>
        
        {isCorrect === true ? (
          <div className="p-2 bg-green-100 text-green-800 rounded font-semibold text-center mt-3">
            ¡Correcto!
          </div>
        ) : (
          <div className="flex items-center gap-2 mt-3">
            <input 
              type="text" 
              value={answer}
              onChange={e => setAnswer(e.target.value)}
              placeholder="Tu respuesta..."
              className="flex-1 p-2 border border-green-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            />
            <button 
              onClick={handleSubmit}
              className="px-3 py-2 bg-green-600 text-white font-medium rounded hover:bg-green-700 text-sm"
            >
              Verificar
            </button>
          </div>
        )}
      </div>
    </motion.div>
  )
}
