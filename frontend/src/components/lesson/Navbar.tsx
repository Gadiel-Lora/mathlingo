import { motion } from 'framer-motion'

interface NavbarProps {
  lessonName: string
  currentProblemIndex: number
  totalProblems: number
  onClose?: () => void
}

export default function Navbar({ lessonName, currentProblemIndex, totalProblems, onClose }: NavbarProps) {
  const safeIndex = totalProblems > 0 ? Math.min(currentProblemIndex, totalProblems - 1) : 0
  const progressPercent = totalProblems > 0 ? ((safeIndex + 1) / totalProblems) * 100 : 0

  return (
    <nav className="fixed inset-x-0 top-0 z-30 flex h-[60px] items-center border-b border-gray-200 bg-white px-6">
      <div className="flex w-full items-center gap-4">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-gray-800">Leccion: {lessonName}</h1>
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              aria-label="Salir al dashboard"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 transition hover:bg-gray-100 hover:text-gray-900"
            >
              ×
            </button>
          ) : null}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-700">
            {totalProblems > 0 ? safeIndex + 1 : 0} / {totalProblems}
          </span>
          <div className="h-2 w-32 overflow-hidden rounded-full bg-gray-300">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.3 }}
              className="h-full bg-blue-500"
            />
          </div>
        </div>
      </div>
    </nav>
  )
}
