import { motion } from 'framer-motion'

interface NavbarProps {
  lessonName: string
  currentProblemIndex: number
  totalProblems: number
}

export default function Navbar({ lessonName, currentProblemIndex, totalProblems }: NavbarProps) {
  const progressPercent = totalProblems > 0 
    ? ((currentProblemIndex + 1) / totalProblems) * 100 
    : 0

  return (
    <nav className="fixed top-0 inset-x-0 h-[60px] bg-white border-b border-gray-200 z-30 flex items-center px-6">
      <div className="flex items-center w-full">
        <h1 className="text-xl font-bold text-gray-800">Lección: {lessonName}</h1>
        
        <div className="flex-1" /> {/* Spacer */}
        
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-sm font-semibold text-gray-700">
            {currentProblemIndex + 1} / {totalProblems}
          </span>
          <div className="w-32 h-2 bg-gray-300 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.3 }}
              className="h-full bg-blue-500"
            />
          </div>
        </div>

        {/* Placeholder for IconButtons */}
        <div className="flex items-center ml-4 gap-2">
           {/* Hint, AI, etc */}
        </div>
      </div>
    </nav>
  )
}
