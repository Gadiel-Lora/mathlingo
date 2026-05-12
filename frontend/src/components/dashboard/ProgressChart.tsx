import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const mockData = [
  { date: 'Mar 16', xp: 120, problems: 5 },
  { date: 'Mar 17', xp: 145, problems: 6 },
  { date: 'Mar 18', xp: 90, problems: 3 },
  { date: 'Mar 19', xp: 210, problems: 10 },
  { date: 'Mar 20', xp: 180, problems: 8 },
  { date: 'Mar 21', xp: 240, problems: 12 },
  { date: 'Mar 22', xp: 320, problems: 15 },
]

export default function ProgressChart() {
  return (
    <section className="math-dashboard-card flex h-full flex-col p-6">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black text-teal-700">Serie semanal</p>
          <h3 className="text-xl font-black text-slate-950">Progreso semanal</h3>
        </div>
        <span className="math-formula-token">dXP/dt</span>
      </div>

      <div className="min-h-[300px] w-full flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={mockData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#dfe9e7" />
            <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#5a6b68', fontWeight: 700 }} axisLine={false} tickLine={false} dy={10} />
            <YAxis yAxisId="left" tick={{ fontSize: 12, fill: '#5a6b68', fontWeight: 700 }} axisLine={false} tickLine={false} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12, fill: '#5a6b68', fontWeight: 700 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#ffffff',
                borderRadius: '8px',
                border: '1px solid #c9d8d6',
                boxShadow: '0 12px 28px rgba(31, 50, 48, 0.12)',
              }}
              itemStyle={{ fontWeight: 700 }}
              labelStyle={{ color: '#5a6b68', marginBottom: '4px', fontWeight: 800 }}
            />
            <Legend wrapperStyle={{ paddingTop: '20px', fontWeight: 700 }} />
            <Line yAxisId="left" type="monotone" name="XP ganado" dataKey="xp" stroke="#0e7c86" strokeWidth={3} dot={{ fill: '#0e7c86', strokeWidth: 2, r: 4 }} activeDot={{ r: 6, fill: '#0e7c86', stroke: '#d6f4ee', strokeWidth: 4 }} />
            <Line yAxisId="right" type="monotone" name="Problemas" dataKey="problems" stroke="#2aa876" strokeWidth={3} dot={{ fill: '#2aa876', strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}
