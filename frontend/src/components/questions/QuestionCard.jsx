import React from 'react'

const MAX_ATTEMPTS = 3

const toneClassMap = {
  success: 'border border-emerald-500/40 bg-emerald-500/10 text-emerald-200',
  error: 'border border-red-600/40 bg-red-600/10 text-red-200',
  warning: 'border border-amber-500/40 bg-amber-500/10 text-amber-200',
  neutral: 'border border-coastal-steel bg-coastal-ocean text-coastal-mist',
}

const resolveType = (question, state) => {
  if (state?.questionType) return state.questionType
  return Number(question?.difficulty) >= 4 ? 'input' : 'multiple-choice'
}

function QuestionCard({
  question,
  state,
  selectedOption,
  freeResponse,
  aiMessage,
  feedbackMessage,
  feedbackTone = 'neutral',
  loadingHelp = false,
  loadingSubmit = false,
  helpDisabled = false,
  onSelectOption,
  onChangeFreeResponse,
  onSubmit,
  onRequestHint,
  onRequestSolution,
  onNext,
}) {
  if (!question) return null

  const resolvedType = resolveType(question, state)
  const attempts = Number(state?.attempts || 0)
  const isLocked = Boolean(state?.locked)
  const assisted = Boolean(state?.assisted)
  const canSubmit = !isLocked && (resolvedType === 'input' ? String(freeResponse || '').trim().length > 0 : selectedOption !== null)

  return (
    <section className="cm-card space-y-6 p-6">
      <div className="flex flex-wrap items-center gap-3 text-xs text-coastal-mist/80">
        <span className="rounded-full border border-coastal-steel px-3 py-1">Dificultad: {question.difficulty}</span>
        <span className="rounded-full border border-coastal-steel px-3 py-1">
          Tipo: {resolvedType === 'input' ? 'Input libre' : 'Opcion multiple'}
        </span>
        {assisted && (
          <span className="rounded-full border border-amber-500/50 bg-amber-500/15 px-3 py-1 text-amber-200">Resuelto con ayuda</span>
        )}
        {isLocked && <span className="rounded-full border border-red-500/50 bg-red-500/15 px-3 py-1 text-red-200">Bloqueada</span>}
      </div>

      <div className="space-y-2">
        <p className="text-sm text-coastal-mist/80">Intentos</p>
        <div className="flex items-center gap-2">
          {Array.from({ length: MAX_ATTEMPTS }).map((_, index) => (
            <span
              key={`attempt-${index}`}
              className={`h-2.5 w-12 rounded-full ${
                index < attempts ? 'bg-coastal-neon' : 'bg-coastal-steel'
              }`}
            />
          ))}
          <span className="text-xs text-coastal-mist/70">
            {attempts}/{MAX_ATTEMPTS}
          </span>
        </div>
      </div>

      <h2 className="text-xl font-semibold tracking-tight">{question.question}</h2>

      {resolvedType === 'multiple-choice' ? (
        <div className="space-y-3">
          {(question.options || []).map((option, index) => {
            const selected = selectedOption === index
            return (
              <button
                key={`${question.id}-option-${index}`}
                type="button"
                onClick={() => onSelectOption?.(index)}
                disabled={isLocked}
                className={`w-full rounded-2xl p-4 text-left transition-all duration-200 ${
                  selected
                    ? 'border border-coastal-neon/70 bg-coastal-steel'
                    : 'border border-coastal-steel bg-coastal-ocean shadow-coastal hover:bg-coastal-steel/80'
                } ${isLocked ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}
              >
                {option}
              </button>
            )
          })}
        </div>
      ) : (
        <div className="space-y-3">
          <label htmlFor={`input-${question.id}`} className="text-sm text-coastal-mist/80">
            Escribe tu respuesta
          </label>
          <input
            id={`input-${question.id}`}
            value={freeResponse}
            onChange={(event) => onChangeFreeResponse?.(event.target.value)}
            disabled={isLocked}
            className="w-full rounded-2xl border border-coastal-steel bg-coastal-ocean px-4 py-3 text-coastal-mist outline-none transition focus:border-coastal-neon/70"
            placeholder="Ingresa tu respuesta"
          />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onRequestHint}
          disabled={isLocked || loadingHelp || helpDisabled}
          className="cm-btn-secondary px-4 py-2 text-sm disabled:opacity-60"
        >
          Pedir pista
        </button>
        <button
          type="button"
          onClick={onRequestSolution}
          disabled={isLocked || loadingHelp || helpDisabled}
          className="cm-btn-secondary px-4 py-2 text-sm disabled:opacity-60"
        >
          Ver solucion
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={!canSubmit || loadingSubmit}
          className="cm-btn-primary px-4 py-2 text-sm disabled:opacity-60"
        >
          Comprobar
        </button>
        {isLocked && (
          <button type="button" onClick={onNext} className="cm-btn-secondary px-4 py-2 text-sm">
            Siguiente
          </button>
        )}
      </div>

      {aiMessage && (
        <div className="cm-card p-4">
          <p className="text-xs font-semibold tracking-wide text-verdant-accent">{assisted ? 'EXPLICACION' : 'PISTA'}</p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-coastal-mist">{aiMessage}</p>
        </div>
      )}

      {feedbackMessage && <p className={`rounded-2xl px-4 py-3 text-sm ${toneClassMap[feedbackTone] || toneClassMap.neutral}`}>{feedbackMessage}</p>}
    </section>
  )
}

export default QuestionCard
