import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { FeedbackState } from '../../types/lesson'

interface EditorModalProps {
  isOpen: boolean
  answer: string
  onChange: (val: string) => void
  onSubmit: () => void
  onClear: () => void
  onClose: () => void
  feedbackState: FeedbackState
  attemptCount: number
  maxAttempts: number
  onRetry: () => void
  xpEarned?: number
  bonusEarned?: number
  timeTakenSeconds?: number
  onNext?: () => void
  onSkip?: () => void
}

export default function EditorModal({ 
  isOpen, answer, onChange, onSubmit, onClear, onClose, feedbackState, attemptCount, maxAttempts, onRetry, xpEarned = 0, bonusEarned = 0, timeTakenSeconds = 0, onNext, onSkip 
}: EditorModalProps) {
  if (!isOpen) return null

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    toast.error('No puedes pegar')
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault() 
  }

  const isError = feedbackState.showFeedback && feedbackState.status === 'incorrect'
  const isCorrect = feedbackState.showFeedback && feedbackState.status === 'correct'
  const isLockedOut = attemptCount >= maxAttempts

  const attemptColorMap: Record<number, string> = {
    0: '#3B82F6', // Azul inicial
    1: '#FBBF24', // Amarillo aviso
    2: '#EF4444', // Rojo crítico
    3: '#64748B'  // Gris bloqueado
  }
  const currentBorderColor = isError ? attemptColorMap[Math.min(attemptCount, 3)] : attemptColorMap[0]
  
  // Clases dinámicas del contenedor de error
  let errorBg = 'bg-red-100 border-red-300 text-red-800'
  if (attemptCount === 1) errorBg = 'bg-amber-100 border-amber-300 text-amber-800'
  if (isLockedOut) errorBg = 'bg-gray-100 border-gray-300 text-gray-800'


  return (
    <div className="fixed bottom-0 inset-x-0 z-30 bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.1)] rounded-t-xl border-t border-gray-200">
      <div className="max-w-4xl mx-auto p-6 min-h-[200px]">
        {isCorrect ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 bg-green-50 border-2 border-green-200 rounded-xl mt-2"
          >
            <div className="flex justify-between items-center">
              <div>
                <p className="text-green-700 font-bold text-lg mb-1">¡Correcto, excelente trabajo!</p>
                <p className="text-sm font-semibold text-green-600">
                  +{xpEarned} XP {bonusEarned > 0 && <span className="ml-2 bg-green-200 text-green-800 px-2 py-0.5 rounded-full text-xs">+ Bonus rápido ⚡</span>}
                </p>
                <p className="text-sm text-green-600/80 mt-1 font-medium">
                  ⏱️ Tiempo: {Math.floor(timeTakenSeconds / 60)}:{String(timeTakenSeconds % 60).padStart(2, '0')}
                </p>
              </div>
              <button
                onClick={onNext}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-md font-bold text-lg transition-transform hover:scale-105 active:scale-95"
              >
                Siguiente →
              </button>
            </div>
          </motion.div>
        ) : (
          <>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-gray-700 font-semibold">Escribe tu respuesta:</h3>
              
              {/* Progress Indicator */}
              <div className="flex gap-2">
                {[1, 2, 3].map(num => (
                  <div
                    key={num}
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white transition-colors duration-300 ${
                      attemptCount >= num ? 'bg-red-500' : 'bg-gray-300'
                    }`}
                  >
                    {num}
                  </div>
                ))}
              </div>
            </div>
            
            <motion.textarea
              value={answer}
              onChange={(e) => onChange(e.target.value)}
              onPaste={handlePaste}
              onContextMenu={handleContextMenu}
              onCopy={(e) => e.preventDefault()}
              onCut={(e) => e.preventDefault()}
              disabled={isLockedOut}
              placeholder={isLockedOut ? "Has agotado tus intentos." : "Escribe tu respuesta aquí..."}
              className={`w-full h-32 p-3 border-2 rounded resize-none focus:outline-none focus:ring-2 font-mono outline-none ${
                isLockedOut 
                  ? 'bg-gray-50 text-gray-500 cursor-not-allowed border-gray-400 focus:ring-0' 
                  : 'focus:ring-blue-600'
              }`}
              initial={{ borderColor: '#3B82F6' }}
              animate={{ borderColor: currentBorderColor }}
              transition={{ duration: 0.3 }}
            />

            {isError && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`mt-3 p-3 border rounded font-medium ${errorBg}`}
              >
                {feedbackState.message}
              </motion.div>
            )}

            <div className="mt-4 flex justify-between items-center">
              <div className="flex gap-3">
                {isLockedOut ? (
                  <button 
                    onClick={() => console.log('Siguiente leccion / Ver explicacion P26')} 
                    className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 font-semibold shadow-sm"
                  >
                    Ver explicación
                  </button>
                ) : isError ? (
                  <button 
                    onClick={onRetry} 
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-semibold shadow-sm"
                  >
                    Intentar de nuevo
                  </button>
                ) : (
                  <>
                    <button 
                      onClick={onSubmit} 
                      disabled={!answer.trim()}
                      className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 font-bold shadow-sm cursor-pointer disabled:cursor-not-allowed"
                    >
                      Enviar
                    </button>
                    <button 
                      onClick={onClear} 
                      className="px-6 py-2 border-2 border-gray-300 text-gray-700 rounded hover:bg-gray-100 font-bold"
                    >
                      Limpiar
                    </button>
                  </>
                )}
              </div>
              
              {!isCorrect && (
                <button
                  onClick={onSkip}
                  className="px-4 py-2 text-sm bg-gray-200 text-gray-800 rounded hover:bg-gray-300 font-semibold transition-colors"
                >
                  ⏭️ Saltar
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

