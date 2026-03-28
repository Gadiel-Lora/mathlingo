import { useAudioStore } from '../../store/audioStore'

export default function NotificationsTab() {
  const { soundsEnabled, volume, toggleSounds, setVolume, playSound } = useAudioStore()
  
  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div>
        <h2 className="text-2xl font-black text-slate-800 mb-2">Notificaciones</h2>
        <p className="text-sm text-slate-500 font-medium">Controla qué tipo de alertas quieres recibir.</p>
      </div>

      <div className="space-y-6 max-w-lg">
        <div>
          <h3 className="text-xs uppercase tracking-widest font-black text-slate-500 mb-4">Móvil y Navegador</h3>
          <label className="flex items-center gap-3 p-4 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors bg-white">
            <input type="checkbox" className="w-5 h-5 text-indigo-600 rounded" defaultChecked />
            <span className="text-sm font-bold text-slate-800">Push Notifications (Alertas Instantáneas)</span>
          </label>
        </div>

        <div>
          <h3 className="text-xs uppercase tracking-widest font-black text-slate-500 mb-4 mt-6">Experiencia Sonora (FX)</h3>
          <div className="space-y-4">
            <label className="flex items-center justify-between p-4 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors bg-white">
              <div className="flex flex-col">
                <span className="text-sm font-bold text-slate-800">Efectos de Sonido</span>
                <span className="text-xs text-slate-500 mt-1 font-medium">Activa sonidos de XP y feedback.</span>
              </div>
              <input 
                 type="checkbox" 
                 className="w-5 h-5 text-indigo-600 rounded" 
                 checked={soundsEnabled}
                 onChange={() => {
                   toggleSounds()
                   if (!soundsEnabled) setTimeout(() => playSound('click'), 100)
                 }} 
              />
            </label>

            {soundsEnabled && (
              <div className="p-5 border border-slate-200 rounded-xl bg-white space-y-4 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                <div className="flex justify-between items-center relative z-10">
                  <span className="text-sm font-bold text-slate-800">Volumen General Master</span>
                  <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded">{Math.round(volume * 100)}%</span>
                </div>
                <input 
                  type="range" 
                  min="0" max="1" step="0.05"
                  value={volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  onMouseUp={() => playSound('correct')}
                  onTouchEnd={() => playSound('correct')}
                  className="w-full accent-indigo-600 cursor-grab relative z-10"
                />
              </div>
            )}
          </div>
        </div>
        
        <div>
          <h3 className="text-xs uppercase tracking-widest font-black text-slate-500 mb-4 mt-6">Correos Electrónicos</h3>
          <div className="space-y-3">
            <label className="flex items-center gap-3 p-4 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors bg-white">
              <input type="checkbox" className="w-5 h-5 text-indigo-600 rounded" defaultChecked />
              <div className="flex flex-col">
                <span className="text-sm font-bold text-slate-800">Nuevas Tareas Asignadas</span>
                <span className="text-xs text-slate-500 mt-1 font-medium">Recibe un correo cuando tu tutor asigne retos.</span>
              </div>
            </label>
            <label className="flex items-center gap-3 p-4 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors bg-white">
              <input type="checkbox" className="w-5 h-5 text-indigo-600 rounded" defaultChecked />
              <div className="flex flex-col">
                <span className="text-sm font-bold text-slate-800">Recordatorio: Spaced Repetition</span>
                <span className="text-xs text-slate-500 mt-1 font-medium">Avisos cuando es momento ideal de repasar un skill.</span>
              </div>
            </label>
            <label className="flex items-center gap-3 p-4 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors bg-white">
              <input type="checkbox" className="w-5 h-5 text-indigo-600 rounded" defaultChecked />
              <div className="flex flex-col">
                <span className="text-sm font-bold text-slate-800">Logros Mensuales</span>
                <span className="text-xs text-slate-500 mt-1 font-medium">Un resumen de tus medallas al terminar el mes.</span>
              </div>
            </label>
          </div>
        </div>
      </div>

      <div className="pt-8 border-t border-slate-100">
        <button className="px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-all active:scale-95">Guardar Preferencias</button>
      </div>
    </div>
  )
}
