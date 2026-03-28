interface HistoryTabsProps {
  active: string;
  onSelect: (tab: string) => void;
}

export default function HistoryTabs({ active, onSelect }: HistoryTabsProps) {
  const tabs = ['Semana', 'Mes', 'Todos']
  return (
    <div className="flex bg-slate-100 p-1.5 rounded-xl border border-slate-200 w-full md:w-auto overflow-x-auto shadow-inner">
      {tabs.map(tab => (
        <button
          key={tab}
          onClick={() => onSelect(tab)}
          className={`flex-1 md:flex-none px-6 py-2.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
            active === tab ? 'bg-white text-indigo-700 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
          }`}
        >
          {tab}
        </button>
      ))}
    </div>
  )
}
