const STATS = [
  { label: 'Tiempo de practica', value: '12h 40m' },
  { label: 'Precision promedio', value: '86%' },
  { label: 'Lecciones completadas', value: '48' },
  { label: 'Ritmo semanal', value: '5 sesiones' },
]

const CHART_BARS = [32, 54, 47, 68, 71, 63, 79]

function ProgressView() {
  return (
    <section className="ml-content-stack">
      <article className="ml-progress-hero">
        <div>
          <p className="ml-progress-label">Progreso general</p>
          <h2>72%</h2>
        </div>
        <div className="ml-progress-track" role="img" aria-label="Barra de progreso general">
          <div className="ml-progress-fill" style={{ width: '72%' }} />
        </div>
      </article>

      <div className="ml-stat-grid">
        {STATS.map((stat) => (
          <article key={stat.label} className="ml-stat-card">
            <p>{stat.label}</p>
            <h3>{stat.value}</h3>
          </article>
        ))}
      </div>

      <article className="ml-chart-card">
        <div className="ml-chart-head">
          <h3>Actividad semanal</h3>
          <p>Grafico placeholder</p>
        </div>
        <div className="ml-chart">
          {CHART_BARS.map((height, index) => (
            <div key={`bar-${index + 1}`} className="ml-chart-col">
              <span style={{ height: `${height}%` }} />
            </div>
          ))}
        </div>
      </article>
    </section>
  )
}

export default ProgressView
