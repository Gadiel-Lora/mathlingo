import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts'

const shortcuts = [
  { keys: ['Enter'], description: 'Enviar respuesta' },
  { keys: ['Esc'], description: 'Cerrar panel / modal' },
  { keys: ['Ctrl', 'H'], description: 'Abrir AI Tutor' },
  { keys: ['Ctrl', 'M'], description: 'Cambiar tema (Dark/Light)' },
  { keys: ['Ctrl', '?'], description: 'Ver esta guía de atajos' },
  { keys: ['Tab'], description: 'Navegar entre elementos' },
]

export default function KeyboardShortcutsOverlay() {
  const [isOpen, setIsOpen] = useState(false)

  useKeyboardShortcuts([
    { key: '?', ctrlKey: true, action: () => setIsOpen(v => !v), preventDefault: true },
    { key: 'Escape', action: () => setIsOpen(false) },
  ])

  return (
    <>
      {/* P22: Always-visible hint chip in bottom-right corner */}
      <div
        className="fixed bottom-4 right-4 z-50"
        aria-label="Ver atajos de teclado"
      >
        <button
          onClick={() => setIsOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          title="Atajos de teclado (Ctrl+?)"
          className="flex items-center gap-2 bg-white/90 backdrop-blur-sm border border-slate-200 text-slate-600 text-xs font-bold px-3 py-2 rounded-full shadow-md hover:shadow-lg hover:bg-white hover:text-indigo-600 transition-all"
        >
          <span aria-hidden="true">⌨️</span>
          <span>Ctrl+?</span>
        </button>
      </div>

      {/* Overlay modal */}
      <AnimatePresence>
        {isOpen && (
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-label="Guía de atajos de teclado"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm"
            >
              <h2 className="text-xl font-black text-slate-800 mb-1">Atajos de Teclado</h2>
              <p className="text-sm text-slate-500 font-medium mb-5">Navega más rápido con estos atajos</p>

              <ul className="space-y-3" role="list">
                {shortcuts.map((s, i) => (
                  <li key={i} className="flex items-center justify-between" role="listitem">
                    <span className="text-sm text-slate-700 font-medium">{s.description}</span>
                    <div className="flex gap-1">
                      {s.keys.map((k, ki) => (
                        <kbd
                          key={ki}
                          className="px-2 py-1 bg-slate-100 border border-slate-300 rounded text-xs font-mono font-bold text-slate-700 shadow-sm"
                        >
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => setIsOpen(false)}
                aria-label="Cerrar guía de atajos"
                className="mt-6 w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors text-sm"
              >
                Entendido
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
