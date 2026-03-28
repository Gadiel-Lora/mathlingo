export default function AccountTab() {
  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div>
        <h2 className="text-2xl font-black text-slate-800 mb-2">Cuenta y Perfil</h2>
        <p className="text-sm text-slate-500 font-medium">Administra tu información personal y credenciales básicas.</p>
      </div>

      <div className="space-y-6 max-w-lg">
        <div>
          <label className="block text-xs uppercase tracking-widest font-black text-slate-500 mb-2">Nombre Completo</label>
          <input type="text" defaultValue="Juan Pérez" className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100 transition-all shadow-inner" />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-widest font-black text-slate-500 mb-2">Correo Electrónico</label>
          <input type="email" defaultValue="juan.perez@elite.edu" className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100 transition-all shadow-inner" />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-widest font-black text-slate-500 mb-2">Grado Escolar Actual</label>
          <div className="relative">
            <select className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100 transition-all appearance-none cursor-pointer shadow-inner">
              <option>Grado 6</option>
              <option selected>Grado 7</option>
              <option>Grado 8</option>
            </select>
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">▼</span>
          </div>
        </div>
      </div>

      <div className="pt-8 border-t border-slate-100 flex gap-4">
        <button className="px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-all active:scale-95">Guardar Cambios</button>
        <button className="px-6 py-3.5 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-colors shadow-sm">Cambiar Contraseña...</button>
      </div>
    </div>
  )
}
