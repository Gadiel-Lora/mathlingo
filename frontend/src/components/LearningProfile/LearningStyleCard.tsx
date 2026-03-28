export default function LearningStyleCard() {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-max">
      <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2 text-lg">
        <span>🧠</span> Tu Estilo Cognitivo
      </h3>
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 text-amber-900 p-5 rounded-xl text-center mb-6 shadow-sm">
        <span className="text-xs uppercase font-black tracking-widest text-amber-600 block mb-1">Predominante</span>
        <span className="text-3xl font-black drop-shadow-sm">Visual</span>
      </div>
      <div className="space-y-4">
        <div>
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Fortalezas detectadas
          </h4>
          <p className="text-sm text-slate-700 font-medium bg-slate-50 px-3 py-2.5 rounded-lg border border-slate-100">
            Gráficas, diagramas de fracciones y esquemas espaciales de geometría.
          </p>
        </div>
        <div>
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5 mt-4">
            <span className="w-2 h-2 rounded-full bg-rose-500"></span> Áreas de mejora
          </h4>
          <p className="text-sm text-slate-700 font-medium bg-slate-50 px-3 py-2.5 rounded-lg border border-slate-100">
            Pruebas algebraicas abstractas en formato de texto extenso (L1).
          </p>
        </div>
      </div>
    </div>
  )
}
