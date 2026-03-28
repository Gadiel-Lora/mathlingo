import { motion } from 'framer-motion'
import { ReactNode } from 'react'

export default function PageTransition({ children, className = '' }: { children: ReactNode, className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.25, ease: "easeInOut" }}
      className={`w-full h-full ${className}`}
    >
      {children}
    </motion.div>
  )
}
