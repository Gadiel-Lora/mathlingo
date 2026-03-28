import { motion, AnimatePresence } from 'framer-motion'

interface SkillModalProps {
  isOpen: boolean
  skill: any | null
  onClose: () => void
}

export default function SkillDetailsModal({ isOpen, skill, onClose }: SkillModalProps) {
  if (!isOpen || !skill) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-100"
        >
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
              <span className="text-indigo-500">🧠</span> {skill.name || 'Habilidad'}
            </h2>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-200 text-slate-500 hover:bg-slate-300 hover:text-slate-700 transition-colors">
              ✕
            </button>
          </div>
          
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-center">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1 tracking-wider">Mastery</span>
                <span className="text-xl font-black text-indigo-600">{skill.mastery || 0}%</span>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-center">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1 tracking-wider">Problemas</span>
                <span className="text-xl font-black text-slate-700">{skill.val * 10 || 0}</span>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-center">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1 tracking-wider">Accuracy</span>
                <span className="text-xl font-black text-emerald-600">85%</span>
              </div>
            </div>
            
            <div>
               <h3 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
                 <span>📉</span> Errores Comunes
               </h3>
               <ul className="space-y-2 text-sm text-slate-600 bg-rose-50/50 p-4 rounded-xl border border-rose-100">
                 <li className="flex items-start gap-2"><span className="text-rose-400 mt-0.5">•</span> Confusión entre el numerador y el denominador.</li>
                 <li className="flex items-start gap-2"><span className="text-rose-400 mt-0.5">•</span> Fallos repetitivos al realizar encadenamientos aritméticos.</li>
               </ul>
            </div>
            
            <button onClick={onClose} className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-sm transition-transform active:scale-95 flex items-center justify-center gap-2">
              <span>🚀</span> Practicar {skill.name || 'esta habilidad'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
