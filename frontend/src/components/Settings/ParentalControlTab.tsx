export default function ParentalControlTab() {
  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div>
        <h2 className="text-2xl font-black text-slate-800 mb-2 flex items-center gap-2">
          <span>👨‍👩‍👧</span> Control Parental y Tutores
        </h2>
        <p className="text-sm text-slate-500 font-medium leading-relaxed max-w-xl">Vincula cuentas de supervisores (padres/profesores) que podrán recibir reportes de desempeño y ver tu progreso.</p>
      </div>

      <div className="space-y-8 max-w-lg">
        <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-2xl flex items-start gap-4 shadow-sm">
           <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center font-black text-indigo-600 shadow-sm border border-indigo-200 text-xl flex-shrink-0 mt-0.5">
             M
           </div>
           <div>
             <span className="text-[10px] uppercase font-black tracking-widest text-indigo-400 block mb-1">Tutor Vinculado Activo</span>
             <p className="font-bold text-indigo-900 text-lg leading-tight">Mamá (maria@ejemplo.com)</p>
             <p className="text-xs text-indigo-700 mt-2 font-medium leading-relaxed">Recibe reportes semanales y alertas tempranas en caso de disminución de precisión matemática.</p>
             <button className="mt-4 text-xs font-bold text-rose-500 hover:text-rose-600 transition-colors uppercase tracking-wider flex items-center gap-1">
                <span>✕</span> Revocar acceso total
             </button>
           </div>
        </div>

        <div className="pt-2">
          <label className="block text-xs uppercase tracking-widest font-black text-slate-500 mb-3">Agregar nuevo supervisor</label>
          <div className="flex gap-3">
            <input type="email" placeholder="correo del tutor/padre..." className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100 transition-all shadow-inner" />
            <button className="px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-sm transition-all text-sm whitespace-nowrap active:scale-95">Invitar ✉️</button>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-100">
          <label className="flex items-center gap-4 p-5 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors bg-white shadow-sm">
            <input type="checkbox" className="w-6 h-6 text-indigo-600 rounded" defaultChecked />
            <span className="text-sm font-bold text-slate-800 leading-snug">Mi progreso detallado es actualmente visible para todos los tutores vinculados automáticamente.</span>
          </label>
        </div>
      </div>
    </div>
  )
}
