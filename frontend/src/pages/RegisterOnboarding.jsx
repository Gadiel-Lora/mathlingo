import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { useAuth } from '../context/AuthContext'
import { academicApi } from '../services/academicApi'

const PATH_OPTIONS = [
  { id: 'GRADE', title: 'Mapa de Grado', description: 'Avance lineal con bloqueo por hitos del grado.' },
  { id: 'AUTONOMOUS', title: 'Constelaciones', description: 'Ruta adaptativa por ramas con recomendaciones ancestro.' },
]

const getCurriculumGrades = (payload) => {
  if (Array.isArray(payload?.grades)) return payload.grades
  if (Array.isArray(payload?.levels)) return payload.levels
  return []
}

export default function RegisterOnboarding() {
  const navigate = useNavigate()
  const { user, profile, register, syncProfile } = useAuth()

  const [step, setStep] = useState(user ? 2 : 1)
  const [email, setEmail] = useState(user?.email || '')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || user?.user_metadata?.name || '')
  const [gradeId, setGradeId] = useState(profile?.grade?.id || '')
  const [selectedPathType, setSelectedPathType] = useState(profile?.selectedPathType || 'GRADE')
  const [grades, setGrades] = useState([])
  const [gradesLoading, setGradesLoading] = useState(true)
  const [gradesError, setGradesError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState({ type: '', message: '' })

  const loadGrades = async () => {
    setGradesLoading(true)
    setGradesError('')
    try {
      const response = await academicApi.getCurriculum()
      const nextGrades = getCurriculumGrades(response)
      setGrades(nextGrades)
      if (!nextGrades.length) {
        setGradesError('No encontramos grados disponibles en el curriculum.')
      }
    } catch (error) {
      console.error('Error cargando grados:', error)
      setGrades([])
      setGradesError('No se pudieron cargar los grados. Revisa que el backend academico este activo.')
    } finally {
      setGradesLoading(false)
    }
  }

  useEffect(() => {
    void loadGrades()
  }, [])

  useEffect(() => {
    if (user?.email) setEmail(user.email)
    if (user) setStep(2)
  }, [user])

  const canUsePassword = useMemo(() => !user, [user])

  const handleNextStep = (event) => {
    event.preventDefault()
    setFeedback({ type: '', message: '' })
    if (!email || password.length < 6) {
      setFeedback({ type: 'error', message: 'Necesitamos un email valido y una contrasena de minimo 6 caracteres.' })
      return
    }
    setStep(2)
  }

  const handleRegisterSubmit = async (event) => {
    event.preventDefault()
    setFeedback({ type: '', message: '' })

    const trimmedFullName = fullName.trim()
    if (!trimmedFullName) {
      setFeedback({ type: 'error', message: 'Escribe tu nombre para continuar.' })
      return
    }

    if (!gradeId) {
      setFeedback({ type: 'error', message: 'Selecciona tu grado actual para continuar.' })
      return
    }

    setSubmitting(true)
    try {
      if (!user) {
        await register(email, password)
      }

      await syncProfile({
        fullName: trimmedFullName,
        gradeId,
        selectedPathType,
        learningStyle: 'visual',
      })

      navigate('/dashboard', { replace: true })
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error?.message || 'Hubo un problema creando tu perfil academico.',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="cm-shell flex min-h-dvh items-start justify-center overflow-y-auto px-6 py-10 md:items-center md:py-16">
      <main className="relative z-10 w-full max-w-3xl">
        <div className="cm-card mx-auto p-8 md:p-10">
          <div className="mb-10 text-center">
            <p className="text-xs font-semibold tracking-[0.18em] text-coastal-neon">MATHLINGO</p>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-coastal-mist">
              {step === 1 ? 'Crear tu acceso' : 'Completa tu mapa academico'}
            </h1>
            <p className="mt-3 text-sm text-coastal-mist/65">
              {step === 1
                ? 'Primero configuramos tu acceso seguro.'
                : 'Ahora elegimos grado, ruta inicial y el punto de partida para el Profe IA.'}
            </p>
          </div>

          <form className="space-y-8" onSubmit={step === 1 ? handleNextStep : handleRegisterSubmit}>
            {step === 1 && canUsePassword && (
              <div className="grid gap-5 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm text-coastal-mist/85">Correo electronico</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="cm-input"
                    placeholder="estudiante@ejemplo.com"
                    autoComplete="email"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm text-coastal-mist/85">Contrasena</span>
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="cm-input"
                    placeholder="Minimo 6 caracteres"
                    autoComplete="new-password"
                  />
                </label>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-8">
                <label className="block">
                  <span className="mb-2 block text-sm text-coastal-mist/85">Como te llamas?</span>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    className="cm-input"
                    placeholder="Ej. Ana Martinez"
                    autoComplete="name"
                  />
                </label>

                <div>
                  <span className="mb-3 block text-sm text-coastal-mist/85">Tu grado actual</span>
                  {gradesLoading && (
                    <div className="rounded-2xl border border-coastal-steel/60 bg-coastal-ocean/70 px-4 py-3 text-sm text-coastal-mist/65">
                      Cargando grados...
                    </div>
                  )}
                  {!gradesLoading && gradesError && (
                    <div className="rounded-2xl border border-red-600/40 bg-red-600/10 px-4 py-3 text-sm text-red-200">
                      <p>{gradesError}</p>
                      <button type="button" onClick={loadGrades} className="mt-3 font-semibold text-coastal-neon">
                        Reintentar
                      </button>
                    </div>
                  )}
                  {!gradesLoading && !gradesError && (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {grades.map((grade) => (
                        <button
                          key={grade.id}
                          type="button"
                          onClick={() => setGradeId(grade.id)}
                          className={`rounded-2xl border p-4 text-left transition-all ${
                            gradeId === grade.id
                              ? 'border-coastal-neon bg-coastal-steel/70 shadow-lg'
                              : 'border-coastal-steel/60 bg-coastal-ocean/70 hover:border-coastal-neon/40'
                          }`}
                        >
                          <p className="font-semibold text-coastal-mist">{grade.name}</p>
                          <p className="mt-1 text-xs text-coastal-mist/60">{grade.levelName || `Grado ${grade.gradeNumber || ''}`}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <span className="mb-3 block text-sm text-coastal-mist/85">Tu ruta inicial</span>
                  <div className="grid gap-4 md:grid-cols-2">
                    {PATH_OPTIONS.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setSelectedPathType(option.id)}
                        className={`rounded-2xl border p-5 text-left transition-all ${
                          selectedPathType === option.id
                            ? 'border-coastal-neon bg-coastal-steel/70 shadow-lg'
                            : 'border-coastal-steel/60 bg-coastal-ocean/70 hover:border-coastal-neon/40'
                        }`}
                      >
                        <p className="text-lg font-semibold text-coastal-mist">{option.title}</p>
                        <p className="mt-2 text-sm text-coastal-mist/60">{option.description}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {feedback.message && (
              <div className={`rounded-2xl border px-4 py-3 text-sm ${
                feedback.type === 'error'
                  ? 'border-red-600/40 bg-red-600/10 text-red-200'
                  : 'border-verdant-accent/50 bg-verdant-luxe/20 text-verdant-accent'
              }`}>
                {feedback.message}
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              {step === 2 && canUsePassword && (
                <button type="button" onClick={() => setStep(1)} className="cm-btn-secondary px-6 py-3 text-sm">
                  Volver
                </button>
              )}
              <button type="submit" disabled={submitting} className="cm-btn-primary flex-1 px-6 py-3 text-sm">
                {submitting ? 'Guardando...' : step === 1 ? 'Siguiente paso' : 'Entrar al dashboard dual'}
              </button>
            </div>
          </form>

          {!user && step === 1 && (
            <div className="mt-8 text-center">
              <Link to="/login" className="text-sm font-medium text-coastal-neon hover:opacity-90">
                Ya tienes una cuenta? Inicia sesion
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
