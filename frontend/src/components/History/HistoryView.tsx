import { useState } from 'react'
import HistoryTabs from './HistoryTabs'
import AttemptCard from './AttemptCard'
import AttemptDetailModal from './AttemptDetailModal'
import { motion } from 'framer-motion'

const mockHistory = [
  { id: 1, date: 'Sábado 14 de Marzo', name: 'Fracciones Especiales', correct: true, attempt: 2, xp: 45, time: '2:15', accuracy: 67 },
  { id: 2, date: 'Sábado 14 de Marzo', name: 'Álgebra Intro', correct: false, attempt: 3, xp: 18, time: '4:32', accuracy: 0 },
  { id: 3, date: 'Sábado 14 de Marzo', name: 'Decimales Básicos', correct: true, attempt: 1, xp: 60, time: '1:45', accuracy: 100 },
  { id: 4, date: 'Viernes 13 de Marzo', name: 'Geometría y Ángulos', correct: true, attempt: 1, xp: 55, time: '1:12', accuracy: 100 },
  { id: 5, date: 'Viernes 13 de Marzo', name: 'Funciones', correct: false, attempt: 2, xp: 22, time: '3:05', accuracy: 33 },
]

export default function HistoryView() {
  const [activeTab, setActiveTab] = useState('Semana')
  const [selectedAttempt, setSelectedAttempt] = useState<any>(null)

  const groupedHistory = mockHistory.reduce((acc: any, curr) => {
    if (!acc[curr.date]) acc[curr.date] = []
    acc[curr.date].push(curr)
    return acc
  }, {})

  return (
    <div className="max-w-5xl mx-auto pb-16 w-full">
      <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-100 flex flex-col h-full min-h-[70vh]">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
          <HistoryTabs active={activeTab} onSelect={setActiveTab} />
          <div className="flex gap-3 w-full md:w-auto">
            <div className="relative flex-1 min-w-[180px]">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
              <select className="w-full pl-9 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none cursor-pointer hover:bg-slate-100 transition-colors text-slate-600 appearance-none shadow-sm">
                <option>Filtrar por Skill</option>
                <option>Fracciones</option>
                <option>Álgebra</option>
                <option>Geometría</option>
              </select>
            </div>
            <input type="date" className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 outline-none cursor-pointer hover:bg-slate-100 transition-colors shadow-sm" />
          </div>
        </div>
        
        <div className="space-y-12 flex-1">
          {Object.keys(groupedHistory).map(date => (
            <div key={date}>
              <h3 className="text-xs font-black text-slate-400 tracking-widest uppercase mb-5 flex items-center gap-2 border-b border-slate-100 pb-3">
                <span className="text-lg">📅</span> {date}
              </h3>
              <div className="space-y-4">
                {groupedHistory[date].map((entry: any, i: number) => (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                  >
                    <AttemptCard data={entry} onClick={() => setSelectedAttempt(entry)} />
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
          
          <button className="w-full py-5 mt-8 border-2 border-slate-200 border-dashed rounded-2xl text-slate-500 font-bold hover:bg-slate-50 hover:border-indigo-300 hover:text-indigo-600 transition-all text-lg tracking-tight">
            Cargar más historial de {activeTab.toLowerCase()}...
          </button>
        </div>
      </div>
      
      <AttemptDetailModal 
        isOpen={!!selectedAttempt} 
        attempt={selectedAttempt} 
        onClose={() => setSelectedAttempt(null)} 
      />
    </div>
  )
}
