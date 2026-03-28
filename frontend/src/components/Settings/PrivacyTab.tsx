export default function PrivacyTab() {
  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div>
        <h2 className="text-2xl font-black text-slate-800 mb-2">Privacidad y Datos</h2>
        <p className="text-sm text-slate-500 font-medium">Controla quién ve tu progreso y gestiona tus datos generados.</p>
      </div>

      <div className="space-y-8 max-w-2xl">
        <div>
          <h3 className="text-xs uppercase tracking-widest font-black text-slate-500 mb-4">Visibilidad del Perfil</h3>
          <div className="space-y-3">
            <label className="flex items-center gap-3 p-4 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
              <input type="radio" name="profile" value="public" className="w-4 h-4 text-indigo-600 focus:ring-indigo-500" />
              <div>
                <span className="text-sm font-bold text-slate-800 block">Público (Clase)</span>
                <span className="text-xs text-slate-500">Compañeros y profesores podrán ver tus skills.</span>
              </div>
            </label>
            <label className="flex items-center gap-3 p-4 border border-indigo-200 bg-indigo-50/50 rounded-xl cursor-pointer transition-colors">
              <input type="radio" name="profile" value="private" className="w-4 h-4 text-indigo-600 focus:ring-indigo-500" defaultChecked />
              <div>
                <span className="text-sm font-bold text-indigo-900 block">Privado (Solo tú)</span>
                <span className="text-xs text-indigo-700">Únicamente tú y tus tutores designados ven el progreso.</span>
              </div>
            </label>
          </div>
        </div>
        
        <div>
          <h3 className="text-xs uppercase tracking-widest font-black text-slate-500 mb-4">Leaderboard Global</h3>
          <label className="flex items-center gap-3 p-4 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors bg-white">
            <input type="checkbox" className="w-5 h-5 text-indigo-600 rounded" defaultChecked />
            <span className="text-sm font-bold text-slate-800">Mostrar mi XP en el Leaderboard global/clase.</span>
          </label>
        </div>
        
        <div className="pt-6 border-t border-slate-100">
          <h3 className="text-xs uppercase tracking-widest font-black text-slate-500 mb-4">Gestión de Datos y Certificados</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col justify-between">
              <div>
                <span className="text-2xl mb-2 block">📥</span>
                <p className="font-bold text-slate-800 text-sm mb-1">Descargar mis datos</p>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">Una copia en JSON/CSV de todo tu progreso e historial detallado.</p>
              </div>
              <button className="mt-4 px-4 py-2 bg-white border border-slate-200 text-slate-700 font-bold text-sm rounded-lg hover:bg-slate-100 shadow-sm transition-colors text-center">Descargar JSON</button>
            </div>
            
            <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex flex-col justify-between">
              <div>
                <span className="text-2xl mb-2 block">📜</span>
                <p className="font-bold text-emerald-900 text-sm mb-1">Exportar Certificados</p>
                <p className="text-xs text-emerald-700 font-medium leading-relaxed">Descarga diplomas PDF en alta calidad de las skills dominadas al 100%.</p>
              </div>
              <button className="mt-4 px-4 py-2 bg-emerald-600 text-white font-bold text-sm rounded-lg hover:bg-emerald-700 shadow-sm transition-colors text-center">Generar Certificados</button>
            </div>
          </div>
        </div>

        <div>
          <button className="px-4 py-3 bg-slate-800 text-white font-bold rounded-xl shadow-sm text-sm flex items-center gap-2 hover:bg-slate-900 transition-colors">
            <span>🔄</span> Sincronizar dispositivos (Forzar Sync manual)
          </button>
        </div>
      </div>
      
      <div className="pt-10 mt-10 border-t-2 border-rose-100">
         <h3 className="text-xs uppercase tracking-widest font-black text-rose-500 mb-4">Zona de Peligro</h3>
         <div className="flex gap-4">
           <button className="px-4 py-2 text-rose-600 font-bold text-sm border-2 border-rose-200 rounded-xl hover:bg-rose-50 transition-colors">Eliminar cuenta permanentemente</button>
         </div>
      </div>
    </div>
  )
}
