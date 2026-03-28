import { motion } from 'framer-motion'
import { ReactNode } from 'react'
import RippleButton from './RippleButton'

interface EmptyStateProps {
  icon: string | ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  }
}

export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center py-16 px-6 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50 max-w-lg mx-auto"
    >
      <motion.div 
        initial={{ scale: 0.8, rotate: -10 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 10 }}
        className="text-6xl mb-6 text-slate-400 drop-shadow-sm inline-block"
      >
        {icon}
      </motion.div>
      <h3 className="text-2xl font-black text-slate-800 tracking-tight mb-3">{title}</h3>
      <p className="text-slate-500 font-medium mb-8 leading-relaxed">{description}</p>
      
      {action && (
        <RippleButton 
          onClick={action.onClick}
          className="px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-all active:scale-95"
        >
          {action.label}
        </RippleButton>
      )}
    </motion.div>
  )
}
