import { useState } from 'react'
import 'katex/dist/katex.min.css'
import { InlineMath, BlockMath } from 'react-katex'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Problem } from '../../types/lesson'

interface ProblemAreaProps {
  problem: Problem | null
  onHintClick?: () => void
  onAiChatClick?: () => void
}

export default function ProblemArea({ problem, onHintClick, onAiChatClick }: ProblemAreaProps) {
  if (!problem) {
    return (
      <div className="problem-area flex items-center justify-center min-h-[50vh]">
        <p className="text-gray-500">Cargando problema...</p>
      </div>
    )
  }

  return (
    <div className="problem-area max-w-4xl mx-auto my-8 pb-48">
      {problem.content.map((item, idx) => {
        if (item.type === 'text') {
          return (
            <div key={idx} className="problem-text prose prose-lg max-w-none mb-4 text-gray-800 leading-relaxed">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {item.value}
              </ReactMarkdown>
            </div>
          )
        }
        if (item.type === 'equation') {
          // Detect displays by standard heuristics
          const isDisplay = item.value.startsWith('\\displaystyle') || item.value.trim().length > 30 || item.value.includes('\\begin{')
          return isDisplay 
            ? <div key={idx} className="problem-equation text-center my-4 text-xl"><BlockMath math={item.value} /></div>
            : <span key={idx} className="problem-equation mx-1 text-lg"><InlineMath math={item.value} /></span>
        }
        if (item.type === 'image') {
          return (
            <div key={idx} className="relative w-full my-6 flex justify-center bg-gray-50 rounded-lg overflow-hidden border border-gray-100 p-2">
              <img 
                src={item.url} 
                alt={item.alt} 
                loading="lazy"
                className="max-w-full max-h-96 object-contain rounded animate-fade-in" 
              />
            </div>
          )
        }
        if (item.type === 'diagram') {
          return (
            <div 
              key={idx} 
              className="w-full flex justify-center my-6 overflow-hidden [&>svg]:max-w-full [&>svg]:h-auto"
              dangerouslySetInnerHTML={{ __html: item.svg }} 
            />
          )
        }
        return null
      })}

      <div className="mt-8 flex gap-4">
        <button 
          onClick={onHintClick}
          className="px-4 py-2 border border-blue-600 text-blue-600 font-semibold rounded hover:bg-blue-50 transition-colors"
        >
          [?] HINT
        </button>
        <button 
          onClick={onAiChatClick}
          className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded shadow-sm hover:bg-indigo-700 transition-colors"
        >
          💬 AI Tutor
        </button>
      </div>
    </div>
  )
}

