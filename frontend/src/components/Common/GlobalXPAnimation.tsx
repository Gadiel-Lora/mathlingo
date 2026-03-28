import { motion, AnimatePresence } from 'framer-motion'
import { useUIStore } from '../../store/uiStore'

export default function GlobalXPAnimation() {
  const { xpGainInfo } = useUIStore()

  return (
    <AnimatePresence>
      {xpGainInfo && (
        <motion.div
           key={xpGainInfo.id}
           initial={{ opacity: 0, y: 0, scale: 0.5, rotate: -5 }}
           animate={{ opacity: 1, y: -120, scale: 1.2, rotate: 5 }}
           exit={{ opacity: 0, scale: 0.8 }}
           transition={{
             duration: 0.8,
             type: "spring",
             stiffness: 120,
             damping: 12
           }}
           className="fixed right-10 top-32 z-[9999] text-3xl font-black text-emerald-500 drop-shadow-lg pointer-events-none"
         >
           +{xpGainInfo.xp} XP <span className="text-4xl inline-block -translate-y-1">🎉</span>
         </motion.div>
      )}
    </AnimatePresence>
  )
}
