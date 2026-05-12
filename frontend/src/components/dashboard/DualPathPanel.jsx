import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useAuth } from '../../context/AuthContext'
import { encodeLessonRouteId } from '../../lib/academicCurriculum'
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
  const navigate = useNavigate()
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

  const getLessonRouteId = (lesson) => {
    if (lesson?.routeId) return lesson.routeId
    const gradeId = lesson?.gradeId || profile?.grade?.id
    const topicId = lesson?.topicId
    const lessonId = lesson?.lessonId || lesson?.id
    if (!gradeId || !topicId || !lessonId) return ''
    return encodeLessonRouteId({ gradeId, topicId, lessonId })
  }

  const openLesson = (lesson) => {
    const routeId = getLessonRouteId(lesson)
    if (routeId) navigate(`/lesson/${routeId}`)
  }

  const openGrade = () => {
    if (profile?.grade?.id) navigate(`/course/${profile.grade.id}`)
  }

  if (!overview) {
    return (
      <section className="math-dashboard-card p-6">
        <p className="text-xs font-black text-teal-700">Mapa dual</p>
        <h2 className="mt-2 text-2xl font-black text-slate-950">Sincronizando perfil academico</h2>
        <p className="mt-2 text-sm font-medium text-slate-500">
          Cargando el mapa de grado y la constelacion autonoma.
        </p>
      </section>
    )
  }

  return (
    <section className="math-dashboard-card p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-black text-teal-700">Mapa dual</p>
          <h2 className="mt-2 text-2xl font-black text-slate-950">Grado + constelaciones</h2>
          <p className="mt-2 max-w-3xl text-sm font-medium text-slate-500">
            Alterna entre la ruta curricular y un mapa autonomo por habilidades. El sistema prioriza los prerequisitos cuando detecta errores repetidos.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {profile?.grade?.id && (
            <button type="button" onClick={openGrade} className="cm-btn-primary px-4 py-2 text-sm">
              Ver lecciones
            </button>
          )}
          <div className="flex rounded-lg border border-slate-200 bg-white p-1 shadow-inner">
            <button
              type="button"
              onClick={() => handleSwitch('GRADE')}
              disabled={profileLoading}
              className={`rounded-lg px-4 py-2 text-sm font-black transition ${selectedPathType === 'GRADE' ? 'bg-teal-700 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              Mapa de grado
            </button>
            <button
              type="button"
              onClick={() => handleSwitch('AUTONOMOUS')}
              disabled={profileLoading}
              className={`rounded-lg px-4 py-2 text-sm font-black transition ${selectedPathType === 'AUTONOMOUS' ? 'bg-teal-700 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              Constelaciones
            </button>
          </div>
        </div>
      </div>

      {selectedPathType === 'GRADE' && (
        <div className="mt-8 grid gap-6 lg:grid-cols-[1.25fr,0.75fr]">
          <div className="space-y-5">
            {(overview.gradeMap?.areas || []).map((bimester) => (
              <div key={bimester.id} className="rounded-lg border border-slate-200 bg-white/80 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-black text-slate-400">Bloque curricular</p>
                    <h3 className="text-lg font-black text-slate-950">{bimester.name}</h3>
                  </div>
                  <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-black text-teal-700">
                    {bimester.topics?.length || 0} unidades
                  </span>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {(bimester.topics || []).map((unit) => (
                    <div key={unit.id} className="rounded-lg border border-slate-100 bg-slate-50 p-4">
                      <p className="text-sm font-black text-slate-900">{unit.name}</p>
                      <div className="mt-3 space-y-2">
                        {(unit.lessons || []).map((lesson) => (
                          <div key={lesson.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2">
                            <div>
                              <p className="text-sm font-bold text-slate-800">{lesson.title}</p>
                              <p className="text-xs font-medium text-slate-500">
                                Dificultad {lesson.difficulty} | Maestria {lesson.mastery || 0}%
                              </p>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                              <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${lesson.status === 'COMPLETED' || lesson.mastery >= 85 ? 'bg-emerald-100 text-emerald-700' : lesson.isGateLesson ? 'bg-amber-100 text-amber-700' : 'bg-teal-100 text-teal-700'}`}>
                                {lesson.status === 'COMPLETED' || lesson.mastery >= 85 ? 'Completa' : lesson.isGateLesson ? 'Hito' : 'Activa'}
                              </span>
                              <button
                                type="button"
                                onClick={() => openLesson(lesson)}
                                className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-black text-slate-700 transition hover:border-teal-300 hover:bg-teal-50"
                              >
                                Practicar
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <aside className="space-y-4">
            <div className="rounded-lg bg-slate-950 p-5 text-white shadow-lg">
              <p className="text-xs font-black text-teal-200">Ruta estructurada</p>
              <h3 className="mt-2 text-xl font-black">{overview.profile?.grade?.name || 'Ruta por grado'}</h3>
              <p className="mt-3 text-sm font-medium text-slate-200">
                {gradeSummary.completedLessons} de {gradeSummary.totalLessons} lecciones dominadas.
              </p>
              <div className="mt-4 h-3 rounded-full bg-white/15">
                <div className="h-3 rounded-full bg-emerald-400" style={{ width: `${gradeSummary.mastery}%` }} />
              </div>
              <p className="mt-3 text-xs font-medium text-slate-300">
                Avanzas con evidencia: los hitos mantienen orden y solidez.
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-5">
              <p className="text-xs font-black text-slate-400">Siguiente hito</p>
              <h3 className="mt-2 text-lg font-black text-slate-950">
                {gradeSummary.nextLesson?.title || 'Ruta del grado completa'}
              </h3>
              <p className="mt-2 text-sm font-medium text-slate-500">
                {gradeSummary.nextLesson
                  ? `Dificultad ${gradeSummary.nextLesson.difficulty} | Maestria actual ${gradeSummary.nextLesson.mastery || 0}%`
                  : 'El siguiente desbloqueo sera el grado siguiente.'}
              </p>
              {gradeSummary.nextLesson && (
                <button type="button" onClick={() => openLesson(gradeSummary.nextLesson)} className="cm-btn-primary mt-4 px-4 py-2 text-sm">
                  Practicar ahora
                </button>
              )}
            </div>
          </aside>
        </div>
      )}

      {selectedPathType === 'AUTONOMOUS' && (
        <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr,0.8fr]">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <SkillGraph path="autonomo" graphData={graphData} onNodeClick={(node) => setSelectedNode(node)} />
          </div>
          <aside className="space-y-4">
            <div className="rounded-lg bg-slate-950 p-5 text-white shadow-lg">
              <p className="text-xs font-black text-teal-200">Ruta adaptativa</p>
              <h3 className="mt-2 text-xl font-black">Constelacion activa</h3>
              <p className="mt-3 text-sm font-medium text-slate-200">
                {overview.constellation?.recommendation
                  ? `Siguiente habilidad sugerida: ${overview.constellation.recommendation.name}.`
                  : 'Aun no hay recomendacion prioritaria.'}
              </p>
              <p className="mt-3 text-sm font-medium text-slate-300">
                {overview.constellation?.ancestorRecommendation
                  ? `Si vuelves a fallar, revisa el prerequisito ${overview.constellation.ancestorRecommendation.name}.`
                  : 'No hay prerequisito critico pendiente por ahora.'}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-5">
              <p className="text-xs font-black text-slate-400">Ramas</p>
              <div className="mt-3 space-y-3">
                {(overview.constellation?.branchProgress || []).slice(0, 7).map((branch) => (
                  <div key={branch.id}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-bold text-slate-700">{branch.id}</span>
                      <span className="font-black text-slate-600">{branch.mastery}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-200">
                      <div className="h-2 rounded-full bg-teal-600" style={{ width: `${branch.mastery}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-5">
              <p className="text-xs font-black text-slate-400">Nodo seleccionado</p>
              <h3 className="mt-2 text-lg font-black text-slate-950">
                {selectedNode?.name || 'Selecciona un nodo en el mapa'}
              </h3>
              <p className="mt-2 text-sm font-medium text-slate-500">
                {selectedNode
                  ? `${selectedNode.mastery || 0}% de maestria | estado ${selectedNode.state || 'sin estado'}`
                  : 'Cada nodo representa una habilidad matematica y sus prerequisitos.'}
              </p>
            </div>
          </aside>
        </div>
      )}
    </section>
  )
}
