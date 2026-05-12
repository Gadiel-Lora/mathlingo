import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'

const learningStyles = ['Visual', 'Auditivo', 'Kinestésico']
const languageOptions = ['Español', 'English', 'Français']

export default function LearningTab() {
  const { profile, updateSelectedPath } = useAuth()
  const [learningStyle, setLearningStyle] = useState('Visual')
  const [selectedPathType, setSelectedPathType] = useState(profile?.selectedPathType || 'AUTO')
  const [language, setLanguage] = useState('Español')
  const [saving, setSaving] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')

  useEffect(() => {
    setSelectedPathType(profile?.selectedPathType || 'AUTO')
  }, [profile?.selectedPathType])

  const handleSave = async () => {
    setSaving(true)
    setStatusMessage('Guardando preferencias...')
    try {
      await updateSelectedPath(selectedPathType)
      setStatusMessage('Preferencias de aprendizaje guardadas.')
    } catch (error) {
      console.error(error)
      setStatusMessage('No se pudo guardar. Intenta de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div>
        <h2 className="text-2xl font-black text-slate-800 mb-2">Preferencias de Aprendizaje</h2>
        <p className="text-sm text-slate-500 font-medium">Ajusta cómo la IA te enseña y orienta tu ruta matemática.</p>
      </div>

      <div className="space-y-8 max-w-2xl">
        <div>
          <label className="block text-xs uppercase tracking-widest font-black text-slate-500 mb-3">Estilo de Aprendizaje Predominante</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {learningStyles.map((style) => {
              const active = learningStyle === style
              return (
                <label
                  key={style}
                  className={`flex items-center gap-3 p-4 rounded-xl cursor-pointer border transition-colors ${
                    active
                      ? 'border-indigo-500 bg-indigo-50/70 text-indigo-900'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="style"
                    value={style}
                    checked={learningStyle === style}
                    onChange={() => setLearningStyle(style)}
                    className="w-4 h-4 text-indigo-600"
                  />
                  <span className="text-sm font-bold">{style}</span>
                </label>
              )
            })}
          </div>
        </div>

        <div>
          <label className="block text-xs uppercase tracking-widest font-black text-slate-500 mb-3">Camino Académico Principal</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setSelectedPathType('GRADE')}
              className={`text-left p-4 rounded-xl border-2 transition-all ${
                selectedPathType === 'GRADE'
                  ? 'border-indigo-500 bg-indigo-50/50 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-indigo-300'
              }`}
            >
              <p className="font-bold text-slate-800 text-sm mb-1">Por Grado (Recomendado)</p>
              <p className="text-xs text-slate-500 font-medium">Sigue el currículo oficial paso a paso con el ritmo del grado.</p>
            </button>
            <button
              type="button"
              onClick={() => setSelectedPathType('AUTO')}
              className={`text-left p-4 rounded-xl border-2 transition-all ${
                selectedPathType === 'AUTO'
                  ? 'border-indigo-500 bg-indigo-50/50 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-indigo-300'
              }`}
            >
              <p className="font-bold text-indigo-900 text-sm mb-1">Camino Autónomo</p>
              <p className="text-xs text-indigo-700 font-medium">Libertad para elegir ejercicios y temas según tus metas personales.</p>
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-xs uppercase tracking-widest font-black text-slate-500 mb-2">Idioma de Instrucción</label>
            <div className="relative w-full sm:w-1/2">
              <select
                value={language}
                onChange={(event) => setLanguage(event.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100 transition-all appearance-none cursor-pointer"
              >
                {languageOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">▼</span>
            </div>
          </div>
        </div>
      </div>

      {statusMessage && <p className="text-sm text-slate-500">{statusMessage}</p>}

      <div className="pt-8 border-t border-slate-100">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-60"
        >
          {saving ? 'Guardando...' : 'Aplicar Configuraciones'}
        </button>
      </div>
    </div>
  )
}
