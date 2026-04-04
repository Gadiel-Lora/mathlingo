import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useAuth } from '../context/AuthContext'

export default function AuthCallback() {
  const navigate = useNavigate()
  const { refreshProfile } = useAuth()
  const [message, setMessage] = useState('Validando tu sesion segura...')

  useEffect(() => {
    let cancelled = false

    const resolveCallback = async () => {
      try {
        const profile = await refreshProfile()
        if (cancelled) return
        if (profile) {
          navigate('/dashboard', { replace: true })
          return
        }

        setMessage('Tu sesion quedo lista. Falta completar tu perfil academico...')
        navigate('/register?provider=google', { replace: true })
      } catch {
        if (cancelled) return
        setMessage('No pudimos cerrar el ingreso con Google. Intenta nuevamente.')
      }
    }

    void resolveCallback()
    return () => {
      cancelled = true
    }
  }, [navigate, refreshProfile])

  return (
    <div className="cm-shell px-6 pt-20 pb-16">
      <main className="cm-page mx-auto max-w-xl">
        <section className="cm-card space-y-3 p-8 text-center">
          <p className="text-xs font-semibold tracking-[0.18em] text-coastal-neon">MATHLINGO</p>
          <h1 className="text-2xl font-semibold tracking-tight text-coastal-mist">Callback de acceso</h1>
          <p className="text-sm text-coastal-mist/75">{message}</p>
        </section>
      </main>
    </div>
  )
}
