import { useMemo, useState } from 'react'

import { useAuth } from '../../context/AuthContext'
import SkillGraph from '../LearningProfile/SkillGraph'

function summarizeGradeMap(gradeMap) {
  const lessons = (gradeMap?.areas || []).flatMap((area) => area.topics.flatMap((topic) => topic.lessons))
  const completed = lessons.filter((lesson) => lesson.status === 'COMPLETED' || lesson.mastery >= 85).length
  return {
    totalLessons: lessons.length,
    completedLessons: completed,
    mastery: lessons.length ? Math.round((completed / lessons.length) * 100) : 0,
    nextLesson: lessons.find((lesson) => !(lesson.status === 'COMPLETED' || lesson.mastery >= 85)) || null,
  }
}

export default function DualPathPanel() {
  const { profile, updateSelectedPath, profileLoading } = useAuth()
  const [selectedNode, setSelectedNode] = useState(null)

  const selectedPathType = profile?.selectedPathType || 'GRADE'
  const overview = profile?.overview
  const gradeSummary = useMemo(() => summarizeGradeMap(overview?.gradeMap), [overview?.gradeMap])

  const graphData = useMemo(() => {
    const constellation = overview?.constellation
    if (!constellation?.nodes?.length) return undefined
    return {
      nodes: constellation.nodes.map((node) => ({
        ...node,
        val: node.val || 3 + Math.min(5, Math.ceil((node.difficulty || 1) / 2)),
      })),
      links: constellation.links || [],
    }
  }, [overview?.constellation])

  const handleSwitch = async (pathType) => {
    if (pathType === selectedPathType) return
    await updateSelectedPath(pathType)
  }

  if (!overview) {
    return (
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-slate-900">Mapa Dual</h2>
        <p className="mt-2 text-sm text-slate-500">Sincronizando tu perfil academico para cargar el mapa de grado y la constelacion autonoma...</p>
      </section>
    )
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-600">Dashboard Dual</p>
          <h2 className="mt-2 text-2xl font-bold text-slate-900">Mapa de grado + constelaciones</h2>
          <p className="mt-2 max-w-3xl text-sm text-slate-500">
            Alterna entre la progresion lineal por grado y el mapa autonomo por ramas. Si fallas repetidamente, el sistema puede reenviarte al ancestro necesario.
          </p>
        </div>
        <div className="flex rounded-2xl border border-slate-200 bg-slate-100 p-1.5 shadow-inner">
          <button
            type="button"
            onClick={() => handleSwitch('GRADE')}
            disabled={profileLoading}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${selectedPathType === 'GRADE' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
          >
            Vista de Mapa de Grado
          </button>
          <button
            type="button"
            onClick={() => handleSwitch('AUTONOMOUS')}
            disabled={profileLoading}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${selectedPathType === 'AUTONOMOUS' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
          >
            Mapa de Constelaciones
          </button>
        </div>
      </div>

      {selectedPathType === 'GRADE' && (
        <div className="mt-8 grid gap-6 lg:grid-cols-[1.25fr,0.75fr]">
          <div className="space-y-5">
            {(overview.gradeMap?.areas || []).map((bimester) => (
              <div key={bimester.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Bloque curricular</p>
                    <h3 className="text-lg font-semibold text-slate-900">{bimester.name}</h3>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                    {bimester.topics?.length || 0} unidades
                  </span>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {(bimester.topics || []).map((unit) => (
                    <div key={unit.id} className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-sm font-semibold text-slate-900">{unit.name}</p>
                      <div className="mt-3 space-y-2">
                        {(unit.lessons || []).map((lesson) => (
                          <div key={lesson.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2">
                            <div>
                              <p className="text-sm font-medium text-slate-800">{lesson.title}</p>
                              <p className="text-xs text-slate-500">Dificultad {lesson.difficulty} • Maestria {lesson.mastery || 0}%</p>
                            </div>
                            <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${lesson.status === 'COMPLETED' || lesson.mastery >= 85 ? 'bg-emerald-100 text-emerald-700' : lesson.isGateLesson ? 'bg-amber-100 text-amber-700' : 'bg-sky-100 text-sky-700'}`}>
                              {lesson.status === 'COMPLETED' || lesson.mastery >= 85 ? 'Completa' : lesson.isGateLesson ? 'Hito' : 'Activa'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl bg-slate-900 p-5 text-white shadow-lg">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-200">Ruta estructurada</p>
              <h3 className="mt-2 text-xl font-semibold">{overview.profile?.grade?.name || 'Ruta por grado'}</h3>
              <p className="mt-3 text-sm text-slate-200">{gradeSummary.completedLessons} de {gradeSummary.totalLessons} lecciones dominadas en tu grado actual.</p>
              <div className="mt-4 h-3 rounded-full bg-white/15">
                <div className="h-3 rounded-full bg-emerald-400" style={{ width: `${gradeSummary.mastery}%` }} />
              </div>
              <p className="mt-3 text-xs text-slate-300">Bloqueo de grado activo: no avanzas al siguiente nivel sin cerrar los hitos del actual.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Siguiente hito</p>
              <h3 className="mt-2 text-lg font-semibold text-slate-900">{gradeSummary.nextLesson?.title || 'Ruta del grado completa'}</h3>
              <p className="mt-2 text-sm text-slate-500">
                {gradeSummary.nextLesson ? `Dificultad ${gradeSummary.nextLesson.difficulty} • Maestria actual ${gradeSummary.nextLesson.mastery || 0}%` : 'Tu siguiente desbloqueo sera el grado siguiente cuando cierres el examen final.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {selectedPathType === 'AUTONOMOUS' && (
        <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr,0.8fr]">
          <div className="rounded-2xl border border-slate-200 p-4">
            <SkillGraph
              path="autonomo"
              graphData={graphData}
              onNodeClick={(node) => setSelectedNode(node)}
            />
          </div>
          <div className="space-y-4">
            <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-sky-900 p-5 text-white shadow-lg">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-200">Ruta adaptativa</p>
              <h3 className="mt-2 text-xl font-semibold">Constelacion activa</h3>
              <p className="mt-3 text-sm text-slate-200">
                {overview.constellation?.recommendation
                  ? `La siguiente skill sugerida es ${overview.constellation.recommendation.name}.`
                  : 'Aun no hay recomendacion prioritaria.'}
              </p>
              <p className="mt-3 text-sm text-slate-300">
                {overview.constellation?.ancestorRecommendation
                  ? `Si vuelves a fallar, el sistema te reenviara al ancestro ${overview.constellation.ancestorRecommendation.name}.`
                  : 'No hay ancestro critico pendiente por ahora.'}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Ramas</p>
              <div className="mt-3 space-y-3">
                {(overview.constellation?.branchProgress || []).slice(0, 7).map((branch) => (
                  <div key={branch.id}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-700">{branch.id}</span>
                      <span className="text-slate-500">{branch.mastery}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-200">
                      <div className="h-2 rounded-full bg-sky-500" style={{ width: `${branch.mastery}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Nodo seleccionado</p>
              <h3 className="mt-2 text-lg font-semibold text-slate-900">{selectedNode?.name || 'Selecciona un nodo en el mapa'}</h3>
              <p className="mt-2 text-sm text-slate-500">
                {selectedNode ? `${selectedNode.mastery || 0}% de maestria • estado ${selectedNode.state || 'sin estado'}` : 'Haz clic sobre una skill para ver su estado actual.'}
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
