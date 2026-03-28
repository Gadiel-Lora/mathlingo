import { lazy, Suspense, useCallback, useState } from 'react'
import PathSelector from './PathSelector'
import LearningStyleCard from './LearningStyleCard'
import SkillDetailsModal from './SkillDetailsModal'

export const preloadSkillGraph = () => import('./SkillGraph')
const SkillGraph = lazy(preloadSkillGraph)

function GraphFallback() {
  return (
    <div className="flex h-full min-h-[400px] w-full items-center justify-center rounded-xl border border-slate-100 bg-slate-50 p-6">
      <div className="animate-pulse space-y-3 text-center">
        <div className="mx-auto h-5 w-40 rounded bg-slate-200" />
        <div className="mx-auto h-4 w-64 rounded bg-slate-100" />
        <div className="h-64 w-[min(100%,32rem)] rounded-2xl bg-slate-100" />
      </div>
    </div>
  )
}

export default function LearningProfileView() {
  const [selectedPath, setSelectedPath] = useState<'grado' | 'autonomo'>('grado')
  const [modalSkill, setModalSkill] = useState<any>(null)

  const handleNodeClick = useCallback((node: any) => {
    setModalSkill(node)
  }, [])

  return (
    <div className="mx-auto w-full space-y-6 pb-10">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Perfil de Aprendizaje</h2>
          <p className="mt-1 text-slate-500">Sigue tu propio ritmo o mantente en el curriculo de tu grado.</p>
        </div>
        <PathSelector current={selectedPath} onSelect={setSelectedPath} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="relative flex min-h-[500px] flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white p-6 shadow-sm lg:col-span-2">
          <h3 className="z-10 mb-4 flex items-center gap-2 font-bold text-slate-800">
            <span>AR</span> Arbol de Habilidades
          </h3>
          <div className="flex flex-1 items-center justify-center rounded-xl border border-slate-100 bg-slate-50/50 p-2">
            <Suspense fallback={<GraphFallback />}>
              <SkillGraph path={selectedPath} onNodeClick={handleNodeClick} />
            </Suspense>
          </div>
        </div>
        <div className="space-y-6">
          <div className="relative overflow-hidden rounded-2xl border border-indigo-500 bg-gradient-to-br from-indigo-600 to-indigo-800 p-6 text-white shadow-md">
            <div className="pointer-events-none absolute top-0 right-0 h-32 w-32 -translate-y-10 translate-x-10 rounded-full bg-white opacity-5 blur-2xl"></div>
            <h3 className="relative z-10 mb-2 flex items-center gap-2 text-lg font-bold">
              <span>RS</span> Resumen del Camino
            </h3>
            <p className="relative z-10 mb-4 font-medium text-indigo-200">
              {selectedPath === 'grado' ? 'Grado 7 (Oficial)' : 'Ruta Autonoma (Libre)'}
            </p>
            <div className="relative z-10 mb-1 text-3xl font-black text-white drop-shadow-sm">
              65% <span className="text-lg font-bold opacity-80">dominado</span>
            </div>
            <div className="relative z-10 mt-4 h-2.5 w-full overflow-hidden rounded-full bg-indigo-900/50 shadow-inner">
              <div className="h-full w-[65%] rounded-full bg-gradient-to-r from-emerald-300 to-emerald-400 shadow-md"></div>
            </div>
            <p className="relative z-10 mt-3 text-xs font-medium text-indigo-200">12 de 18 habilidades completadas</p>
            <p className="relative z-10 mt-5 flex items-center gap-2 rounded-lg bg-white p-3 text-sm font-semibold text-indigo-900 shadow-sm">
              <span className="text-base leading-none">NX</span> Proximo: Decimales Avanzados
            </p>
          </div>

          <LearningStyleCard />
        </div>
      </div>
      <SkillDetailsModal isOpen={!!modalSkill} skill={modalSkill} onClose={() => setModalSkill(null)} />
    </div>
  )
}
