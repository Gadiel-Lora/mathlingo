import { Navigate } from 'react-router-dom'

import { useAuth } from '../context/AuthContext'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="cm-shell px-6 pt-20 pb-16">
        <div className="cm-orb cm-orb-cyan left-[-6rem] top-[8rem] h-56 w-56" />
        <div className="cm-orb cm-orb-coral right-[-4rem] top-[16rem] h-44 w-44" />
        <main className="cm-page mx-auto max-w-xl">
          <section className="cm-card space-y-3 p-8 text-center">
            <p className="text-xs font-semibold tracking-[0.18em] text-coastal-neon">MATHLINGO</p>
            <h1 className="text-2xl font-semibold tracking-tight text-coastal-mist">Cargando sesion</h1>
            <p className="text-sm text-coastal-mist/75">Preparando tu panel academico...</p>
          </section>
        </main>
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />

  return children
}

export default ProtectedRoute
