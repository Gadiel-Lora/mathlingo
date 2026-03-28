import { motion } from 'framer-motion'

interface AttemptData {
  id: number;
  date: string;
  name: string;
  correct: boolean;
  attempt: number;
  xp: number;
  time: string;
  accuracy: number;
}

export default function AttemptCard({ data, onClick }: { data: AttemptData, onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className={`relative p-5 rounded-2xl border-l-4 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all shadow-sm hover:shadow-md ${
        data.correct 
          ? 'bg-white border-l-emerald-500 hover:bg-emerald-50/30' 
          : 'bg-white border-l-rose-500 hover:bg-rose-50/30'
      } border-y border-r border-slate-100`}
    >
      <div className="flex items-start gap-4 flex-1">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black shadow-sm border text-xl ${
          data.correct ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'
        }`}>
          {data.correct ? '✓' : '✗'}
        </div>
        <div>
          <h4 className={`font-black text-lg ${data.correct ? 'text-slate-800' : 'text-slate-800'}`}>{data.name}</h4>
          <div className="flex items-center gap-2 mt-1">
            <span className="bg-slate-100/80 px-2.5 py-1 rounded-md text-[10px] uppercase tracking-wider font-bold text-slate-500 border border-slate-200">
              Intento {data.attempt}/3
            </span>
            {data.correct && <span className="bg-emerald-100/50 text-emerald-700 px-2.5 py-1 rounded-md text-[10px] uppercase tracking-wider font-bold border border-emerald-200">Completado</span>}
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-6 sm:gap-8 justify-between w-full sm:w-auto border-t sm:border-t-0 border-slate-100 pt-4 sm:pt-0">
        <div className="text-center">
          <p className="text-[10px] uppercase font-bold text-slate-400">XP</p>
          <p className="font-black text-indigo-600 text-lg">+{data.xp}</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] uppercase font-bold text-slate-400">Tiempo</p>
          <p className="font-bold text-slate-700 text-lg">{data.time}</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] uppercase font-bold text-slate-400">Precisión</p>
          <p className={`font-black text-lg ${data.accuracy >= 60 ? 'text-emerald-500' : 'text-rose-500'}`}>{data.accuracy}%</p>
        </div>
        
        <div className="text-slate-300 flex items-center justify-center w-8 h-8 rounded-full border-2 border-slate-100 hover:border-indigo-500 hover:text-indigo-500 hover:bg-indigo-50 transition-colors hidden sm:flex">
          <svg className="w-4 h-4 ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </div>
  )
}
