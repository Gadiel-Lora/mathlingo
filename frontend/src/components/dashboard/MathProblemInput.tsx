import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../../context/AuthContext'
import { getQuickHistory, saveQuickAttempt } from '../../lib/quickHistory'
import type { QuickAttempt } from '../../lib/quickHistory'

function validateProblem(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) return 'Escribe un problema o expresion matematica.'
  if (trimmed.length < 2) return 'El problema es demasiado corto.'
  if (trimmed.length > 500) return 'El problema es demasiado largo. Maximo 500 caracteres.'
  return null
}

export default function MathProblemInput() {
  const { user } = useAuth()
  const [problem, setProblem] = useState('')
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [recentAttempts, setRecentAttempts] = useState<QuickAttempt[]>(() =>
    user?.id ? getQuickHistory(user.id).slice(0, 3) : [],
  )

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      setError('')

      const validationError = validateProblem(problem)
      if (validationError) {
        setError(validationError)
        return
      }

      if (!user?.id) {
        setError('Debes iniciar sesion para guardar tu practica.')
        return
      }

      const attempt: QuickAttempt = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        problem: problem.trim(),
        submittedAt: new Date().toISOString(),
        date: new Date().toLocaleDateString('es-ES', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        }),
      }

      saveQuickAttempt(user.id, attempt)
      setRecentAttempts(getQuickHistory(user.id).slice(0, 3))
      setProblem('')
      setSubmitted(true)
      setTimeout(() => setSubmitted(false), 3000)
    },
    [problem, user?.id],
  )

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setProblem(e.target.value)
      if (error) setError('')
      if (submitted) setSubmitted(false)
    },
    [error, submitted],
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault()
        handleSubmit(e as any)
      }
    },
    [handleSubmit],
  )

  return (
    <section className="math-dashboard-card p-6">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-black text-teal-700">Practica rapida</p>
          <h2 className="mt-1 text-xl font-black text-slate-950">Banco de problemas</h2>
          <p className="mt-1 text-sm font-medium text-slate-500">
            Guarda ejercicios para revisar patrones de error y progreso.
          </p>
        </div>
        <span className="math-formula-token">2x + 5 = 13</span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div className="relative">
          <textarea
            id="math-problem-input"
            value={problem}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Ej: Resuelve 2x + 5 = 13, calcula A = (b*h)/2 con b=8 y h=5..."
            rows={4}
            className={`w-full resize-none rounded-lg border px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:ring-2 ${
              error
                ? 'border-red-300 bg-red-50 focus:ring-red-200'
                : submitted
                  ? 'border-emerald-300 bg-emerald-50 focus:ring-emerald-200'
                  : 'border-slate-200 bg-white hover:border-teal-300 focus:border-teal-400 focus:ring-teal-100'
            }`}
            aria-label="Campo de problema matematico"
            aria-describedby={error ? 'math-input-error' : undefined}
          />
          <div className="absolute bottom-3 right-3 rounded bg-white/80 px-2 py-0.5 text-xs font-bold text-slate-400">
            {problem.length}/500
          </div>
        </div>

        <AnimatePresence mode="wait">
          {error && (
            <motion.p
              key="error"
              id="math-input-error"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-sm font-bold text-red-600"
              role="alert"
            >
              {error}
            </motion.p>
          )}
          {submitted && (
            <motion.p
              key="success"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-sm font-bold text-emerald-700"
            >
              Problema registrado correctamente.
            </motion.p>
          )}
        </AnimatePresence>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            className="cm-btn-primary px-5 py-2.5 text-sm"
            disabled={!problem.trim()}
          >
            Registrar problema
          </button>
          {problem && (
            <button
              type="button"
              onClick={() => {
                setProblem('')
                setError('')
              }}
              className="cm-btn-secondary px-4 py-2.5 text-sm"
            >
              Limpiar
            </button>
          )}
        </div>
      </form>

      {recentAttempts.length > 0 && (
        <div className="mt-6 border-t border-slate-100 pt-5">
          <p className="mb-3 text-xs font-black text-slate-400">Ultimas practicas</p>
          <ul className="space-y-2">
            {recentAttempts.map((attempt) => (
              <li
                key={attempt.id}
                className="flex items-start gap-3 rounded-lg border border-slate-100 bg-white px-4 py-3"
              >
                <span className="math-formula-token mt-0.5 min-h-0 px-2 py-1">fx</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-slate-700">{attempt.problem}</p>
                  <p className="mt-0.5 text-xs font-medium text-slate-400">{attempt.date}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
