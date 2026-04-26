import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'

import { useAuth } from '../context/AuthContext'
import { academicApi } from '../services/academicApi'

const TABS = [
  { id: 'grades', label: 'Grados' },
  { id: 'subjects', label: 'Materias' },
  { id: 'paths', label: 'Rutas' },
  { id: 'users', label: 'Usuarios' },
]

const emptyGradeDraft = () => ({
  id: '',
  code: '',
  name: '',
  order: 1,
  stage: 'SECONDARY',
  levelName: 'Secundaria',
  foundationStyle: 'singapore-finland',
  isPreUniversity: false,
})

const emptySubjectDraft = () => ({
  id: '',
  code: '',
  name: '',
  description: '',
})

const emptyPathDraft = () => ({
  id: '',
  slug: '',
  name: '',
  description: '',
  type: 'GRADE',
  isAutonomous: false,
  isDefault: false,
  gradeId: '',
  subjectId: '',
})

const emptyUserDraft = () => ({
  id: '',
  fullName: '',
  role: 'STUDENT',
  gradeId: '',
  learningPathId: '',
  selectedPathType: 'GRADE',
  learningStyle: 'visual',
  gradeLockEnabled: true,
})

const toGradeDraft = (grade) => ({
  id: grade?.id || '',
  code: grade?.code || '',
  name: grade?.name || '',
  order: Number(grade?.order || 1),
  stage: grade?.stage || 'SECONDARY',
  levelName: grade?.levelName || 'Secundaria',
  foundationStyle: grade?.foundationStyle || 'singapore-finland',
  isPreUniversity: Boolean(grade?.isPreUniversity),
})

const toSubjectDraft = (subject) => ({
  id: subject?.id || '',
  code: subject?.code || '',
  name: subject?.name || '',
  description: subject?.description || '',
})

const toPathDraft = (path) => ({
  id: path?.id || '',
  slug: path?.slug || '',
  name: path?.name || '',
  description: path?.description || '',
  type: path?.type || 'GRADE',
  isAutonomous: Boolean(path?.isAutonomous),
  isDefault: Boolean(path?.isDefault),
  gradeId: path?.gradeId || '',
  subjectId: path?.subjectId || '',
})

const toUserDraft = (user) => ({
  id: user?.id || '',
  fullName: user?.fullName || '',
  role: user?.role || 'STUDENT',
  gradeId: user?.gradeId || '',
  learningPathId: user?.learningPathId || '',
  selectedPathType: user?.selectedPathType || 'GRADE',
  learningStyle: user?.learningStyle || 'visual',
  gradeLockEnabled: Boolean(user?.gradeLockEnabled),
})

const statusBadge = (value) => {
  if (value) return 'cm-badge cm-badge-live'
  return 'cm-badge cm-badge-locked'
}

const roleBadgeClass = (role) => {
  if (role === 'ADMIN') return 'cm-badge cm-badge-live'
  if (role === 'TEACHER') return 'cm-badge border-amber-400/40 bg-amber-400/15 text-amber-100'
  return 'cm-badge cm-badge-locked'
}

function TabButton({ active, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition-all ${
        active
          ? 'border-coastal-neon/50 bg-coastal-steel/70 text-coastal-mist shadow-lg'
          : 'border-coastal-steel/60 bg-coastal-ocean/45 text-coastal-mist/75 hover:border-coastal-neon/35'
      }`}
    >
      {label}
    </button>
  )
}

function StatTile({ label, value, hint }) {
  return (
    <section className="rounded-2xl border border-coastal-steel/60 bg-coastal-ocean/45 p-5 backdrop-blur-xl">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-coastal-mist/55">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-coastal-mist">{value}</p>
      <p className="mt-2 text-sm text-coastal-mist/65">{hint}</p>
    </section>
  )
}

function SectionShell({ title, subtitle, actions = null, children }) {
  return (
    <section className="rounded-3xl border border-coastal-steel/60 bg-coastal-ocean/45 p-6 backdrop-blur-xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-coastal-mist">{title}</h2>
          <p className="mt-2 text-sm text-coastal-mist/65">{subtitle}</p>
        </div>
        {actions}
      </div>
      <div className="mt-6">{children}</div>
    </section>
  )
}

function AdminPanel() {
  const { profile } = useAuth()

  const [activeTab, setActiveTab] = useState('grades')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [meta, setMeta] = useState({ grades: [], subjects: [], learningPaths: [], enums: { gradeStages: [], pathTypes: [], userRoles: [] } })
  const [grades, setGrades] = useState([])
  const [subjects, setSubjects] = useState([])
  const [paths, setPaths] = useState([])
  const [users, setUsers] = useState([])
  const [selectedIds, setSelectedIds] = useState({ grades: '', subjects: '', paths: '', users: '' })
  const [mode, setMode] = useState({ grades: 'edit', subjects: 'edit', paths: 'edit', users: 'edit' })
  const [gradeDraft, setGradeDraft] = useState(emptyGradeDraft())
  const [subjectDraft, setSubjectDraft] = useState(emptySubjectDraft())
  const [pathDraft, setPathDraft] = useState(emptyPathDraft())
  const [userDraft, setUserDraft] = useState(emptyUserDraft())

  const syncSelection = (items, key, preserveId, currentId) => {
    const safeItems = Array.isArray(items) ? items : []
    if (!safeItems.length) return ''
    const candidates = [preserveId, currentId].filter(Boolean)
    const found = candidates.find((candidate) => safeItems.some((item) => String(item.id) === String(candidate)))
    return found || String(safeItems[0].id)
  }

  const loadPanel = async (preserve = {}) => {
    setLoading(true)
    setError('')
    try {
      const [metaPayload, gradesPayload, subjectsPayload, pathsPayload, usersPayload] = await Promise.all([
        academicApi.getAdminMeta(),
        academicApi.getAdminGrades(),
        academicApi.getAdminSubjects(),
        academicApi.getAdminLearningPaths(),
        academicApi.getAdminUsers(),
      ])

      const nextGrades = gradesPayload?.grades || []
      const nextSubjects = subjectsPayload?.subjects || []
      const nextPaths = pathsPayload?.learningPaths || []
      const nextUsers = usersPayload?.users || []

      setMeta(metaPayload || { grades: [], subjects: [], learningPaths: [], enums: { gradeStages: [], pathTypes: [], userRoles: [] } })
      setGrades(nextGrades)
      setSubjects(nextSubjects)
      setPaths(nextPaths)
      setUsers(nextUsers)

      setSelectedIds((current) => ({
        grades: syncSelection(nextGrades, 'grades', preserve.grades, current.grades),
        subjects: syncSelection(nextSubjects, 'subjects', preserve.subjects, current.subjects),
        paths: syncSelection(nextPaths, 'paths', preserve.paths, current.paths),
        users: syncSelection(nextUsers, 'users', preserve.users, current.users),
      }))
    } catch (loadError) {
      setError(loadError?.message || 'No se pudo cargar el panel administrativo.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadPanel()
  }, [])

  const selectedGrade = useMemo(
    () => grades.find((item) => String(item.id) === String(selectedIds.grades)) || null,
    [grades, selectedIds.grades],
  )
  const selectedSubject = useMemo(
    () => subjects.find((item) => String(item.id) === String(selectedIds.subjects)) || null,
    [selectedIds.subjects, subjects],
  )
  const selectedPath = useMemo(
    () => paths.find((item) => String(item.id) === String(selectedIds.paths)) || null,
    [paths, selectedIds.paths],
  )
  const selectedUser = useMemo(
    () => users.find((item) => String(item.id) === String(selectedIds.users)) || null,
    [selectedIds.users, users],
  )

  useEffect(() => {
    if (mode.grades === 'edit') setGradeDraft(selectedGrade ? toGradeDraft(selectedGrade) : emptyGradeDraft())
  }, [mode.grades, selectedGrade])

  useEffect(() => {
    if (mode.subjects === 'edit') setSubjectDraft(selectedSubject ? toSubjectDraft(selectedSubject) : emptySubjectDraft())
  }, [mode.subjects, selectedSubject])

  useEffect(() => {
    if (mode.paths === 'edit') setPathDraft(selectedPath ? toPathDraft(selectedPath) : emptyPathDraft())
  }, [mode.paths, selectedPath])

  useEffect(() => {
    if (mode.users === 'edit') setUserDraft(selectedUser ? toUserDraft(selectedUser) : emptyUserDraft())
  }, [mode.users, selectedUser])

  const summary = useMemo(() => ({
    grades: grades.length,
    subjects: subjects.length,
    paths: paths.length,
    users: users.length,
  }), [grades.length, paths.length, subjects.length, users.length])

  const beginCreate = (tabId) => {
    setMode((current) => ({ ...current, [tabId]: 'create' }))
    if (tabId === 'grades') setGradeDraft(emptyGradeDraft())
    if (tabId === 'subjects') setSubjectDraft(emptySubjectDraft())
    if (tabId === 'paths') setPathDraft(emptyPathDraft())
  }

  const resumeEdit = (tabId) => {
    setMode((current) => ({ ...current, [tabId]: 'edit' }))
  }

  const saveGrade = async () => {
    const payload = {
      ...gradeDraft,
      order: Number(gradeDraft.order || 0),
      isPreUniversity: Boolean(gradeDraft.isPreUniversity),
    }

    if (!payload.code || !payload.name) throw new Error('Completa codigo y nombre del grado.')

    const response = mode.grades === 'create'
      ? await academicApi.createAdminGrade(payload)
      : await academicApi.updateAdminGrade(gradeDraft.id, payload)

    const nextId = response?.grade?.id || gradeDraft.id
    toast.success(mode.grades === 'create' ? 'Grado creado.' : 'Grado actualizado.')
    setMode((current) => ({ ...current, grades: 'edit' }))
    await loadPanel({ grades: nextId })
  }

  const saveSubject = async () => {
    const payload = { ...subjectDraft }
    if (!payload.code || !payload.name) throw new Error('Completa codigo y nombre de la materia.')

    const response = mode.subjects === 'create'
      ? await academicApi.createAdminSubject(payload)
      : await academicApi.updateAdminSubject(subjectDraft.id, payload)

    const nextId = response?.subject?.id || subjectDraft.id
    toast.success(mode.subjects === 'create' ? 'Materia creada.' : 'Materia actualizada.')
    setMode((current) => ({ ...current, subjects: 'edit' }))
    await loadPanel({ subjects: nextId })
  }

  const savePath = async () => {
    const payload = {
      ...pathDraft,
      gradeId: pathDraft.gradeId || null,
      subjectId: pathDraft.subjectId || null,
      isAutonomous: Boolean(pathDraft.isAutonomous || pathDraft.type === 'AUTONOMOUS'),
      isDefault: Boolean(pathDraft.isDefault),
    }

    if (!payload.name) throw new Error('La ruta necesita un nombre.')

    const response = mode.paths === 'create'
      ? await academicApi.createAdminLearningPath(payload)
      : await academicApi.updateAdminLearningPath(pathDraft.id, payload)

    const nextId = response?.learningPath?.id || pathDraft.id
    toast.success(mode.paths === 'create' ? 'Ruta creada.' : 'Ruta actualizada.')
    setMode((current) => ({ ...current, paths: 'edit' }))
    await loadPanel({ paths: nextId })
  }

  const saveUser = async () => {
    if (!userDraft.id) throw new Error('Selecciona un usuario para editar.')
    if (!userDraft.fullName || !userDraft.gradeId) throw new Error('El usuario necesita nombre y grado.')

    const response = await academicApi.updateAdminUser(userDraft.id, {
      fullName: userDraft.fullName,
      role: userDraft.role,
      gradeId: userDraft.gradeId,
      learningPathId: userDraft.learningPathId || null,
      selectedPathType: userDraft.selectedPathType,
      learningStyle: userDraft.learningStyle,
      gradeLockEnabled: Boolean(userDraft.gradeLockEnabled),
    })

    const nextId = response?.user?.id || userDraft.id
    toast.success('Usuario actualizado.')
    await loadPanel({ users: nextId })
  }

  const removeGrade = async () => {
    if (!selectedGrade) return
    if (!window.confirm(`Eliminar el grado ${selectedGrade.name}?`)) return
    await academicApi.deleteAdminGrade(selectedGrade.id)
    toast.success('Grado eliminado.')
    await loadPanel()
  }

  const removeSubject = async () => {
    if (!selectedSubject) return
    if (!window.confirm(`Eliminar la materia ${selectedSubject.name}?`)) return
    await academicApi.deleteAdminSubject(selectedSubject.id)
    toast.success('Materia eliminada.')
    await loadPanel()
  }

  const removePath = async () => {
    if (!selectedPath) return
    if (!window.confirm(`Eliminar la ruta ${selectedPath.name}?`)) return
    await academicApi.deleteAdminLearningPath(selectedPath.id)
    toast.success('Ruta eliminada.')
    await loadPanel()
  }

  const runSave = async () => {
    setSaving(true)
    try {
      if (activeTab === 'grades') await saveGrade()
      if (activeTab === 'subjects') await saveSubject()
      if (activeTab === 'paths') await savePath()
      if (activeTab === 'users') await saveUser()
    } catch (saveError) {
      toast.error(saveError?.message || 'No se pudo guardar el cambio.')
    } finally {
      setSaving(false)
    }
  }

  const runDelete = async () => {
    setSaving(true)
    try {
      if (activeTab === 'grades') await removeGrade()
      if (activeTab === 'subjects') await removeSubject()
      if (activeTab === 'paths') await removePath()
    } catch (removeError) {
      toast.error(removeError?.message || 'No se pudo eliminar el registro.')
    } finally {
      setSaving(false)
    }
  }

  const listItems = activeTab === 'grades' ? grades : activeTab === 'subjects' ? subjects : activeTab === 'paths' ? paths : users
  const selectedId = selectedIds[activeTab]

  const setSelectedForTab = (tabId, itemId) => {
    setSelectedIds((current) => ({ ...current, [tabId]: String(itemId) }))
    if (tabId === 'grades' || tabId === 'subjects' || tabId === 'paths' || tabId === 'users') {
      setMode((current) => ({ ...current, [tabId]: 'edit' }))
    }
  }

  const activeTitle = activeTab === 'grades' ? 'Gestor de grados' : activeTab === 'subjects' ? 'Gestor de materias' : activeTab === 'paths' ? 'Gestor de rutas' : 'Gestor de usuarios'
  const activeSubtitle = activeTab === 'grades'
    ? 'Edita la estructura escolar base que usa la plataforma.'
    : activeTab === 'subjects'
      ? 'Agrupa rutas por materia y deja catalogado el mapa academico.'
      : activeTab === 'paths'
        ? 'Configura recorridos por grado o autonomos para los estudiantes.'
        : 'Supervisa acceso, rol, grado y ruta activa de cada perfil.'

  const filteredPathsForUser = paths.filter((item) => {
    if (!userDraft.gradeId) return true
    if (!item.gradeId) return true
    return String(item.gradeId) === String(userDraft.gradeId)
  })

  return (
    <div className="cm-shell">
      <header className="cm-navbar">
        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-coastal-neon">Panel Admin</p>
            <p className="text-sm text-coastal-mist/70">{profile?.fullName || profile?.email}</p>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="cm-btn-secondary px-4 py-2 text-sm">
              Volver al dashboard
            </Link>
            <button type="button" onClick={() => void loadPanel()} className="cm-btn-primary px-4 py-2 text-sm" disabled={loading}>
              {loading ? 'Sincronizando...' : 'Recargar'}
            </button>
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-6 pt-20 pb-16">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatTile label="Grados" value={summary.grades} hint="Niveles escolares activos" />
          <StatTile label="Materias" value={summary.subjects} hint="Catalogo curricular administrable" />
          <StatTile label="Rutas" value={summary.paths} hint="Caminos pedagogicos disponibles" />
          <StatTile label="Usuarios" value={summary.users} hint="Perfiles sincronizados con Supabase" />
        </section>

        <section className="mt-8 flex flex-wrap gap-3">
          {TABS.map((tab) => (
            <TabButton key={tab.id} label={tab.label} active={activeTab === tab.id} onClick={() => setActiveTab(tab.id)} />
          ))}
        </section>

        {error && (
          <section className="mt-6 rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            {error}
          </section>
        )}

        <section className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(22rem,0.9fr)]">
          <SectionShell
            title={activeTitle}
            subtitle={activeSubtitle}
            actions={
              activeTab !== 'users' ? (
                <button type="button" onClick={() => beginCreate(activeTab)} className="cm-btn-secondary px-4 py-2 text-sm">
                  Nuevo registro
                </button>
              ) : null
            }
          >
            {loading ? (
              <div className="space-y-3">
                <div className="cm-skeleton h-12 w-full rounded-2xl" />
                <div className="cm-skeleton h-12 w-full rounded-2xl" />
                <div className="cm-skeleton h-12 w-full rounded-2xl" />
              </div>
            ) : !listItems.length ? (
              <div className="rounded-2xl border border-dashed border-coastal-steel/70 px-5 py-10 text-center text-sm text-coastal-mist/65">
                No hay registros disponibles en esta seccion.
              </div>
            ) : (
              <div className="space-y-3">
                {activeTab === 'grades' && grades.map((grade) => (
                  <button
                    key={grade.id}
                    type="button"
                    onClick={() => setSelectedForTab('grades', grade.id)}
                    className={`w-full rounded-2xl border px-4 py-4 text-left transition-all ${
                      String(selectedId) === String(grade.id)
                        ? 'border-coastal-neon/50 bg-coastal-steel/65'
                        : 'border-coastal-steel/60 bg-coastal-ocean/35 hover:border-coastal-neon/35'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-coastal-mist/55">{grade.code} • Orden {grade.order}</p>
                        <h3 className="mt-2 text-lg font-semibold text-coastal-mist">{grade.name}</h3>
                        <p className="mt-1 text-sm text-coastal-mist/65">{grade.levelName} • {grade.stage}</p>
                      </div>
                      <div className="text-right text-xs text-coastal-mist/65">
                        <p>{grade.counts.users} usuarios</p>
                        <p>{grade.counts.routes} rutas</p>
                      </div>
                    </div>
                  </button>
                ))}
                {activeTab === 'subjects' && subjects.map((subject) => (
                  <button
                    key={subject.id}
                    type="button"
                    onClick={() => setSelectedForTab('subjects', subject.id)}
                    className={`w-full rounded-2xl border px-4 py-4 text-left transition-all ${
                      String(selectedId) === String(subject.id)
                        ? 'border-coastal-neon/50 bg-coastal-steel/65'
                        : 'border-coastal-steel/60 bg-coastal-ocean/35 hover:border-coastal-neon/35'
                    }`}
                  >
                    <p className="text-xs uppercase tracking-[0.18em] text-coastal-mist/55">{subject.code}</p>
                    <h3 className="mt-2 text-lg font-semibold text-coastal-mist">{subject.name}</h3>
                    <p className="mt-1 text-sm text-coastal-mist/65 line-clamp-2">{subject.description}</p>
                    <p className="mt-3 text-xs text-coastal-mist/55">{subject.counts.routes} rutas asociadas</p>
                  </button>
                ))}
                {activeTab === 'paths' && paths.map((path) => (
                  <button
                    key={path.id}
                    type="button"
                    onClick={() => setSelectedForTab('paths', path.id)}
                    className={`w-full rounded-2xl border px-4 py-4 text-left transition-all ${
                      String(selectedId) === String(path.id)
                        ? 'border-coastal-neon/50 bg-coastal-steel/65'
                        : 'border-coastal-steel/60 bg-coastal-ocean/35 hover:border-coastal-neon/35'
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-coastal-mist/55">{path.type} • {path.slug}</p>
                        <h3 className="mt-2 text-lg font-semibold text-coastal-mist">{path.name}</h3>
                        <p className="mt-1 text-sm text-coastal-mist/65">{path.subject?.name || 'Sin materia'} • {path.grade?.name || 'Sin grado'}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className={statusBadge(path.isDefault)}>{path.isDefault ? 'Default' : 'Activa'}</span>
                        <span className="text-xs text-coastal-mist/55">{path.userCount} usuarios</span>
                      </div>
                    </div>
                  </button>
                ))}
                {activeTab === 'users' && users.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => setSelectedForTab('users', user.id)}
                    className={`w-full rounded-2xl border px-4 py-4 text-left transition-all ${
                      String(selectedId) === String(user.id)
                        ? 'border-coastal-neon/50 bg-coastal-steel/65'
                        : 'border-coastal-steel/60 bg-coastal-ocean/35 hover:border-coastal-neon/35'
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-coastal-mist/55">{user.email}</p>
                        <h3 className="mt-2 text-lg font-semibold text-coastal-mist">{user.fullName}</h3>
                        <p className="mt-1 text-sm text-coastal-mist/65">{user.grade?.name || 'Sin grado'} • {user.learningPath?.name || 'Sin ruta'}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className={roleBadgeClass(user.role)}>{user.role}</span>
                        <span className="text-xs text-coastal-mist/55">Nivel {user.currentLevel} • XP {user.totalXP}</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </SectionShell>

          <SectionShell
            title={activeTab === 'users' ? 'Editor de usuario' : mode[activeTab] === 'create' ? 'Crear registro' : 'Editar registro'}
            subtitle={activeTab === 'users'
              ? 'Ajusta el acceso y la ruta de cada perfil.'
              : mode[activeTab] === 'create'
                ? 'Completa los campos y guarda para registrar un nuevo elemento.'
                : 'Modifica la configuracion del elemento seleccionado.'}
            actions={
              <div className="flex flex-wrap gap-3">
                {activeTab !== 'users' && mode[activeTab] === 'create' && (
                  <button type="button" onClick={() => resumeEdit(activeTab)} className="cm-btn-secondary px-4 py-2 text-sm">
                    Cancelar
                  </button>
                )}
                {activeTab !== 'users' && mode[activeTab] === 'edit' && selectedId && (
                  <button type="button" onClick={() => void runDelete()} className="cm-btn-secondary px-4 py-2 text-sm" disabled={saving}>
                    Eliminar
                  </button>
                )}
                <button type="button" onClick={() => void runSave()} className="cm-btn-primary px-4 py-2 text-sm" disabled={saving || loading}>
                  {saving ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </div>
            }
          >
            {activeTab === 'grades' && (
              <div className="grid gap-4">
                <label>
                  <span className="mb-2 block text-sm text-coastal-mist/80">ID tecnico</span>
                  <input className="cm-input" value={gradeDraft.id} onChange={(event) => setGradeDraft((current) => ({ ...current, id: event.target.value }))} disabled={mode.grades === 'edit'} />
                </label>
                <div className="grid gap-4 md:grid-cols-2">
                  <label>
                    <span className="mb-2 block text-sm text-coastal-mist/80">Codigo</span>
                    <input className="cm-input" value={gradeDraft.code} onChange={(event) => setGradeDraft((current) => ({ ...current, code: event.target.value.toUpperCase() }))} />
                  </label>
                  <label>
                    <span className="mb-2 block text-sm text-coastal-mist/80">Orden</span>
                    <input type="number" className="cm-input" value={gradeDraft.order} onChange={(event) => setGradeDraft((current) => ({ ...current, order: Number(event.target.value) }))} />
                  </label>
                </div>
                <label>
                  <span className="mb-2 block text-sm text-coastal-mist/80">Nombre</span>
                  <input className="cm-input" value={gradeDraft.name} onChange={(event) => setGradeDraft((current) => ({ ...current, name: event.target.value }))} />
                </label>
                <div className="grid gap-4 md:grid-cols-2">
                  <label>
                    <span className="mb-2 block text-sm text-coastal-mist/80">Etapa</span>
                    <select className="cm-input" value={gradeDraft.stage} onChange={(event) => setGradeDraft((current) => ({ ...current, stage: event.target.value }))}>
                      {(meta?.enums?.gradeStages || ['PRIMARY', 'SECONDARY', 'PRE_UNIVERSITY']).map((stage) => (
                        <option key={stage} value={stage}>{stage}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span className="mb-2 block text-sm text-coastal-mist/80">Nivel visible</span>
                    <input className="cm-input" value={gradeDraft.levelName} onChange={(event) => setGradeDraft((current) => ({ ...current, levelName: event.target.value }))} />
                  </label>
                </div>
                <label>
                  <span className="mb-2 block text-sm text-coastal-mist/80">Foundation style</span>
                  <input className="cm-input" value={gradeDraft.foundationStyle} onChange={(event) => setGradeDraft((current) => ({ ...current, foundationStyle: event.target.value }))} />
                </label>
                <label className="flex items-center gap-3 rounded-2xl border border-coastal-steel/60 bg-coastal-ocean/30 px-4 py-3 text-sm text-coastal-mist/85">
                  <input type="checkbox" checked={gradeDraft.isPreUniversity} onChange={(event) => setGradeDraft((current) => ({ ...current, isPreUniversity: event.target.checked }))} />
                  Marcar como grado preuniversitario
                </label>
              </div>
            )}

            {activeTab === 'subjects' && (
              <div className="grid gap-4">
                <label>
                  <span className="mb-2 block text-sm text-coastal-mist/80">ID tecnico</span>
                  <input className="cm-input" value={subjectDraft.id} onChange={(event) => setSubjectDraft((current) => ({ ...current, id: event.target.value }))} disabled={mode.subjects === 'edit'} />
                </label>
                <div className="grid gap-4 md:grid-cols-2">
                  <label>
                    <span className="mb-2 block text-sm text-coastal-mist/80">Codigo</span>
                    <input className="cm-input" value={subjectDraft.code} onChange={(event) => setSubjectDraft((current) => ({ ...current, code: event.target.value.toUpperCase() }))} />
                  </label>
                  <label>
                    <span className="mb-2 block text-sm text-coastal-mist/80">Nombre</span>
                    <input className="cm-input" value={subjectDraft.name} onChange={(event) => setSubjectDraft((current) => ({ ...current, name: event.target.value }))} />
                  </label>
                </div>
                <label>
                  <span className="mb-2 block text-sm text-coastal-mist/80">Descripcion</span>
                  <textarea className="cm-input min-h-32" value={subjectDraft.description} onChange={(event) => setSubjectDraft((current) => ({ ...current, description: event.target.value }))} />
                </label>
              </div>
            )}

            {activeTab === 'paths' && (
              <div className="grid gap-4">
                <label>
                  <span className="mb-2 block text-sm text-coastal-mist/80">ID tecnico</span>
                  <input className="cm-input" value={pathDraft.id} onChange={(event) => setPathDraft((current) => ({ ...current, id: event.target.value }))} disabled={mode.paths === 'edit'} />
                </label>
                <div className="grid gap-4 md:grid-cols-2">
                  <label>
                    <span className="mb-2 block text-sm text-coastal-mist/80">Nombre</span>
                    <input className="cm-input" value={pathDraft.name} onChange={(event) => setPathDraft((current) => ({ ...current, name: event.target.value }))} />
                  </label>
                  <label>
                    <span className="mb-2 block text-sm text-coastal-mist/80">Slug</span>
                    <input className="cm-input" value={pathDraft.slug} onChange={(event) => setPathDraft((current) => ({ ...current, slug: event.target.value }))} />
                  </label>
                </div>
                <label>
                  <span className="mb-2 block text-sm text-coastal-mist/80">Descripcion</span>
                  <textarea className="cm-input min-h-28" value={pathDraft.description} onChange={(event) => setPathDraft((current) => ({ ...current, description: event.target.value }))} />
                </label>
                <div className="grid gap-4 md:grid-cols-2">
                  <label>
                    <span className="mb-2 block text-sm text-coastal-mist/80">Tipo</span>
                    <select className="cm-input" value={pathDraft.type} onChange={(event) => setPathDraft((current) => ({ ...current, type: event.target.value, isAutonomous: event.target.value === 'AUTONOMOUS' ? true : current.isAutonomous }))}>
                      {(meta?.enums?.pathTypes || ['GRADE', 'AUTONOMOUS', 'HYBRID']).map((type) => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span className="mb-2 block text-sm text-coastal-mist/80">Grado asociado</span>
                    <select className="cm-input" value={pathDraft.gradeId} onChange={(event) => setPathDraft((current) => ({ ...current, gradeId: event.target.value }))}>
                      <option value="">Sin grado fijo</option>
                      {(meta?.grades || []).map((grade) => (
                        <option key={grade.id} value={grade.id}>{grade.name}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <label>
                  <span className="mb-2 block text-sm text-coastal-mist/80">Materia asociada</span>
                  <select className="cm-input" value={pathDraft.subjectId} onChange={(event) => setPathDraft((current) => ({ ...current, subjectId: event.target.value }))}>
                    <option value="">Sin materia fija</option>
                    {(meta?.subjects || []).map((subject) => (
                      <option key={subject.id} value={subject.id}>{subject.name}</option>
                    ))}
                  </select>
                </label>
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="flex items-center gap-3 rounded-2xl border border-coastal-steel/60 bg-coastal-ocean/30 px-4 py-3 text-sm text-coastal-mist/85">
                    <input type="checkbox" checked={pathDraft.isAutonomous} onChange={(event) => setPathDraft((current) => ({ ...current, isAutonomous: event.target.checked }))} />
                    Ruta autonoma
                  </label>
                  <label className="flex items-center gap-3 rounded-2xl border border-coastal-steel/60 bg-coastal-ocean/30 px-4 py-3 text-sm text-coastal-mist/85">
                    <input type="checkbox" checked={pathDraft.isDefault} onChange={(event) => setPathDraft((current) => ({ ...current, isDefault: event.target.checked }))} />
                    Usar como default
                  </label>
                </div>
              </div>
            )}

            {activeTab === 'users' && (
              <div className="grid gap-4">
                <label>
                  <span className="mb-2 block text-sm text-coastal-mist/80">Nombre completo</span>
                  <input className="cm-input" value={userDraft.fullName} onChange={(event) => setUserDraft((current) => ({ ...current, fullName: event.target.value }))} />
                </label>
                <div className="grid gap-4 md:grid-cols-2">
                  <label>
                    <span className="mb-2 block text-sm text-coastal-mist/80">Rol</span>
                    <select className="cm-input" value={userDraft.role} onChange={(event) => setUserDraft((current) => ({ ...current, role: event.target.value }))}>
                      {(meta?.enums?.userRoles || ['STUDENT', 'TEACHER', 'ADMIN']).map((role) => (
                        <option key={role} value={role}>{role}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span className="mb-2 block text-sm text-coastal-mist/80">Learning style</span>
                    <input className="cm-input" value={userDraft.learningStyle} onChange={(event) => setUserDraft((current) => ({ ...current, learningStyle: event.target.value }))} />
                  </label>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <label>
                    <span className="mb-2 block text-sm text-coastal-mist/80">Grado</span>
                    <select className="cm-input" value={userDraft.gradeId} onChange={(event) => setUserDraft((current) => ({ ...current, gradeId: event.target.value }))}>
                      {(meta?.grades || []).map((grade) => (
                        <option key={grade.id} value={grade.id}>{grade.name}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span className="mb-2 block text-sm text-coastal-mist/80">Modo de ruta</span>
                    <select className="cm-input" value={userDraft.selectedPathType} onChange={(event) => setUserDraft((current) => ({ ...current, selectedPathType: event.target.value }))}>
                      {(meta?.enums?.pathTypes || ['GRADE', 'AUTONOMOUS', 'HYBRID']).map((type) => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <label>
                  <span className="mb-2 block text-sm text-coastal-mist/80">Ruta</span>
                  <select className="cm-input" value={userDraft.learningPathId} onChange={(event) => setUserDraft((current) => ({ ...current, learningPathId: event.target.value }))}>
                    <option value="">Resolver automaticamente segun tipo</option>
                    {filteredPathsForUser.map((path) => (
                      <option key={path.id} value={path.id}>{path.name} • {path.type}</option>
                    ))}
                  </select>
                </label>
                <label className="flex items-center gap-3 rounded-2xl border border-coastal-steel/60 bg-coastal-ocean/30 px-4 py-3 text-sm text-coastal-mist/85">
                  <input type="checkbox" checked={userDraft.gradeLockEnabled} onChange={(event) => setUserDraft((current) => ({ ...current, gradeLockEnabled: event.target.checked }))} />
                  Mantener bloqueo por grado activo
                </label>
              </div>
            )}
          </SectionShell>
        </section>
      </main>
    </div>
  )
}

export default AdminPanel
