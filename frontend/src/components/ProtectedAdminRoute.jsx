import { Navigate } from 'react-router-dom'

import { useAuth } from '../context/AuthContext'

function ProtectedAdminRoute({ children }) {
  const { user, loading, profile, profileLoading } = useAuth()

  if (loading || profileLoading) {
    return (
      <div className="cm-shell px-6 pt-20 pb-16">
        <main className="cm-page mx-auto max-w-xl">
          <section className="cm-card space-y-3 p-8 text-center">
            <p className="text-xs font-semibold tracking-[0.18em] text-coastal-neon">MATHLINGO ADMIN</p>
            <h1 className="text-2xl font-semibold tracking-tight text-coastal-mist">Validando acceso</h1>
            <p className="text-sm text-coastal-mist/75">Cargando permisos administrativos...</p>
          </section>
        </main>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />
  if (!profile?.permissions?.canAccessAdminPanel) return <Navigate to="/dashboard" replace />

  return children
}

export default ProtectedAdminRoute
