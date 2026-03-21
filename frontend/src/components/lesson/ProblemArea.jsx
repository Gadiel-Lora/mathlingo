function ProblemArea({
  lessonContext,
  question,
  difficulty,
  currentQuestionNumber,
  totalQuestions,
  overallProgress = 0,
  alertMessage = '',
  onHint,
  onOpenChat,
  hintDisabled = false,
  chatDisabled = false,
}) {
  const progressValue = Math.max(0, Math.min(100, Number(overallProgress || 0)))

  return (
    <section className="relative min-h-[calc(100vh-60px)] px-6 pt-6 pb-[clamp(18rem,40vh,24rem)]">
      <div className="mx-auto flex h-full max-w-6xl flex-col gap-6">
        {alertMessage && (
          <div className="rounded-2xl border border-red-500/45 bg-red-500/12 px-4 py-3 text-sm text-red-100">
            {alertMessage}
          </div>
        )}

        <header className="flex flex-wrap items-start justify-between gap-6">
          <div className="space-y-3">
            <p className="text-[11px] font-semibold tracking-[0.2em] text-coastal-neon/80">LECCION ACTIVA</p>
            <h1 className="text-3xl font-semibold tracking-tight text-coastal-mist md:text-4xl">
              {lessonContext?.lessonTitle || 'Leccion'}
            </h1>
            <p className="text-sm text-coastal-mist/75">
              {lessonContext?.gradeName || 'Grado'} | {lessonContext?.areaName || 'Area'} |{' '}
              {lessonContext?.topicName || 'Tema'}
              {lessonContext?.lessonType === 'exam' ? ' | EXAMEN' : ' | PRACTICA'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-2xl border border-coastal-neon/35 bg-coastal-midnight/60 px-4 py-3">
              <p className="text-[10px] font-semibold tracking-[0.18em] text-coastal-neon/85">DIFICULTAD</p>
              <p className="mt-1 text-2xl font-semibold text-coastal-mist">{difficulty}</p>
            </div>
            <div className="rounded-2xl border border-verdant-accent/45 bg-verdant-emerald/20 px-4 py-3">
              <p className="text-[10px] font-semibold tracking-[0.18em] text-verdant-accent/95">PROGRESO</p>
              <p className="mt-1 text-sm text-coastal-mist">
                Pregunta {currentQuestionNumber}/{totalQuestions}
              </p>
            </div>
          </div>
        </header>

        <div className="cm-progress-track">
          <div className="cm-progress-fill" style={{ width: `${progressValue}%` }} />
        </div>

        <div className="cm-card flex-1 space-y-4 p-6 md:p-8">
          <p className="text-xs font-semibold tracking-[0.16em] text-coastal-neon/85">PROBLEMA</p>
          <h2 className="text-2xl font-semibold leading-relaxed tracking-tight text-coastal-mist md:text-3xl">
            {question?.question || 'Cargando problema...'}
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => onHint?.()}
            disabled={hintDisabled}
            className="cm-btn-secondary px-5 py-2.5 text-sm disabled:opacity-60"
          >
            Hint
          </button>
          <button
            type="button"
            onClick={() => onOpenChat?.()}
            disabled={chatDisabled}
            className="cm-btn-primary px-5 py-2.5 text-sm disabled:opacity-60"
          >
            AI Chat
          </button>
        </div>
      </div>
    </section>
  )
}

export default ProblemArea
