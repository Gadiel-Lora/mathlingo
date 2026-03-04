const REVIEW_BRANCHES = [
  {
    name: 'Algebra',
    description: 'Practica expresiones, ecuaciones y simplificacion estructurada.',
  },
  {
    name: 'Geometria',
    description: 'Repasa relaciones espaciales, medidas y razonamiento visual.',
  },
  {
    name: 'Trigonometria',
    description: 'Fortalece razones trigonometricas y analisis de triangulos.',
  },
  {
    name: 'Estadistica',
    description: 'Entrena lectura de datos, dispersion y medidas de tendencia.',
  },
  {
    name: 'Calculo',
    description: 'Practica ideas iniciales de variacion y modelacion avanzada.',
  },
]

function ReviewsView() {
  return (
    <section className="ml-content-stack">
      <div className="ml-search-zone">
        <input type="text" className="ml-search-input" placeholder="Buscar tema o rama para repasar..." />
      </div>

      <div className="ml-review-grid">
        {REVIEW_BRANCHES.map((branch) => (
          <article key={branch.name} className="ml-review-card">
            <h3>{branch.name}</h3>
            <p>{branch.description}</p>
            <button type="button" className="ml-card-button">
              Practicar
            </button>
          </article>
        ))}
      </div>

      <article className="ml-quick-practice">
        <div className="ml-quick-head">
          <h3>🎲 Practica rapida</h3>
          <p>Seleccion visual de parametros para una sesion breve.</p>
        </div>
        <div className="ml-quick-controls">
          <label>
            Dificultad
            <select defaultValue="media">
              <option value="baja">Baja</option>
              <option value="media">Media</option>
              <option value="alta">Alta</option>
            </select>
          </label>
          <label>
            Cantidad de ejercicios
            <select defaultValue="10">
              <option value="5">5</option>
              <option value="10">10</option>
              <option value="15">15</option>
            </select>
          </label>
          <button type="button" className="ml-card-button">
            Iniciar practica
          </button>
        </div>
      </article>
    </section>
  )
}

export default ReviewsView
