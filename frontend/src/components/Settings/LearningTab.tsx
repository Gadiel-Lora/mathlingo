export default function LearningTab() {
  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div>
        <h2 className="text-2xl font-black text-slate-800 mb-2">Preferencias de Aprendizaje</h2>
        <p className="text-sm text-slate-500 font-medium">Ajusta cómo la IA te enseña y orienta tu ruta matemática.</p>
      </div>

      <div className="space-y-8 max-w-2xl">
        <div>
          <label className="block text-xs uppercase tracking-widest font-black text-slate-500 mb-3">Estilo de Aprendizaje Predominante</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <label className="flex items-center gap-3 p-4 border border-indigo-200 bg-indigo-50/50 rounded-xl cursor-pointer">
              <input type="radio" name="style" className="w-4 h-4 text-indigo-600" defaultChecked />
              <span className="text-sm font-bold text-indigo-900">Visual</span>
            </label>
            <label className="flex items-center gap-3 p-4 border border-slate-200 bg-white rounded-xl cursor-pointer hover:bg-slate-50">
              <input type="radio" name="style" className="w-4 h-4 text-indigo-600" />
              <span className="text-sm font-bold text-slate-700">Auditivo</span>
            </label>
            <label className="flex items-center gap-3 p-4 border border-slate-200 bg-white rounded-xl cursor-pointer hover:bg-slate-50">
              <input type="radio" name="style" className="w-4 h-4 text-indigo-600" />
              <span className="text-sm font-bold text-slate-700">Kinestésico</span>
            </label>
          </div>
        </div>

        <div>
          <label className="block text-xs uppercase tracking-widest font-black text-slate-500 mb-3">Camino Académico Principal</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border-2 border-slate-200 cursor-pointer hover:border-indigo-300">
              <p className="font-bold text-slate-800 text-sm mb-1">Por Grado (Recomendado)</p>
              <p className="text-xs text-slate-500 font-medium">Sigue el currículo oficial estrictamente paso a paso.</p>
            </div>
            <div className="p-4 rounded-xl border-2 border-indigo-500 bg-indigo-50/30 cursor-pointer shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 p-2 text-indigo-200 opacity-20 text-3xl">✓</div>
              <p className="font-bold text-indigo-900 text-sm mb-1">Camino Autónomo</p>
              <p className="text-xs text-indigo-700 font-medium">Libertad total para elegir qué habilidades dominar.</p>
            </div>
          </div>
        </div>
        
        <div className="space-y-6">
          <div>
            <label className="block text-xs uppercase tracking-widest font-black text-slate-500 mb-2">Idioma de Instrucción</label>
            <div className="relative w-full sm:w-1/2">
              <select className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100 transition-all appearance-none cursor-pointer">
                <option selected>Español</option>
                <option>English</option>
                <option>Français</option>
              </select>
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">▼</span>
            </div>
          </div>
        </div>
      </div>

      <div className="pt-8 border-t border-slate-100">
        <button className="px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-all active:scale-95">Aplicar Configuraciones</button>
      </div>
    </div>
  )
}
