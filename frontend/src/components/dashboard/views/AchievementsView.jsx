const BADGES = [
  { id: 'a1', icon: '🧩', name: 'Base Algebraica', state: 'unlocked' },
  { id: 'a2', icon: '📐', name: 'Geometria Clara', state: 'unlocked' },
  { id: 'a3', icon: '📈', name: 'Analisis de Datos', state: 'locked' },
  { id: 'a4', icon: '⚙️', name: 'Metodo Estructurado', state: 'unlocked' },
  { id: 'a5', icon: '🧮', name: 'Precision Numerica', state: 'locked' },
  { id: 'a6', icon: '🔍', name: 'Lectura Critica', state: 'locked' },
  { id: 'a7', icon: '🧠', name: 'Pensamiento Formal', state: 'unlocked' },
  { id: 'a8', icon: '🏅', name: 'Constancia Semanal', state: 'locked' },
  { id: 'a9', icon: '🎯', name: 'Meta de Dominio', state: 'locked' },
]

function AchievementsView() {
  return (
    <section className="ml-content-stack">
      <div className="ml-level-card">
        <div className="ml-level-badge">🏆 LOGROS</div>
        <h2>Coleccion de insignias</h2>
        <p>Estado visual de logros desbloqueados y pendientes.</p>
      </div>

      <div className="ml-badge-grid">
        {BADGES.map((badge) => (
          <article key={badge.id} className={`ml-badge-card ${badge.state === 'locked' ? 'is-locked' : ''}`.trim()}>
            <span className="ml-badge-icon" aria-hidden="true">
              {badge.icon}
            </span>
            <h3>{badge.name}</h3>
            <p>{badge.state === 'locked' ? 'Bloqueado' : 'Desbloqueado'}</p>
          </article>
        ))}
      </div>
    </section>
  )
}

export default AchievementsView
