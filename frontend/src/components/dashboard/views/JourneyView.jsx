const BIMESTERS = [
  {
    id: 'b1',
    label: 'Bimestre 1',
    nodes: ['completed', 'completed', 'active', 'locked'],
  },
  {
    id: 'b2',
    label: 'Bimestre 2',
    nodes: ['locked', 'locked', 'locked', 'locked'],
  },
  {
    id: 'b3',
    label: 'Bimestre 3',
    nodes: ['locked', 'locked', 'locked', 'locked'],
  },
  {
    id: 'b4',
    label: 'Bimestre 4',
    nodes: ['locked', 'locked', 'locked', 'locked'],
  },
]

function JourneyNode({ status, index }) {
  return (
    <div className="ml-node-wrap">
      <div className={`ml-node ml-node--${status}`.trim()}>
        <span>{index + 1}</span>
      </div>
      <p className="ml-node-label">Unidad {index + 1}</p>
    </div>
  )
}

function JourneyView() {
  return (
    <section className="ml-content-stack">
      <div className="ml-level-card">
        <div className="ml-level-badge">🟢 SECUNDARIA</div>
        <h2>1ro Secundaria</h2>
        <p>Estructura visual de progresion por bimestres y unidades.</p>
      </div>

      <div className="ml-bimester-grid">
        {BIMESTERS.map((bimester) => (
          <article className="ml-bimester-card" key={bimester.id}>
            <div className="ml-bimester-head">
              <h3>{bimester.label}</h3>
              <span>4 nodos</span>
            </div>
            <div className="ml-node-row">
              {bimester.nodes.map((status, index) => (
                <JourneyNode key={`${bimester.id}-${index + 1}`} status={status} index={index} />
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

export default JourneyView
