interface PathSelectorProps {
  current: 'grado' | 'autonomo'
  onSelect: (path: 'grado' | 'autonomo') => void
}

export default function PathSelector({ current, onSelect }: PathSelectorProps) {
  return (
    <div className="flex w-full overflow-x-auto rounded-xl border border-slate-200 bg-slate-100 p-1.5 shadow-inner sm:w-auto">
      <button
        type="button"
        onClick={() => onSelect('grado')}
        className={`flex-1 whitespace-nowrap rounded-lg px-5 py-2.5 text-sm font-bold transition-all sm:flex-none ${
          current === 'grado' ? 'border border-slate-200 bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:bg-slate-200/50 hover:text-slate-700'
        }`}
      >
        Mapa de Grado
      </button>
      <button
        type="button"
        onClick={() => onSelect('autonomo')}
        className={`flex-1 whitespace-nowrap rounded-lg px-5 py-2.5 text-sm font-bold transition-all sm:flex-none ${
          current === 'autonomo' ? 'border border-slate-200 bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:bg-slate-200/50 hover:text-slate-700'
        }`}
      >
        Constelaciones
      </button>
    </div>
  )
}
