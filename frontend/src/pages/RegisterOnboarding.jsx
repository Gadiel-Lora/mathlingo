import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { academicApi } from '../services/academicApi';

export default function RegisterOnboarding() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [gradeId, setGradeId] = useState('');
  
  const [grades, setGrades] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  // Cargar los grados disponibles desde el backend
  useEffect(() => {
    academicApi.getCurriculum().then(res => {
      setGrades(res.grades || []);
    }).catch(err => {
      console.error('Error cargando grados:', err);
    });
  }, []);

  const handleNextStep = (e) => {
    e.preventDefault();
    setFeedback({ type: '', message: '' });
    if (!email || password.length < 6) {
      setFeedback({ type: 'error', message: 'El email y una contraseña de min. 6 caracteres son obligatorios.' });
      return;
    }
    setStep(2);
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setFeedback({ type: '', message: '' });

    if (!fullName || !gradeId) {
      setFeedback({ type: 'error', message: 'Por favor, dinos tu nombre y selecciona un grado para continuar.' });
      return;
    }

    setSubmitting(true);
    try {
      // 1. Crear el usuario en Supabase
      const { session } = await register(email, password);

      // 2. Sincronizar con PostgreSQL
      await academicApi.syncUser({
        fullName,
        gradeId,
      });

      // 3. Todo listo, redirect
      navigate('/dashboard', { replace: true });
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error?.message || 'Hubo un problema creando tu cuenta segura.',
      });
      // Si falla después del paso 1, quizás el usuario ya existía en supabase o falló la red
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="cm-shell min-h-screen flex items-center justify-center bg-gray-50/10">
      {/* Fondo elegante minimalista (Notion / Apple Vibe) */}
      <div className="absolute inset-0 z-0 bg-white dark:bg-[#0E1116]" />
      <div className="absolute top-0 right-0 -m-32 h-[40rem] w-[40rem] rounded-full bg-blue-100/50 blur-3xl dark:bg-blue-900/20" />
      <div className="absolute bottom-0 left-0 -m-32 h-[40rem] w-[40rem] rounded-full bg-emerald-100/50 blur-3xl dark:bg-emerald-900/10" />

      <main className="relative z-10 w-full max-w-lg px-6">
        <div className="rounded-3xl border border-gray-200/50 bg-white/70 p-10 shadow-xl backdrop-blur-xl dark:border-gray-800/50 dark:bg-gray-900/70">
          
          <div className="mb-10 text-center">
            <h1 className="text-3xl font-light tracking-tight text-gray-900 dark:text-gray-100">
              {step === 1 ? 'Crear tu cuenta' : 'Casi listo'}
            </h1>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {step === 1 ? 'Ingresa tus datos de inicio de sesión seguros.' : 'Personaliza tu experiencia matemática.'}
            </p>
          </div>

          <form className="space-y-6" onSubmit={step === 1 ? handleNextStep : handleRegisterSubmit}>
            
            <div className={`transition-all duration-500 ${step === 1 ? 'block opacity-100' : 'hidden opacity-0'}`}>
              <div className="space-y-5">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Correo electrónico</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-white/50 px-4 py-3 text-sm text-gray-900 shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-800 dark:bg-gray-950/50 dark:text-white"
                    placeholder="estudiante@ejemplo.com"
                    autoComplete="email"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Contraseña</span>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-white/50 px-4 py-3 text-sm text-gray-900 shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-800 dark:bg-gray-950/50 dark:text-white"
                    placeholder="Mínimo 6 caracteres"
                    autoComplete="new-password"
                  />
                </label>
              </div>
            </div>

            <div className={`transition-all duration-500 ${step === 2 ? 'block opacity-100' : 'hidden opacity-0'}`}>
              <div className="space-y-5">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">¿Cómo te llamas?</span>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-white/50 px-4 py-3 text-sm text-gray-900 shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-800 dark:bg-gray-950/50 dark:text-white"
                    placeholder="Ej. Ana Martínez"
                    autoComplete="name"
                  />
                </label>
                
                <div className="block">
                  <span className="mb-3 block text-sm font-medium text-gray-700 dark:text-gray-300">Tu grado escolar actual</span>
                  <div className="grid grid-cols-2 gap-3">
                    {grades.map(grade => (
                      <button
                        key={grade.id}
                        type="button"
                        onClick={() => setGradeId(grade.id)}
                        className={`rounded-xl border p-4 text-left transition-all hover:border-blue-500/50 ${
                          gradeId === grade.id 
                            ? 'border-blue-500 bg-blue-50/50 shadow-sm dark:border-blue-400 dark:bg-blue-900/20' 
                            : 'border-gray-200 bg-white/50 dark:border-gray-800 dark:bg-gray-950/50'
                        }`}
                      >
                        <p className={`font-medium ${gradeId === grade.id ? 'text-blue-700 dark:text-blue-400' : 'text-gray-900 dark:text-gray-100'}`}>
                          {grade.name}
                        </p>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          {grade.levelName}
                        </p>
                      </button>
                    ))}
                    {grades.length === 0 && (
                      <div className="col-span-2 p-4 text-center text-sm text-gray-500">Cargando grados...</div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {feedback.message && (
              <div className={`rounded-xl p-4 text-sm ${
                feedback.type === 'error' 
                  ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400' 
                  : 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400'}`
              }>
                {feedback.message}
              </div>
            )}

            <div className="mt-8 flex gap-3">
              {step === 2 && (
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="rounded-xl border border-gray-200 bg-white px-6 py-3 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50 hover:text-gray-900 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300 dark:hover:bg-gray-900 dark:hover:text-white"
                >
                  Volver
                </button>
              )}
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 rounded-xl bg-gray-900 px-6 py-3 text-sm font-medium text-white shadow-sm transition-all hover:bg-gray-800 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 disabled:opacity-50 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
              >
                {submitting ? 'Creando perfil...' : step === 1 ? 'Siguiente paso' : 'Comenzar a aprender'}
              </button>
            </div>
            
          </form>

          {step === 1 && (
            <div className="mt-8 text-center">
              <Link to="/login" className="text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400">
                ¿Ya tienes una cuenta? Inicia sesión
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
