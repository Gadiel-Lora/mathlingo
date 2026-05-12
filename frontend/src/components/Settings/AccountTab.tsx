import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'

const gradeOptions = [
  { id: '6', label: 'Grado 6' },
  { id: '7', label: 'Grado 7' },
  { id: '8', label: 'Grado 8' },
]

export default function AccountTab() {
  const { profile, user, syncProfile } = useAuth()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [gradeId, setGradeId] = useState('7')
  const [saving, setSaving] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')

  useEffect(() => {
    setFullName(profile?.fullName || user?.user_metadata?.full_name || user?.email?.split('@')[0] || '')
    setEmail(profile?.email || user?.email || '')
    setGradeId(profile?.grade?.id ? String(profile.grade.id) : '7')
  }, [profile, user])

  const handleSave = async () => {
    setSaving(true)
    setStatusMessage('Guardando cambios...')
    try {
      await syncProfile({ fullName, gradeId, selectedPathType: profile?.selectedPathType || 'GRADE' })
      setStatusMessage('Preferencias guardadas correctamente.')
    } catch (error) {
      setStatusMessage('No se pudo guardar. Intenta de nuevo.')
      console.error(error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div>
        <h2 className="text-2xl font-black text-slate-800 mb-2">Cuenta y Perfil</h2>
        <p className="text-sm text-slate-500 font-medium">Administra tu información personal y credenciales básicas.</p>
      </div>

      <div className="space-y-6 max-w-lg">
        <div>
          <label className="block text-xs uppercase tracking-widest font-black text-slate-500 mb-2">Nombre Completo</label>
          <input
            type="text"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100 transition-all shadow-inner"
          />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-widest font-black text-slate-500 mb-2">Correo Electrónico</label>
          <input
            type="email"
            value={email}
            readOnly
            className="w-full px-4 py-3.5 bg-slate-100 border border-slate-200 rounded-xl text-sm font-bold text-slate-500 outline-none cursor-not-allowed"
          />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-widest font-black text-slate-500 mb-2">Grado Escolar Actual</label>
          <div className="relative">
            <select
              value={gradeId}
              onChange={(event) => setGradeId(event.target.value)}
              className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100 transition-all appearance-none cursor-pointer shadow-inner"
            >
              {gradeOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">▼</span>
          </div>
        </div>
      </div>

      {statusMessage && <p className="text-sm text-slate-500">{statusMessage}</p>}

      <div className="pt-8 border-t border-slate-100 flex flex-col sm:flex-row gap-4">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-60"
        >
          {saving ? 'Guardando...' : 'Guardar Cambios'}
        </button>
        <button className="px-6 py-3.5 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-colors shadow-sm">
          Cambiar Contraseña...
        </button>
      </div>
    </div>
  )
}
