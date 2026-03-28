import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import RippleButton from './RippleButton'

export default function Onboarding() {
  const [step, setStep] = useState(0)
  const [isVisible, setIsVisible] = useState(false)

  // Simulate first login trigger
  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem('elite-onboarding')
    if (!hasSeenOnboarding) {
      setTimeout(() => setIsVisible(true), 1000)
    }
  }, [])

  const handleFinish = () => {
    setIsVisible(false)
    localStorage.setItem('elite-onboarding', 'true')
  }

  const steps = [
    {
      title: "Bienvenido a EliteMath",
      description: "Aquí es donde vas a explorar, practicar y dominar la matemática utilizando inteligencia adaptativa.",
      icon: "👋"
    },
    {
      title: "Elige tu camino",
      description: "Navega a la pestaña de Perfil y decide entre el Camino por Grado o el Camino Autónomo de fluidez libre.",
      icon: "🗺️"
    },
    {
      title: "Soporte Contínuo",
      description: "Utiliza el AI Tutor (Ctrl+H) durante tus problemas para pedir pistas e indicaciones socráticas. ¡Comencemos!",
      icon: "🤖"
    }
  ]

  if (!isVisible) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }} 
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        />
        
        <motion.div
           initial={{ opacity: 0, scale: 0.9, y: 20 }}
           animate={{ opacity: 1, scale: 1, y: 0 }}
           exit={{ opacity: 0, scale: 0.9, y: 20 }}
           transition={{ type: "spring", stiffness: 300, damping: 25 }}
           className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
        >
           <div className="h-2 flex w-full">
             {steps.map((_, idx) => (
               <div key={idx} className={`flex-1 ${idx <= step ? 'bg-indigo-600' : 'bg-slate-100'} transition-colors duration-500`} />
             ))}
           </div>
           
           <div className="p-8 text-center">
             <motion.div 
               key={step}
               initial={{ opacity: 0, x: 20 }}
               animate={{ opacity: 1, x: 0 }}
               exit={{ opacity: 0, x: -20 }}
               transition={{ duration: 0.3 }}
               className="min-h-[160px] flex flex-col items-center justify-center"
             >
               <span className="text-6xl mb-6">{steps[step].icon}</span>
               <h2 className="text-2xl font-black text-slate-800 tracking-tight mb-3">{steps[step].title}</h2>
               <p className="text-slate-500 font-medium leading-relaxed">{steps[step].description}</p>
             </motion.div>
           </div>
           
           <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
             <button 
               onClick={handleFinish}
               className="text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors px-4 py-2"
             >
               Omitir
             </button>
             
             {step < steps.length - 1 ? (
               <RippleButton 
                 onClick={() => setStep(step + 1)}
                 className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-md hover:bg-indigo-700"
               >
                 Siguiente
               </RippleButton>
             ) : (
               <RippleButton 
                 onClick={handleFinish}
                 className="px-6 py-3 bg-emerald-500 text-white font-bold rounded-xl shadow-md hover:bg-emerald-600"
               >
                 Empezar Ahora ✨
               </RippleButton>
             )}
           </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
