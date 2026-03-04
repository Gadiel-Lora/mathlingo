const BRANCHES = ['Algebra', 'Geometria', 'Trigonometria', 'Estadistica', 'Calculo']

function AutonomousTrack({ title }) {
  const levels = ['completed', 'completed', 'active', 'locked', 'locked']

  return (
    <article className="ml-track-card">
      <div className="ml-track-head">
        <h3>{title}</h3>
        <span>Ruta vertical</span>
      </div>
      <div className="ml-track-line">
        {levels.map((status, index) => (
          <div className="ml-track-level" key={`${title}-${index + 1}`}>
            <span className={`ml-track-dot ml-node--${status}`.trim()}>{index + 1}</span>
            <span className="ml-track-label">Nivel {index + 1}</span>
          </div>
        ))}
      </div>
    </article>
  )
}

function AutonomousView() {
  return (
    <section className="ml-content-stack">
      <div className="ml-level-card">
        <div className="ml-level-badge">🧠 AUTONOMO</div>
        <h2>Mapa por ramas</h2>
        <p>Progresion lineal de niveles con nodos conectados por rama.</p>
      </div>

      <div className="ml-track-grid">
        {BRANCHES.map((branch) => (
          <AutonomousTrack key={branch} title={branch} />
        ))}
      </div>
    </section>
  )
}

export default AutonomousView
