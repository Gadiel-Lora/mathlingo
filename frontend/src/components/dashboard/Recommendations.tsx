import { useDashboardStore } from '../../store/dashboardStore'

export default function Recommendations() {
  const { recommendations } = useDashboardStore()
  
  if (!recommendations.length) return null
  const rec = recommendations[0]

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-6 rounded-2xl border border-indigo-100 h-full flex flex-col justify-center relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500 opacity-5 rounded-full blur-2xl transform translate-x-10 -translate-y-10 pointer-events-none"></div>
      
      <h3 className="font-bold text-indigo-900 mb-4 flex items-center gap-2 text-lg">
        <span>💡</span> Recomendación Principal
      </h3>
      
      <div className="bg-white/60 backdrop-blur-md p-5 rounded-xl border border-white/50 shadow-sm flex-1">
        <p className="font-bold text-indigo-800 text-lg">{rec.skill}</p>
        <p className="text-sm text-indigo-600/80 mt-1 font-medium leading-snug">{rec.reason}</p>
        <div className="flex items-center gap-3 mt-4">
          <span className="text-[10px] uppercase tracking-wide font-bold text-indigo-600 bg-indigo-100/70 px-2 py-1 rounded">
            Dificultad: {rec.difficulty}
          </span>
          <span className="text-[10px] uppercase tracking-wide font-bold text-slate-500 bg-slate-100/70 px-2 py-1 rounded flex items-center gap-1">
            <span>⏱️</span> ~{rec.estimatedTime} min
          </span>
        </div>
      </div>
      
      <div className="mt-5 flex gap-3 relative z-10">
        <button className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-colors shadow-sm shadow-indigo-200">
          Practicar ahora
        </button>
        <button className="px-4 py-2.5 bg-white text-indigo-600 hover:bg-indigo-50 border border-indigo-200 rounded-xl text-sm font-bold transition-colors shadow-sm">
          Omitir
        </button>
      </div>
    </div>
  )
}
