import { useState } from 'react'

export default function DateRangeSelector() {
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  return (
    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 p-1 rounded-lg">
      <input
        type="date"
        value={dateFrom}
        onChange={(e) => setDateFrom(e.target.value)}
        className="w-32 px-2 py-1.5 text-xs bg-transparent text-slate-600 font-medium outline-none cursor-pointer"
        placeholder="Desde"
      />
      <span className="text-slate-300 font-bold">-</span>
      <input
        type="date"
        value={dateTo}
        onChange={(e) => setDateTo(e.target.value)}
        className="w-32 px-2 py-1.5 text-xs bg-transparent text-slate-600 font-medium outline-none cursor-pointer"
        placeholder="Hasta"
      />
    </div>
  )
}
