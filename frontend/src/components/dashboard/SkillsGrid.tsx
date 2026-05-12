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
    <section className="space-y-6">
      <div className="math-dashboard-card flex flex-col items-start justify-between gap-4 p-4 md:flex-row md:items-center">
        <div>
          <p className="text-xs font-black text-teal-700">Curriculum</p>
          <h2 className="text-xl font-black text-slate-950">Areas de conocimiento</h2>
        </div>

        <div className="flex w-full flex-wrap gap-3 md:w-auto">
          <select
            value={filters.grade}
            onChange={(e) => applyFilter('grade', e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600 outline-none transition-colors hover:bg-slate-50 focus:ring-2 focus:ring-teal-100"
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
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600 outline-none transition-colors hover:bg-slate-50 focus:ring-2 focus:ring-teal-100"
          >
            <option value="Todos">Categorias</option>
            <option value="Aritmetica">Aritmetica</option>
            <option value="Geometria">Geometria</option>
            <option value="Algebra">Algebra</option>
            <option value="Calculo">Calculo</option>
          </select>

          <div className="relative min-w-[200px] flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 font-serif text-sm font-black text-teal-700">fx</span>
            <input
              type="search"
              placeholder="Buscar habilidad..."
              value={filters.search}
              onChange={(e) => applyFilter('search', e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-3 text-sm font-bold outline-none transition-colors placeholder:text-slate-400 hover:bg-slate-50 focus:ring-2 focus:ring-teal-100"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredSkills.length > 0 ? (
          filteredSkills.map((skill) => <SkillCard key={skill.id} skill={skill} />)
        ) : (
          <div className="math-dashboard-card col-span-full py-16 text-center text-slate-500">
            <div className="mx-auto mb-3 w-fit">
              <span className="math-formula-token">empty set</span>
            </div>
            <p className="font-black text-slate-700">No se encontraron habilidades</p>
            <p className="mt-1 text-sm font-medium">Ajusta los filtros de busqueda.</p>
          </div>
        )}
      </div>
    </section>
  )
}
