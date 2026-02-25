import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import brainLogo from '../assets/brain-logo.png'
import { useAuth } from '../context/AuthContext'
import { useProgress } from '../context/ProgressContext'
import { getUnlockedGradeIds, summarizeGradeForCard } from '../lib/academicCurriculum'
import { academicApi } from '../services/academicApi'

function Dashboard() {
  const navigate = useNavigate()
  const { logout } = useAuth()
  const { completedLessons, xp, level, currentStreak } = useProgress()

  const [grades, setGrades] = useState([])
  const [gradeDetails, setGradeDetails] = useState([])
  const [branches, setBranches] = useState([])
  const [loadingData, setLoadingData] = useState(true)
  const [gradesError, setGradesError] = useState('')
  const [branchesError, setBranchesError] = useState('')

  useEffect(() => {
    let isMounted = true

    const loadDashboardData = async () => {
      try {
        setLoadingData(true)
        setGradesError('')
        setBranchesError('')

        const [curriculumPayload, branchesPayload] = await Promise.all([
          academicApi.getCurriculum(),
          academicApi.getBranches(),
        ])
        if (!isMounted) return

        const gradeCards = (curriculumPayload?.grades || [])
          .map((grade) => summarizeGradeForCard(grade))
          .sort((a, b) => a.gradeNumber - b.gradeNumber)
        const fullGradeRows = (curriculumPayload?.grades || []).slice().sort((a, b) => {
          return Number(a?.gradeNumber || 0) - Number(b?.gradeNumber || 0)
        })

        const branchCards = (branchesPayload?.branches || [])
          .map((branch) => ({
            id: branch.id,
            name: branch.name || branch.id,
            description: branch.description || '',
            lessonCount: Number(branch.lessonCount || 0),
            gradeCount: Number(branch.gradeCount || 0),
          }))
          .sort((a, b) => b.lessonCount - a.lessonCount || a.name.localeCompare(b.name))

        setGrades(gradeCards)
        setGradeDetails(fullGradeRows)
        setBranches(branchCards)
      } catch (error) {
        if (!isMounted) return
        setGradesError(error?.message || 'No se pudo cargar el plan academico por grados.')
        setBranchesError(error?.message || 'No se pudo cargar los modulos por rama.')
      } finally {
        if (isMounted) setLoadingData(false)
      }
    }

    void loadDashboardData()

    return () => {
      isMounted = false
    }
  }, [])

  const totalLessons = useMemo(() => grades.reduce((acc, grade) => acc + Number(grade.lessonCount || 0), 0), [grades])
  const completedCount = Math.min(completedLessons.length, totalLessons)
  const progress = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0
  const xpProgress = xp % 100
  const nextLevelXp = level * 100
  const unlockedGradeIds = useMemo(() => {
    return new Set(
      getUnlockedGradeIds({
        grades: gradeDetails,
        completedLessons,
      }),
    )
  }, [completedLessons, gradeDetails])

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="cm-shell">
      <header className="cm-navbar">
        <nav className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <Link
            to="/"
            className="text-lg font-semibold tracking-wide text-coastal-neon transition-all duration-200 hover:opacity-90 sm:text-xl"
          >
            Mathlingo
          </Link>
          <button type="button" onClick={handleLogout} className="cm-btn-secondary bg-transparent px-4 py-2 text-sm">
            Cerrar sesion
          </button>
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-6 pt-20 pb-16">
        <section className="mx-auto mb-12 max-w-2xl space-y-6 text-center">
          <img src={brainLogo} alt="Mathlingo brain logo" className="mx-auto w-full max-w-32 drop-shadow-2xl" />
          <h1 className="text-3xl font-semibold tracking-tight">Hola, Usuario</h1>
          <p className="text-coastal-mist/55">Continua tu progreso en matematicas</p>
        </section>

        <section className="mt-12 grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="cm-card space-y-6 p-6">
            <p className="text-sm text-coastal-mist/75">Progreso general</p>
            <div className="h-4 w-full rounded-full bg-coastal-steel">
              <div className="h-4 rounded-full bg-coastal-wave transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-sm text-coastal-mist/75">
              {progress}% completado
              {totalLessons > 0 ? ` (${completedCount}/${totalLessons} lecciones)` : ''}
            </p>
          </div>

          <div className="space-y-6">
            <div className="cm-card p-6">
              <p className="text-lg font-semibold tracking-tight">{currentStreak} dias seguidos</p>
            </div>

            <div className="cm-card space-y-6 p-6">
              <p className="text-lg font-semibold tracking-tight">Nivel {level}</p>
              <p className="text-sm text-coastal-mist/75">
                XP: {xp} / {nextLevelXp}
              </p>
              <div className="h-3 w-full rounded-full bg-coastal-steel">
                <div className="h-3 rounded-full bg-coastal-wave transition-all duration-500" style={{ width: `${xpProgress}%` }} />
              </div>
            </div>
          </div>
        </section>

        <section className="mt-12 space-y-4">
          <h2 className="text-xl font-semibold tracking-tight text-coastal-mist">Modulos Por Grado</h2>
          {loadingData && <div className="cm-card p-6 text-sm text-coastal-mist/75">Cargando modulos por grado...</div>}
          {!loadingData && gradesError && (
            <div className="rounded-2xl border border-red-600/40 bg-red-600/10 p-6 text-sm text-red-200 shadow-coastal">{gradesError}</div>
          )}
          {!loadingData &&
            !gradesError &&
            grades.map((grade) => {
              const gradeUnlocked = unlockedGradeIds.has(String(grade.id))
              return (
                <article
                  key={grade.id}
                  onClick={() => {
                    if (!gradeUnlocked) return
                    navigate(`/course/${grade.id}`)
                  }}
                  className={`cm-card p-6 ${
                    gradeUnlocked
                      ? 'cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:bg-coastal-steel/80'
                      : 'cursor-not-allowed opacity-55'
                  }`}
                >
                  <h2 className="text-2xl font-semibold tracking-tight">{grade.title}</h2>
                  <p className="mt-2 text-coastal-mist/75">{grade.description}</p>
                  <p className="mt-4 text-sm font-semibold tracking-tight text-verdant-accent">
                    {grade.lessonCount} lecciones - {grade.examCount} examenes
                  </p>
                  <p className={`mt-2 text-xs ${gradeUnlocked ? 'text-emerald-300' : 'text-amber-300'}`}>
                    {gradeUnlocked ? 'Desbloqueado' : 'Bloqueado: completa academicamente el grado anterior'}
                  </p>
                </article>
              )
            })}
        </section>

        <section className="mt-12 space-y-4">
          <h2 className="text-xl font-semibold tracking-tight text-coastal-mist">Modulos Por Rama</h2>
          {loadingData && <div className="cm-card p-6 text-sm text-coastal-mist/75">Cargando modulos por rama...</div>}
          {!loadingData && branchesError && (
            <div className="rounded-2xl border border-red-600/40 bg-red-600/10 p-6 text-sm text-red-200 shadow-coastal">{branchesError}</div>
          )}
          {!loadingData &&
            !branchesError &&
            branches.map((branch) => (
              <article
                key={branch.id}
                onClick={() => navigate(`/branch/${branch.id}`)}
                className="cm-card cursor-pointer p-6 transition-all duration-200 hover:-translate-y-0.5 hover:bg-coastal-steel/80"
              >
                <h3 className="text-2xl font-semibold tracking-tight">{branch.name}</h3>
                <p className="mt-2 text-coastal-mist/75">{branch.description}</p>
                <p className="mt-4 text-sm font-semibold tracking-tight text-verdant-accent">
                  {branch.lessonCount} lecciones en {branch.gradeCount} grados
                </p>
              </article>
            ))}
        </section>
      </main>
    </div>
  )
}

export default Dashboard
