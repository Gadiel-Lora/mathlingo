import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const mockData = [
  { date: "Mar 16", xp: 120, problems: 5 },
  { date: "Mar 17", xp: 145, problems: 6 },
  { date: "Mar 18", xp: 90, problems: 3 },
  { date: "Mar 19", xp: 210, problems: 10 },
  { date: "Mar 20", xp: 180, problems: 8 },
  { date: "Mar 21", xp: 240, problems: 12 },
  { date: "Mar 22", xp: 320, problems: 15 },
]

export default function ProgressChart() {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-full flex flex-col">
      <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2 text-xl">
        <span>📈</span> Progreso 7 Días
      </h3>
      
      <div className="flex-1 w-full min-h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={mockData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} dy={10} />
            <YAxis yAxisId="left" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              itemStyle={{ fontWeight: 600 }}
              labelStyle={{ color: '#64748b', marginBottom: '4px' }}
            />
            <Legend wrapperStyle={{ paddingTop: '20px' }} />
            <Line yAxisId="left" type="monotone" name="XP Ganado" dataKey="xp" stroke="#4f46e5" strokeWidth={3} dot={{ fill: '#4f46e5', strokeWidth: 2, r: 4 }} activeDot={{ r: 6, fill: '#4f46e5', stroke: '#c7d2fe', strokeWidth: 4 }} />
            <Line yAxisId="right" type="monotone" name="Problemas" dataKey="problems" stroke="#10b981" strokeWidth={3} dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
