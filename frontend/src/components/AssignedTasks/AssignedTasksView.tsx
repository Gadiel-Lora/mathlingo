import { useState } from 'react'
import TaskCard from './TaskCard'

const mockTasks = [
  { id: 1, title: 'Suma y Resta de Fracciones', topic: 'Fracciones', deadline: 'Mar 26', difficulty: 'Medio', desc: 'Practica sumar y restar fracciones con distinto denominador utilizando el mínimo común múltiplo.', status: 'pending' as const, xp: 150 },
  { id: 2, title: 'Calculando el Área', topic: 'Geometría', deadline: 'Hoy', difficulty: 'Difícil', desc: 'Resuelve problemas avanzados sobre áreas de triángulos y calcula el área sombreada en circunferencias inscritas.', status: 'urgent' as const, xp: 200 },
  { id: 3, title: 'Ecuaciones de Primer Grado', topic: 'Álgebra Intro', deadline: 'Mar 20', difficulty: 'Fácil', desc: 'Aísla la variable incógnita x transponiendo los valores numéricos.', status: 'completed' as const, xp: 100 },
]

export default function AssignedTasksView() {
  const [filter, setFilter] = useState('Todas')

  const filteredTasks = mockTasks.filter(t => {
    if (filter === 'Pendientes') return t.status !== 'completed'
    if (filter === 'Completadas') return t.status === 'completed'
    if (filter === 'Urgentes') return t.status === 'urgent'
    return true
  })

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20 w-full">
      <div className="bg-white p-6 sm:p-10 rounded-3xl shadow-sm border border-slate-100 min-h-[70vh]">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 mb-10 border-b border-slate-100 pb-8">
          <div>
            <h2 className="text-3xl font-black text-slate-800 tracking-tight mb-2 flex items-center gap-3">
              <span className="text-indigo-500">📝</span> Tareas Asignadas
            </h2>
            <p className="text-slate-500 font-medium">Completa los retos asignados semanalmente por tu Tutor Inteligente o Profesor para ganar bonificaciones de XP.</p>
          </div>
          
          <div className="flex gap-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200 w-full lg:w-auto overflow-x-auto shadow-inner">
            {['Todas', 'Pendientes', 'Urgentes', 'Completadas'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`flex-1 lg:flex-none px-6 py-2.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
                  filter === f ? 'bg-white text-indigo-700 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
        
        <div className="space-y-5">
          {filteredTasks.length === 0 ? (
            <div className="py-32 text-center text-slate-400 border-2 border-dashed border-slate-100 rounded-3xl bg-slate-50/50">
              <span className="text-6xl block mb-6 grayscale opacity-50">☕</span>
              <p className="font-black text-2xl text-slate-500 mb-2 tracking-tight">¡Todo despejado!</p>
              <p className="text-base font-medium">Estás al día con todos tus deberes pendientes.</p>
            </div>
          ) : (
            filteredTasks.map(task => <TaskCard key={task.id} task={task} />)
          )}
        </div>
      </div>
    </div>
  )
}
