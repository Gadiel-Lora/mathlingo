import { motion } from 'framer-motion'

interface TaskData {
  id: number;
  title: string;
  topic: string;
  deadline: string;
  difficulty: string;
  desc: string;
  status: 'pending' | 'urgent' | 'completed';
  xp: number;
}

export default function TaskCard({ task }: { task: TaskData }) {
  const isCompleted = task.status === 'completed'
  const isUrgent = task.status === 'urgent'

  return (
    <motion.div
      whileHover={{ y: -2 }}
      className={`p-6 rounded-2xl border-l-[6px] transition-all shadow-sm bg-white hover:shadow-md flex flex-col md:flex-row md:items-center justify-between gap-6 border border-slate-100 ${
        isCompleted ? 'border-l-emerald-500 opacity-70 hover:opacity-100' :
        isUrgent ? 'border-l-rose-500' : 'border-l-indigo-500'
      }`}
    >
      <div className="flex-1">
        <div className="flex items-center gap-3 mb-3">
           <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-md ${
             isCompleted ? 'bg-emerald-50 text-emerald-700' :
             isUrgent ? 'bg-rose-50 text-rose-700' : 'bg-indigo-50 text-indigo-700'
           }`}>
             {task.topic}
           </span>
           {isUrgent && <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-md bg-rose-500 text-white animate-pulse shadow-sm">URGENTE</span>}
           {isCompleted && <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-md bg-emerald-500 text-white shadow-sm">✓ COMPLETADA</span>}
        </div>
        <h3 className={`text-xl font-black tracking-tight mb-2 ${isCompleted ? 'text-slate-500 line-through decoration-slate-300' : 'text-slate-800'}`}>
          {task.title}
        </h3>
        <p className="text-sm font-medium text-slate-500 mb-4 leading-relaxed max-w-2xl">{task.desc}</p>
        
        <div className="flex items-center gap-5 text-xs font-bold text-slate-400 bg-slate-50 p-3 rounded-xl border border-slate-100 w-max">
          <span className="flex items-center gap-1.5"><span className="text-sm">⏱️</span> Vence: <span className={isUrgent ? 'text-rose-600 font-black' : 'text-slate-600'}>{task.deadline}</span></span>
          <span className="w-1 h-1 rounded-full bg-slate-300"></span>
          <span className="flex items-center gap-1.5"><span className="text-sm">⭐</span> Recompensa: <span className="text-indigo-600 font-black">+{task.xp} XP</span></span>
          <span className="w-1 h-1 rounded-full bg-slate-300"></span>
          <span className="flex items-center gap-1.5"><span className="text-sm">📈</span> Dificultad: <span className="text-slate-600 font-black">{task.difficulty}</span></span>
        </div>
      </div>

      <div className="flex flex-col gap-3 min-w-[180px]">
        {!isCompleted ? (
          <>
             <button className={`w-full py-3.5 rounded-xl text-sm font-bold text-white shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 ${
               isUrgent ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-200' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'
             }`}>
               {isUrgent ? <span>⚡ Empezar Ahora</span> : <span>🚀 Empezar Tarea</span>}
             </button>
             <button className="w-full py-3.5 rounded-xl text-sm font-bold text-slate-600 bg-white border-2 border-slate-100 hover:border-slate-200 hover:bg-slate-50 transition-colors shadow-sm">
               Ver Detalles
             </button>
          </>
        ) : (
          <button className="w-full py-3.5 rounded-xl text-sm font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition-colors flex items-center justify-center gap-2 shadow-sm">
            <span>📊</span> Ver Resultados
          </button>
        )}
      </div>
    </motion.div>
  )
}
