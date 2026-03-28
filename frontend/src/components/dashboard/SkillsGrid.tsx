import { useDashboardStore } from '../../store/dashboardStore'
import SkillCard from './SkillCard'

export default function SkillsGrid() {
  const { skills, filters, applyFilter } = useDashboardStore()

  const filteredSkills = skills.filter(skill => {
    if (filters.grade !== 'Todos' && skill.grade !== filters.grade) return false
    if (filters.category !== 'Todos' && skill.category !== filters.category) return false
    if (filters.search && !skill.name.toLowerCase().includes(filters.search.toLowerCase())) return false
    return true
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-slate-100">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <span>🧠</span> Áreas de Conocimiento
        </h2>
        
        {/* Filtros */}
        <div className="flex flex-wrap gap-3 w-full md:w-auto">
          <select
            value={filters.grade}
            onChange={(e) => applyFilter('grade', e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-600 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer font-medium hover:bg-slate-100 transition-colors"
          >
            <option value="Todos">Todos los grados</option>
            <option value="Grado 5-6">Grado 5-6</option>
            <option value="Grado 7-8">Grado 7-8</option>
            <option value="Grado 9-10">Grado 9-10</option>
            <option value="Grado 11-12">Grado 11-12</option>
          </select>

          <select
            value={filters.category}
            onChange={(e) => applyFilter('category', e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-600 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer font-medium hover:bg-slate-100 transition-colors"
          >
            <option value="Todos">Categorías</option>
            <option value="Aritmética">Aritmética</option>
            <option value="Geometría">Geometría</option>
            <option value="Álgebra">Álgebra</option>
            <option value="Cálculo">Cálculo</option>
          </select>

          <div className="relative flex-1 min-w-[200px]">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
            <input
              type="search"
              placeholder="Buscar habilidad..."
              value={filters.search}
              onChange={(e) => applyFilter('search', e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 font-medium placeholder:text-slate-400 hover:bg-white transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Grid de tarjetas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredSkills.length > 0 ? (
          filteredSkills.map((skill) => (
            <SkillCard key={skill.id} skill={skill} />
          ))
        ) : (
          <div className="col-span-full py-16 text-center text-slate-500 bg-white rounded-2xl border-2 border-slate-100 border-dashed">
            <div className="text-4xl mb-3">👻</div>
            <p className="font-semibold text-slate-600">No se encontraron habilidades</p>
            <p className="text-sm mt-1">Intenta ajustando los filtros de búsqueda.</p>
          </div>
        )}
      </div>
    </div>
  )
}
