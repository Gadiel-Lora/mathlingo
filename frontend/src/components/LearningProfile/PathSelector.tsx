interface PathSelectorProps {
  current: 'grado' | 'autonomo'
  onSelect: (path: 'grado' | 'autonomo') => void
}

export default function PathSelector({ current, onSelect }: PathSelectorProps) {
  return (
    <div className="flex bg-slate-100 p-1.5 rounded-xl border border-slate-200 shadow-inner w-full sm:w-auto overflow-x-auto">
      <button
        onClick={() => onSelect('grado')}
        className={`flex-1 sm:flex-none whitespace-nowrap px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${
          current === 'grado' ? 'bg-white text-indigo-700 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
        }`}
      >
        🎓 Grado Académico
      </button>
      <button
        onClick={() => onSelect('autonomo')}
        className={`flex-1 sm:flex-none whitespace-nowrap px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${
          current === 'autonomo' ? 'bg-white text-indigo-700 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
        }`}
      >
        🚀 Camino Autónomo
      </button>
    </div>
  )
}
