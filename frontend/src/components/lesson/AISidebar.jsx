function AISidebar({
  isOpen,
  onToggle,
  messages = [],
  inputValue,
  onInputChange,
  onSend,
  loading = false,
  locked = false,
  helpPenaltyPct = 0,
  isExamLesson = false,
}) {
  const panelClasses = [
    'fixed right-0 top-0 z-50 h-full w-full max-w-md transform transition-transform duration-300',
    isOpen ? 'translate-x-0' : 'translate-x-full',
  ].join(' ')

  return (
    <>
      {isOpen && (
        <button
          type="button"
          onClick={() => onToggle?.()}
          className="fixed inset-0 z-40 bg-black/40"
          aria-label="Cerrar chat"
        />
      )}
      <aside className={panelClasses} aria-hidden={!isOpen}>
        <div className="cm-card flex h-full flex-col rounded-none border-l border-coastal-steel/70 bg-coastal-ocean/95">
          <div className="flex items-center justify-between border-b border-coastal-steel/70 px-6 py-4">
            <div>
              <p className="text-xs font-semibold tracking-[0.18em] text-verdant-accent">PROFESOR VIRTUAL</p>
              <p className="text-xs text-coastal-mist/70">Penalizacion actual: -{Number(helpPenaltyPct || 0)}%</p>
            </div>
            <button
              type="button"
              onClick={() => onToggle?.()}
              className="rounded-full border border-coastal-steel px-3 py-1 text-xs text-coastal-mist/80 hover:bg-coastal-steel/60"
            >
              Cerrar
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
            {isExamLesson ? (
              <p className="rounded-2xl border border-amber-500/45 bg-amber-500/12 px-4 py-3 text-sm text-amber-100">
                Chat del profesor virtual bloqueado en esta leccion de examen.
              </p>
            ) : messages.length === 0 ? (
              <p className="text-sm text-coastal-mist/70">
                Escribe tu duda y te ayudo paso a paso. Si pides respuesta final, la pregunta se bloquea.
              </p>
            ) : (
              messages.map((entry, index) => (
                <div
                  key={'chat-' + index}
                  className={[
                    'rounded-2xl px-4 py-3 text-sm leading-6',
                    entry.role === 'assistant'
                      ? 'border border-verdant-accent/35 bg-verdant-emerald/18 text-coastal-mist'
                      : 'border border-violet-300/35 bg-violet-500/10 text-coastal-mist',
                  ].join(' ')}
                >
                  <p className="mb-1 text-xs font-semibold tracking-wide text-verdant-accent">
                    {entry.role === 'assistant' ? 'Profesor virtual' : 'Tu'}
                  </p>
                  <p className="whitespace-pre-wrap">{entry.content}</p>
                </div>
              ))
            )}
          </div>

          <div className="border-t border-coastal-steel/70 px-5 py-4">
            <div className="flex flex-wrap items-center gap-3">
              <input
                value={inputValue}
                onChange={(event) => onInputChange?.(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    onSend?.()
                  }
                }}
                disabled={loading || locked || isExamLesson}
                className="cm-input flex-1 px-4 py-3 text-sm"
                placeholder="Escribe tu mensaje al profesor virtual"
              />
              <button
                type="button"
                onClick={() => onSend?.()}
                disabled={loading || !String(inputValue || '').trim() || locked || isExamLesson}
                className="cm-btn-primary px-4 py-2 text-sm disabled:opacity-60"
              >
                {loading ? 'Enviando...' : 'Enviar'}
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}

export default AISidebar
