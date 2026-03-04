const TIPS_BY_VIEW = {
  recorrido: [
    'Visualiza el avance por bimestre y detecta nodos bloqueados.',
    'Enfoca el siguiente paso en la unidad activa resaltada.',
  ],
  autonomo: [
    'Cada rama muestra una progresion lineal de niveles.',
    'Mantiene coherencia visual con el mapa de recorrido.',
  ],
  repasos: [
    'Usa la busqueda para ubicar practicas por rama.',
    'La practica rapida concentra sesiones cortas y focalizadas.',
  ],
  logros: [
    'Colecciona insignias por consistencia y finalizacion.',
    'Las insignias bloqueadas muestran metas futuras.',
  ],
  progreso: [
    'Revisa precision y tiempo para ajustar habitos.',
    'El grafico resume rendimiento reciente de forma rapida.',
  ],
  perfil: [
    'Centraliza identidad academica en una sola vista.',
    'Presenta nivel, XP, racha e insignias recientes.',
  ],
}

function RightPanel({ activeView }) {
  const tips = TIPS_BY_VIEW[activeView] || TIPS_BY_VIEW.recorrido

  return (
    <aside className="ml-right">
      <section className="ml-right-card">
        <p className="ml-right-card-title">Panel visual</p>
        <p className="ml-right-card-value">MathLingo UI</p>
        <p className="ml-right-card-muted">Diseño estatico y modular</p>
      </section>

      <section className="ml-right-card">
        <p className="ml-right-card-title">Notas</p>
        <ul className="ml-right-list">
          {tips.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
      </section>

      <section className="ml-right-card">
        <p className="ml-right-card-title">Estado</p>
        <div className="ml-right-status">
          <span className="ml-status-dot" />
          <span>Interfaz lista para iteracion visual</span>
        </div>
      </section>
    </aside>
  )
}

export default RightPanel
