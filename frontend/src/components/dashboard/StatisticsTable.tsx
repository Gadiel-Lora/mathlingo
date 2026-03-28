import { useDashboardStore } from '../../store/dashboardStore'

export default function StatisticsTable() {
  const { accuracy, totalXP, skills } = useDashboardStore()
  const inProgress = skills.filter(s => s.mastery < 100 && s.mastery > 0).length

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col h-full overflow-hidden">
      <h3 className="font-bold text-slate-800 mb-5 flex items-center gap-2 text-xl">
        <span>📊</span> Métricas Detalladas
      </h3>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b-2 border-slate-100 text-slate-400 text-xs uppercase tracking-wider">
              <th className="pb-3 font-semibold whitespace-nowrap">Métrica</th>
              <th className="pb-3 font-semibold text-right whitespace-nowrap">Valor actual</th>
              <th className="pb-3 font-semibold text-right whitespace-nowrap">Cambio Semanal</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            <tr className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
              <td className="py-4 font-semibold text-slate-700 whitespace-nowrap">Precisión Global</td>
              <td className="py-4 text-right font-black text-slate-900">{accuracy}%</td>
              <td className="py-4 text-right font-bold text-emerald-500 whitespace-nowrap"><span className="bg-emerald-50/50 rounded-lg px-2 py-1">+5%</span></td>
            </tr>
            <tr className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
              <td className="py-4 font-semibold text-slate-700 whitespace-nowrap">XP Total Acumulado</td>
              <td className="py-4 text-right font-black text-slate-900">{totalXP.toLocaleString()}</td>
              <td className="py-4 text-right font-bold text-emerald-500 whitespace-nowrap"><span className="bg-emerald-50/50 rounded-lg px-2 py-1">+450 XP</span></td>
            </tr>
            <tr className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
              <td className="py-4 font-semibold text-slate-700 whitespace-nowrap">Horas de Estudio</td>
              <td className="py-4 text-right font-black text-slate-900">12.5h</td>
              <td className="py-4 text-right font-bold text-emerald-500 whitespace-nowrap"><span className="bg-emerald-50/50 rounded-lg px-2 py-1">+2.5h</span></td>
            </tr>
            <tr className="hover:bg-slate-50 transition-colors">
              <td className="py-4 font-semibold text-slate-700 whitespace-nowrap">Habilidades en Práctica</td>
              <td className="py-4 text-right font-black text-slate-900">{inProgress}</td>
              <td className="py-4 text-right font-bold text-slate-400 whitespace-nowrap">-</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
