const RECENT_BADGES = ['🧠 Pensamiento Formal', '📚 Constancia', '📐 Geometria Clara']

function ProfileView() {
  return (
    <section className="ml-content-stack">
      <article className="ml-profile-hero">
        <div className="ml-avatar-wrap">
          <div className="ml-avatar">ML</div>
          <button type="button" className="ml-avatar-edit" aria-label="Editar avatar">
            ✎
          </button>
        </div>

        <div className="ml-profile-copy">
          <h2>Estudiante MathLingo</h2>
          <p>2° Secundaria</p>
          <div className="ml-profile-metrics">
            <span>Nivel actual: 14</span>
            <span>XP total: 6,420</span>
            <span>Racha: 9 dias</span>
          </div>
        </div>

        <div className="ml-profile-actions">
          <button type="button" className="ml-card-button">
            Editar Perfil
          </button>
          <button type="button" className="ml-card-button is-secondary">
            Preferencias
          </button>
        </div>
      </article>

      <article className="ml-profile-badges">
        <h3>Insignias recientes</h3>
        <ul>
          {RECENT_BADGES.map((badge) => (
            <li key={badge}>{badge}</li>
          ))}
        </ul>
      </article>
    </section>
  )
}

export default ProfileView
