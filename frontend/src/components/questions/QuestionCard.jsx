const MAX_ATTEMPTS = 3

const toneClassMap = {
  success: 'border border-emerald-400/45 bg-emerald-500/12 text-emerald-100',
  error: 'border border-red-500/45 bg-red-500/12 text-red-100',
  warning: 'border border-amber-400/45 bg-amber-400/12 text-amber-100',
  neutral: 'border border-coastal-neon/30 bg-coastal-midnight/55 text-coastal-mist',
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
  onOpenChat,
  onNext,
}) {
  if (!question) return null

  const resolvedType = resolveType(question, state)
  const attempts = Number(state?.attempts || 0)
  const isLocked = Boolean(state?.locked)
  const assisted = Boolean(state?.assisted)
  const canSubmit = !isLocked && (resolvedType === 'input' ? String(freeResponse || '').trim().length > 0 : selectedOption !== null)

  return (
    <section className="cm-card cm-reveal relative overflow-hidden space-y-6 p-6">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-coastal-neon/70 to-transparent" />
      <div className="pointer-events-none absolute right-0 bottom-0 h-36 w-36 rounded-full bg-[radial-gradient(circle,_rgba(255,122,89,0.16),_rgba(255,122,89,0))]" />

      <div className="flex flex-wrap items-center gap-3 text-xs text-coastal-mist/80">
        <span className="cm-badge border-coastal-neon/35 bg-coastal-midnight/45 text-coastal-mist/90">Dificultad: {question.difficulty}</span>
        <span className="cm-badge border-violet-300/35 bg-violet-500/10 text-coastal-mist/90">
          Tipo: {resolvedType === 'input' ? 'Input libre' : 'Opcion multiple'}
        </span>
        {assisted && <span className="cm-badge cm-badge-locked">Resuelto con ayuda</span>}
        {isLocked && <span className="cm-badge border-red-500/50 bg-red-500/15 text-red-100">Bloqueada</span>}
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold tracking-[0.16em] text-coastal-neon/85">INTENTOS</p>
        <div className="flex items-center gap-2">
          {Array.from({ length: MAX_ATTEMPTS }).map((_, index) => (
            <span
              key={`attempt-${index}`}
              className={`h-2.5 w-14 rounded-full transition-all duration-300 ${
                index < attempts
                  ? 'bg-gradient-to-r from-coastal-neon via-violet-300 to-amber-300 shadow-[0_0_14px_rgba(97,189,248,0.5)]'
                  : 'bg-coastal-steel/90'
              }`}
            />
          ))}
          <span className="text-xs text-coastal-mist/70">
            {attempts}/{MAX_ATTEMPTS}
          </span>
        </div>
      </div>

      <h2 className="text-xl font-semibold leading-relaxed tracking-tight text-coastal-mist">{question.question}</h2>

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
                    ? 'border border-violet-300/70 bg-violet-500/12 shadow-[0_10px_26px_rgba(87,83,194,0.32)]'
                    : 'border border-coastal-steel/80 bg-coastal-ocean/80 shadow-coastal hover:-translate-y-0.5 hover:border-coastal-neon/40 hover:bg-coastal-steel/70'
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
            className="cm-input px-4 py-3 text-sm"
            placeholder="Ingresa tu respuesta"
          />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onOpenChat}
          disabled={isLocked || loadingHelp || helpDisabled}
          className="cm-btn-secondary px-4 py-2 text-sm disabled:opacity-60"
        >
          Profesor virtual
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={!canSubmit || loadingSubmit}
          className="cm-btn-primary flex items-center gap-2 px-4 py-2 text-sm disabled:opacity-60"
        >
          {loadingSubmit && <span className="cm-loader" />}
          Comprobar
        </button>
        {isLocked && (
          <button type="button" onClick={onNext} className="cm-btn-secondary px-4 py-2 text-sm">
            Siguiente
          </button>
        )}
      </div>

      {aiMessage && (
        <div className="rounded-2xl border border-verdant-accent/40 bg-verdant-emerald/18 p-4">
          <p className="text-xs font-semibold tracking-wide text-verdant-accent">PROFESOR VIRTUAL</p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-coastal-mist">{aiMessage}</p>
        </div>
      )}

      {feedbackMessage && <p className={`rounded-2xl px-4 py-3 text-sm ${toneClassMap[feedbackTone] || toneClassMap.neutral}`}>{feedbackMessage}</p>}
    </section>
  )
}

export default QuestionCard
