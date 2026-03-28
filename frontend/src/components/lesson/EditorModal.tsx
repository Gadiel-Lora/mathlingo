import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { FeedbackState } from '../../types/lesson'

interface EditorModalProps {
  isOpen: boolean
  answer: string
  onChange: (value: string) => void
  onSubmit: () => void
  onClear: () => void
  feedbackState: FeedbackState
  attemptCount: number
  maxAttempts: number
  onRetry: () => void
  xpEarned?: number
  bonusEarned?: number
  timeTakenSeconds?: number
  explanation?: string
  onNext: () => void
  onSkip: () => void
}

const formatTime = (seconds: number) => {
  const safeSeconds = Math.max(0, seconds)
  const minutes = Math.floor(safeSeconds / 60)
  const remainingSeconds = String(safeSeconds % 60).padStart(2, '0')
  return `${minutes}:${remainingSeconds}`
}

export default function EditorModal({
  isOpen,
  answer,
  onChange,
  onSubmit,
  onClear,
  feedbackState,
  attemptCount,
  maxAttempts,
  onRetry,
  xpEarned = 0,
  bonusEarned = 0,
  timeTakenSeconds = 0,
  explanation,
  onNext,
  onSkip,
}: EditorModalProps) {
  if (!isOpen) {
    return null
  }

  const handlePaste = (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    event.preventDefault()
    toast.error('No puedes pegar en este campo.')
  }

  const handleContextMenu = (event: React.MouseEvent<HTMLTextAreaElement>) => {
    event.preventDefault()
  }

  const isCorrect = feedbackState.showFeedback && feedbackState.status === 'correct'
  const isError = feedbackState.showFeedback && feedbackState.status === 'incorrect'
  const isLockedOut = attemptCount >= maxAttempts

  const borderColorMap: Record<number, string> = {
    0: '#3B82F6',
    1: '#F59E0B',
    2: '#EF4444',
    3: '#64748B',
  }

  const currentBorderColor = isLockedOut
    ? borderColorMap[3]
    : isError
      ? borderColorMap[Math.min(attemptCount, 2)]
      : borderColorMap[0]

  const feedbackTone = isLockedOut
    ? 'border-gray-300 bg-gray-100 text-gray-800'
    : attemptCount === maxAttempts - 1
      ? 'border-amber-300 bg-amber-100 text-amber-800'
      : 'border-red-300 bg-red-100 text-red-800'

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 rounded-t-xl border-t border-gray-200 bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.1)]">
      <div className="mx-auto min-h-[220px] max-w-4xl p-6">
        {isCorrect ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-2 rounded-xl border-2 border-green-200 bg-green-50 p-6"
          >
            <div className="flex items-center justify-between gap-6">
              <div>
                <p className="mb-1 text-lg font-bold text-green-700">Correcto.</p>
                <p className="text-sm font-semibold text-green-700">+{xpEarned} XP</p>
                {bonusEarned > 0 && (
                  <p className="mt-1 text-sm text-green-700">Bonus rapido: +{bonusEarned} XP</p>
                )}
                <p className="mt-1 text-sm text-green-700/80">Tiempo: {formatTime(timeTakenSeconds)}</p>
              </div>
              <button
                type="button"
                onClick={onNext}
                aria-label="Ir al siguiente problema"
                className="rounded-lg bg-green-600 px-6 py-3 text-lg font-bold text-white transition-transform hover:scale-[1.02] hover:bg-green-700 active:scale-[0.98]"
              >
                Siguiente
              </button>
            </div>
          </motion.div>
        ) : (
          <>
            <div className="mb-3 flex items-center justify-between gap-4">
              <h3 className="font-semibold text-gray-700">Escribe tu respuesta:</h3>

              <div className="flex gap-2" aria-label="Intentos disponibles">
                {[1, 2, 3].map((attemptNumber) => (
                  <div
                    key={attemptNumber}
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white ${
                      attemptCount >= attemptNumber ? 'bg-red-500' : 'bg-gray-300'
                    }`}
                  >
                    {attemptNumber}
                  </div>
                ))}
              </div>
            </div>

            <motion.textarea
              value={answer}
              onChange={(event) => onChange(event.target.value)}
              onPaste={handlePaste}
              onContextMenu={handleContextMenu}
              onCopy={(event) => event.preventDefault()}
              onCut={(event) => event.preventDefault()}
              disabled={isLockedOut}
              aria-label="Respuesta del estudiante"
              placeholder={isLockedOut ? 'Has agotado tus intentos.' : 'Escribe tu respuesta aqui...'}
              className={`h-32 w-full resize-none rounded border-2 p-3 font-mono outline-none focus:ring-2 ${
                isLockedOut
                  ? 'cursor-not-allowed border-gray-400 bg-gray-50 text-gray-500 focus:ring-0'
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
                className={`mt-3 rounded border p-3 font-medium ${feedbackTone}`}
              >
                {feedbackState.message}
              </motion.div>
            )}

            {isLockedOut && explanation && (
              <div className="mt-3 rounded-lg border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-900">
                <p className="mb-1 font-semibold">Explicacion:</p>
                <p>{explanation}</p>
              </div>
            )}

            <div className="mt-4 flex items-center justify-between gap-4">
              <div className="flex gap-3">
                {isLockedOut ? (
                  <button
                    type="button"
                    onClick={onNext}
                    aria-label="Continuar al siguiente problema"
                    className="rounded bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-700"
                  >
                    Siguiente
                  </button>
                ) : isError ? (
                  <button
                    type="button"
                    onClick={onRetry}
                    aria-label="Intentar el problema de nuevo"
                    className="rounded bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700"
                  >
                    Intentar de nuevo
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={onSubmit}
                      disabled={!answer.trim()}
                      aria-label="Enviar respuesta"
                      className="cursor-pointer rounded bg-blue-600 px-6 py-2 font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
                    >
                      Enviar
                    </button>
                    <button
                      type="button"
                      onClick={onClear}
                      aria-label="Limpiar respuesta"
                      className="rounded border-2 border-gray-300 px-6 py-2 font-bold text-gray-700 hover:bg-gray-100"
                    >
                      Limpiar
                    </button>
                  </>
                )}
              </div>

              {!isCorrect && !isLockedOut && (
                <button
                  type="button"
                  onClick={onSkip}
                  aria-label="Saltar problema actual"
                  className="rounded bg-gray-200 px-4 py-2 text-sm font-semibold text-gray-800 transition-colors hover:bg-gray-300"
                >
                  Saltar
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
