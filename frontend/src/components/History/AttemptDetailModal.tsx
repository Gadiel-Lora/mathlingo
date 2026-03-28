import { motion, AnimatePresence } from 'framer-motion'

interface AttemptDetailProps {
  isOpen: boolean;
  attempt: any;
  onClose: () => void;
}

export default function AttemptDetailModal({ isOpen, attempt, onClose }: AttemptDetailProps) {
  if (!isOpen || !attempt) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-100"
        >
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-3">
              <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 text-xl shadow-sm border border-indigo-200">📝</span> 
              Revisión de Intento
            </h2>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-xl rounded-full bg-slate-200 text-slate-500 hover:bg-slate-300 hover:text-slate-800 transition-colors font-black">
              ✕
            </button>
          </div>
          
          <div className="p-6 md:p-8 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-5 bg-slate-50 rounded-2xl border border-slate-100 shadow-inner">
              <div className="flex flex-col h-full">
                <p className="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-2">Problema Original</p>
                <div className="font-semibold text-slate-800 bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex-1">
                  Resuelve para x: <div className="text-indigo-600 font-black text-xl mt-2">3x + 5 = 14</div>
                </div>
              </div>
              <div className="flex flex-col h-full">
                <p className="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-2">Tu Respuesta</p>
                <div className={`font-bold p-4 rounded-xl border shadow-sm flex-1 flex flex-col justify-center relative overflow-hidden ${attempt.correct ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
                  <div className="absolute top-0 right-0 p-3 opacity-20 text-4xl">{attempt.correct ? '🎉' : '❌'}</div>
                  <span className="text-xl relative z-10">{attempt.correct ? 'x = 3' : 'x = 4'}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {!attempt.correct && (
                <div>
                  <p className="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-2">Respuesta Correcta</p>
                  <p className="font-bold text-emerald-600 bg-emerald-50 p-4 rounded-xl border border-emerald-100 text-center text-lg shadow-sm">x = 3</p>
                </div>
              )}
              <div className={attempt.correct ? "md:col-span-2" : ""}>
                <p className="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-2 flex items-center gap-1.5"><span className="text-sm">🤖</span> Feedback del AI Tutor</p>
                <p className="text-sm text-slate-700 bg-blue-50/50 p-4 rounded-xl border border-blue-100 leading-relaxed font-medium shadow-sm">
                  {attempt.correct ? 
                    "¡Excelente trabajo! Has demostrado comprender el aislamiento de variables trasladando correctamente los términos constantes antes de dividir." : 
                    "Estás muy cerca. Recuerda que primero debes restar 5 a ambos lados (14 - 5 = 9), y luego dividir el resultado entre 3."}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 border-t border-slate-100 pt-8">
              <div className="text-center">
                <span className="text-[10px] uppercase font-black tracking-widest text-slate-400 block mb-1">Tiempo Utilizado</span>
                <span className="text-3xl font-black text-slate-700">{attempt.time}</span>
              </div>
              <div className="text-center">
                <span className="text-[10px] uppercase font-black tracking-widest text-slate-400 block mb-1">XP Ganado</span>
                <span className="text-3xl font-black text-indigo-600">+{attempt.xp}</span>
              </div>
              <div className="text-center">
                <span className="text-[10px] uppercase font-black tracking-widest text-slate-400 block mb-1">Intento</span>
                <span className="text-3xl font-black text-slate-700">{attempt.attempt}<span className="text-xl text-slate-400">/3</span></span>
              </div>
            </div>

            <button onClick={onClose} className="w-full py-4 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 mt-4 text-lg">
              {attempt.correct ? <span>🚀 Continuar Práctica</span> : <span>🔄 Re-intentar (Problema nuevo)</span>}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
