import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export default function ConnectionStatusBanner() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [showBanner, setShowBanner] = useState(false)
  const [wasOffline, setWasOffline] = useState(false)

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      if (wasOffline) {
        setShowBanner(true)
        setTimeout(() => setShowBanner(false), 3000)
      }
      setWasOffline(false)
    }

    const handleOffline = () => {
      setIsOnline(false)
      setWasOffline(true)
      setShowBanner(true)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [wasOffline])

  return (
    <AnimatePresence>
      {showBanner && (
        <motion.div
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -60, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          role="status"
          aria-live="assertive"
          aria-atomic="true"
          className={`fixed top-0 left-0 right-0 z-[99999] py-2.5 px-4 text-center text-sm font-bold shadow-lg ${
            isOnline
              ? 'bg-emerald-500 text-white'
              : 'bg-rose-500 text-white'
          }`}
        >
          {isOnline ? (
            <span>✓ Conexión restaurada — Tu progreso está sincronizando...</span>
          ) : (
            <span>⚠ Sin conexión a internet — Trabajando en modo offline</span>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
