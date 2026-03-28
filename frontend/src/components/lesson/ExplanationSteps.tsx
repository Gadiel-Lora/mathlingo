import { motion } from 'framer-motion'
import { BlockMath } from 'react-katex'
import { ExplanationStep } from '../../types/ai'

interface ExplanationStepsProps {
  steps: ExplanationStep[]
  onComplete?: () => void
}

export default function ExplanationSteps({ steps, onComplete }: ExplanationStepsProps) {
  return (
    <div className="space-y-4">
      {steps.map((step, idx) => (
        <motion.div
          key={idx}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: idx * 0.8 }} // 0.8s delay between steps for reading
          onAnimationComplete={() => {
            if (idx === steps.length - 1 && onComplete) {
              onComplete()
            }
          }}
          className="mb-4 p-3 bg-blue-50 border-l-4 border-blue-500 rounded-r text-left"
        >
          <p className="font-semibold text-blue-900">Paso {idx + 1}: {step.title}</p>
          <p className="text-gray-700 mt-1 text-sm">{step.description}</p>
          {step.equation && (
            <div className="mt-2 text-blue-800">
              <BlockMath math={step.equation} />
            </div>
          )}
          {step.image && (
            <img src={step.image} alt="Step illustration" className="mt-2 max-w-full h-auto rounded" />
          )}
        </motion.div>
      ))}
    </div>
  )
}
