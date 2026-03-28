import { InputHTMLAttributes, forwardRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface ValidatedInputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  success?: boolean;
  label?: string;
}

const ValidatedInput = forwardRef<HTMLInputElement, ValidatedInputProps>(
  ({ error, success, label, className = '', ...props }, ref) => {
    
    const baseClasses = "w-full px-4 py-3 bg-slate-50 border rounded-xl text-sm font-bold outline-none transition-all shadow-inner"
    const stateClasses = error 
      ? "border-rose-400 focus:bg-white focus:ring-2 focus:ring-rose-100 text-rose-900" 
      : success 
        ? "border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100 text-emerald-900"
        : "border-slate-200 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100 text-slate-800"

    return (
      <div className="w-full relative">
        {label && (
          <label className="block text-xs uppercase tracking-widest font-black text-slate-500 mb-2">
            {label}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            className={`${baseClasses} ${stateClasses} ${className}`}
            {...props}
          />
          <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-rose-500 pointer-events-none"
              >
                ✗
              </motion.div>
            )}
            {success && !error && (
              <motion.div 
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-500 pointer-events-none"
              >
                ✓
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -5, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="text-xs font-bold text-rose-500 mt-2"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    )
  }
)

ValidatedInput.displayName = 'ValidatedInput'
export default ValidatedInput
