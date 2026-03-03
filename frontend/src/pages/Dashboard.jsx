import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import brainLogo from '../assets/brain-logo.png'
import { useAuth } from '../context/AuthContext'
import { useProgress } from '../context/ProgressContext'
import { useCountUp } from '../hooks/useCountUp'
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

  const animatedProgress = useCountUp(progress, 900)
  const animatedStreak = useCountUp(currentStreak, 850)
  const animatedXp = useCountUp(xp, 950)
  const animatedCompletedCount = useCountUp(completedCount, 900)

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="cm-shell">
      <div className="cm-orb cm-orb-cyan left-[-7rem] top-[8rem] h-64 w-64" />
      <div className="cm-orb cm-orb-coral right-[-5rem] top-[22rem] h-52 w-52" />

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

      <main className="cm-page mx-auto max-w-5xl px-6 pt-20 pb-16">
        <section className="mx-auto mb-12 max-w-2xl space-y-6 text-center">
          <img src={brainLogo} alt="Mathlingo brain logo" className="cm-float mx-auto w-full max-w-32 drop-shadow-2xl" />
          <h1 className="cm-reveal cm-delay-1 text-3xl font-semibold tracking-tight">Hola, Usuario</h1>
          <p className="cm-reveal cm-delay-2 text-coastal-mist/55">Continua tu progreso en matematicas</p>
          <p className="cm-reveal cm-delay-3">
            <span className="cm-badge cm-badge-live">Nivel {level} en curso</span>
          </p>
        </section>

        <section className="cm-reveal cm-delay-2 mt-12 grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="cm-card space-y-6 p-6">
            <p className="text-sm text-coastal-mist/75">Progreso general</p>
            <div className="cm-progress-track">
              <div className="cm-progress-fill" style={{ width: `${Math.max(0, Math.min(100, animatedProgress))}%` }} />
            </div>
            <p className="text-sm text-coastal-mist/75">
              {animatedProgress}% completado
              {totalLessons > 0 ? ` (${animatedCompletedCount}/${totalLessons} lecciones)` : ''}
            </p>
          </div>

          <div className="space-y-6">
            <div className="cm-card p-6">
              <p className="text-xs tracking-wide text-coastal-mist/65">Racha activa</p>
              <p className="mt-2 text-lg font-semibold tracking-tight">{animatedStreak} dias seguidos</p>
            </div>

            <div className="cm-card space-y-6 p-6">
              <p className="text-lg font-semibold tracking-tight">Nivel {level}</p>
              <p className="text-sm text-coastal-mist/75">
                XP: {animatedXp} / {nextLevelXp}
              </p>
              <div className="cm-progress-track h-3">
                <div className="cm-progress-fill h-3" style={{ width: `${Math.max(0, Math.min(100, xpProgress))}%` }} />
              </div>
            </div>
          </div>
        </section>

        <section className="mt-12 space-y-4">
          <h2 className="cm-reveal text-xl font-semibold tracking-tight text-coastal-mist">Modulos Por Grado</h2>
          {loadingData && (
            <div className="space-y-3">
              <div className="cm-card p-6">
                <div className="cm-skeleton h-5 w-1/3" />
                <div className="cm-skeleton mt-4 h-4 w-3/4" />
                <div className="cm-skeleton mt-4 h-4 w-1/2" />
              </div>
              <div className="cm-card p-6">
                <div className="cm-skeleton h-5 w-1/4" />
                <div className="cm-skeleton mt-4 h-4 w-2/3" />
                <div className="cm-skeleton mt-4 h-4 w-1/3" />
              </div>
            </div>
          )}
          {!loadingData && gradesError && (
            <div className="rounded-2xl border border-red-600/40 bg-red-600/10 p-6 text-sm text-red-200 shadow-coastal">{gradesError}</div>
          )}
          {!loadingData && !gradesError && (
            <div className="cm-stagger space-y-4">
              {grades.map((grade) => {
                const gradeUnlocked = unlockedGradeIds.has(String(grade.id))
                return (
                  <article
                    key={grade.id}
                    onClick={() => {
                      if (!gradeUnlocked) return
                      navigate(`/course/${grade.id}`)
                    }}
                    className={`cm-card p-6 ${
                      gradeUnlocked ? 'cm-card-interactive' : 'cursor-not-allowed opacity-55'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h2 className="text-2xl font-semibold tracking-tight">{grade.title}</h2>
                      <span className={`cm-badge ${gradeUnlocked ? 'cm-badge-live' : 'cm-badge-locked'}`}>
                        {gradeUnlocked ? 'Desbloqueado' : 'Bloqueado'}
                      </span>
                    </div>
                    <p className="mt-2 text-coastal-mist/75">{grade.description}</p>
                    <p className="mt-4 text-sm font-semibold tracking-tight text-verdant-accent">
                      {grade.lessonCount} lecciones - {grade.examCount} examenes
                    </p>
                    {!gradeUnlocked && (
                      <p className="mt-2 text-xs text-amber-300">Completa academicamente el grado anterior para abrirlo.</p>
                    )}
                  </article>
                )
              })}
            </div>
          )}
        </section>

        <section className="mt-12 space-y-4">
          <h2 className="cm-reveal text-xl font-semibold tracking-tight text-coastal-mist">Modulos Por Rama</h2>
          {loadingData && (
            <div className="space-y-3">
              <div className="cm-card p-6">
                <div className="cm-skeleton h-5 w-1/3" />
                <div className="cm-skeleton mt-4 h-4 w-3/4" />
              </div>
              <div className="cm-card p-6">
                <div className="cm-skeleton h-5 w-1/4" />
                <div className="cm-skeleton mt-4 h-4 w-2/3" />
              </div>
            </div>
          )}
          {!loadingData && branchesError && (
            <div className="rounded-2xl border border-red-600/40 bg-red-600/10 p-6 text-sm text-red-200 shadow-coastal">{branchesError}</div>
          )}
          {!loadingData && !branchesError && (
            <div className="cm-stagger space-y-4">
              {branches.map((branch) => (
                <article
                  key={branch.id}
                  onClick={() => navigate(`/branch/${branch.id}`)}
                  className="cm-card cm-card-interactive p-6"
                >
                  <h3 className="text-2xl font-semibold tracking-tight">{branch.name}</h3>
                  <p className="mt-2 text-coastal-mist/75">{branch.description}</p>
                  <p className="mt-4 text-sm font-semibold tracking-tight text-verdant-accent">
                    {branch.lessonCount} lecciones en {branch.gradeCount} grados
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

export default Dashboard
