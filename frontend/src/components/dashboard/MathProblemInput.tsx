import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../../context/AuthContext'
import { getQuickHistory, saveQuickAttempt } from '../../lib/quickHistory'
import type { QuickAttempt } from '../../lib/quickHistory'

function validateProblem(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) return 'Escribe un problema o expresión matemática.'
  if (trimmed.length < 2) return 'El problema es demasiado corto.'
  if (trimmed.length > 500) return 'El problema es demasiado largo (máximo 500 caracteres).'
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
        setError('Debes iniciar sesión para guardar tu práctica.')
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
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-xl">
          ✏️
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-800">Práctica Rápida</h2>
          <p className="text-xs text-slate-500">
            Ingresa un problema matemático para registrarlo.{' '}
            <kbd className="rounded border border-slate-200 bg-slate-50 px-1 py-0.5 font-mono text-[10px]">
              Ctrl+Enter
            </kbd>{' '}
            para enviar.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div className="relative">
          <textarea
            id="math-problem-input"
            value={problem}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Ej: Resuelve 2x + 5 = 13, o Calcula el área de un triángulo con base 8 y altura 5..."
            rows={4}
            className={`w-full resize-none rounded-xl border px-4 py-3 text-sm font-medium text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:ring-2 ${
              error
                ? 'border-red-300 bg-red-50 focus:ring-red-200'
                : submitted
                  ? 'border-emerald-300 bg-emerald-50 focus:ring-emerald-200'
                  : 'border-slate-200 bg-slate-50 hover:border-slate-300 focus:border-indigo-300 focus:ring-indigo-100'
            }`}
            aria-label="Campo de problema matemático"
            aria-describedby={error ? 'math-input-error' : undefined}
          />
          <div className="absolute bottom-3 right-3 text-xs text-slate-400">
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
              className="flex items-center gap-2 text-sm font-medium text-red-600"
              role="alert"
            >
              <span>⚠️</span> {error}
            </motion.p>
          )}
          {submitted && (
            <motion.p
              key="success"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 text-sm font-medium text-emerald-600"
            >
              <span>✅</span> Problema registrado correctamente.
            </motion.p>
          )}
        </AnimatePresence>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-indigo-700 active:scale-95 disabled:opacity-60"
            disabled={!problem.trim()}
          >
            <span>➕</span>
            Registrar problema
          </button>
          {problem && (
            <button
              type="button"
              onClick={() => {
                setProblem('')
                setError('')
              }}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
            >
              Limpiar
            </button>
          )}
        </div>
      </form>

      {recentAttempts.length > 0 && (
        <div className="mt-6 border-t border-slate-100 pt-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">
            Últimas prácticas
          </p>
          <ul className="space-y-2">
            {recentAttempts.map((attempt) => (
              <li
                key={attempt.id}
                className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3"
              >
                <span className="mt-0.5 text-base">📝</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-700">{attempt.problem}</p>
                  <p className="mt-0.5 text-xs text-slate-400">{attempt.date}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
