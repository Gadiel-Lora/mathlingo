import { useState } from 'react'

export default function DateRangeSelector() {
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  return (
    <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
      <input
        type="date"
        value={dateFrom}
        onChange={(e) => setDateFrom(e.target.value)}
        className="w-32 cursor-pointer bg-transparent px-2 py-1.5 text-xs font-bold text-slate-600 outline-none"
        placeholder="Desde"
      />
      <span className="font-bold text-slate-300">-</span>
      <input
        type="date"
        value={dateTo}
        onChange={(e) => setDateTo(e.target.value)}
        className="w-32 cursor-pointer bg-transparent px-2 py-1.5 text-xs font-bold text-slate-600 outline-none"
        placeholder="Hasta"
      />
    </div>
  )
}
