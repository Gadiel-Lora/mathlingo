import { useDashboardStore } from '../../store/dashboardStore'

export default function Recommendations() {
  const { recommendations } = useDashboardStore()

  if (!recommendations.length) return null
  const rec = recommendations[0]

  return (
    <section className="math-dashboard-card flex h-full flex-col justify-center p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black text-teal-700">Siguiente mejor paso</p>
          <h3 className="text-lg font-black text-slate-950">Recomendacion principal</h3>
        </div>
        <span className="math-formula-token">argmax</span>
      </div>

      <div className="flex-1 rounded-lg border border-slate-100 bg-white p-5">
        <p className="text-lg font-black text-slate-950">{rec.skill}</p>
        <p className="mt-1 text-sm font-semibold leading-snug text-slate-600">{rec.reason}</p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span className="rounded bg-teal-50 px-2 py-1 text-[10px] font-black text-teal-700">
            Dificultad: {rec.difficulty}
          </span>
          <span className="rounded bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-500">
            Tiempo: {rec.estimatedTime} min
          </span>
        </div>
      </div>

      <div className="mt-5 flex gap-3">
        <button className="cm-btn-primary flex-1 px-4 py-2.5 text-sm">
          Practicar ahora
        </button>
        <button className="cm-btn-secondary px-4 py-2.5 text-sm">
          Omitir
        </button>
      </div>
    </section>
  )
}
