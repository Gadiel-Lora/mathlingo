import { useDashboardStore } from '../../store/dashboardStore'

export default function StatisticsTable() {
  const { accuracy, totalXP, skills } = useDashboardStore()
  const inProgress = skills.filter(s => s.mastery < 100 && s.mastery > 0).length

  return (
    <section className="math-dashboard-card flex h-full flex-col overflow-hidden p-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black text-teal-700">Analitica</p>
          <h3 className="text-xl font-black text-slate-950">Metricas detalladas</h3>
        </div>
        <span className="math-formula-token">M(t)</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b-2 border-slate-100 text-xs font-black text-slate-400">
              <th className="whitespace-nowrap pb-3">Metrica</th>
              <th className="whitespace-nowrap pb-3 text-right">Valor actual</th>
              <th className="whitespace-nowrap pb-3 text-right">Cambio semanal</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            <tr className="border-b border-slate-50 transition-colors hover:bg-slate-50">
              <td className="whitespace-nowrap py-4 font-bold text-slate-700">Precision global</td>
              <td className="py-4 text-right font-black text-slate-950">{accuracy}%</td>
              <td className="whitespace-nowrap py-4 text-right font-black text-emerald-600"><span className="rounded-lg bg-emerald-50 px-2 py-1">+5%</span></td>
            </tr>
            <tr className="border-b border-slate-50 transition-colors hover:bg-slate-50">
              <td className="whitespace-nowrap py-4 font-bold text-slate-700">XP total acumulado</td>
              <td className="py-4 text-right font-black text-slate-950">{totalXP.toLocaleString()}</td>
              <td className="whitespace-nowrap py-4 text-right font-black text-emerald-600"><span className="rounded-lg bg-emerald-50 px-2 py-1">+450 XP</span></td>
            </tr>
            <tr className="border-b border-slate-50 transition-colors hover:bg-slate-50">
              <td className="whitespace-nowrap py-4 font-bold text-slate-700">Horas de estudio</td>
              <td className="py-4 text-right font-black text-slate-950">12.5h</td>
              <td className="whitespace-nowrap py-4 text-right font-black text-emerald-600"><span className="rounded-lg bg-emerald-50 px-2 py-1">+2.5h</span></td>
            </tr>
            <tr className="transition-colors hover:bg-slate-50">
              <td className="whitespace-nowrap py-4 font-bold text-slate-700">Habilidades en practica</td>
              <td className="py-4 text-right font-black text-slate-950">{inProgress}</td>
              <td className="whitespace-nowrap py-4 text-right font-black text-slate-400">-</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  )
}
