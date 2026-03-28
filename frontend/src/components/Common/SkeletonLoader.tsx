import { motion } from 'framer-motion'

interface SkeletonLoaderProps {
  type?: 'card' | 'text' | 'profile' | 'avatar';
  count?: number;
}

export default function SkeletonLoader({ type = 'text', count = 1 }: SkeletonLoaderProps) {
  const elements = Array.from({ length: count })

  if (type === 'card') {
    return (
      <div className="space-y-4 w-full">
        {elements.map((_, i) => (
           <motion.div
             key={i}
             initial={{ opacity: 0.5 }}
             animate={{ opacity: 1 }}
             transition={{ repeat: Infinity, duration: 1, ease: "linear", repeatType: "reverse" }}
             className="w-full h-32 bg-slate-200 rounded-2xl flex p-6 gap-4"
           >
              <div className="w-16 h-16 rounded-xl bg-slate-300"></div>
              <div className="flex-1 space-y-3">
                <div className="h-4 bg-slate-300 rounded w-1/3"></div>
                <div className="h-4 bg-slate-300 rounded w-1/2"></div>
              </div>
           </motion.div>
        ))}
      </div>
    )
  }

  if (type === 'profile') {
    return (
      <motion.div 
        initial={{ opacity: 0.5 }}
        animate={{ opacity: 1 }}
        transition={{ repeat: Infinity, duration: 1, ease: "linear", repeatType: "reverse" }}
        className="flex items-center gap-4 w-full"
      >
        <div className="w-12 h-12 bg-slate-300 rounded-full flex-shrink-0"></div>
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-slate-300 rounded w-1/2"></div>
          <div className="h-3 bg-slate-300 rounded w-1/4"></div>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div 
      initial={{ opacity: 0.5 }}
      animate={{ opacity: 1 }}
      transition={{ repeat: Infinity, duration: 1, ease: "linear", repeatType: "reverse" }}
      className="space-y-3 w-full"
    >
      <div className="h-4 bg-slate-200 rounded w-3/4"></div>
      <div className="h-4 bg-slate-200 rounded w-1/2"></div>
      <div className="h-4 bg-slate-200 rounded w-5/6"></div>
    </motion.div>
  )
}
