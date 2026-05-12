import 'katex/dist/katex.min.css'
import { BlockMath, InlineMath } from 'react-katex'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Problem } from '../../types/lesson'

interface ProblemAreaProps {
  problem: Problem | null
  onHintClick?: () => void
  onAiChatClick?: () => void
}

const shouldRenderAsBlock = (value: string) => {
  const trimmedValue = value.trim()
  return trimmedValue.startsWith('\\displaystyle') || trimmedValue.includes('\\begin{') || trimmedValue.length > 30
}

export default function ProblemArea({ problem, onHintClick, onAiChatClick }: ProblemAreaProps) {
  if (!problem) {
    return (
      <div className="problem-area flex min-h-[50vh] items-center justify-center">
        <p className="text-gray-500">Cargando problema...</p>
      </div>
    )
  }

  return (
    <div className="problem-area mx-auto my-8 max-w-4xl rounded-2xl bg-white p-8 pb-48 shadow-sm">
      <header className="mb-6 border-b border-gray-100 pb-4">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">Tema 1</p>
        <h2 className="mt-2 text-2xl font-bold text-gray-900">{problem.title}</h2>
      </header>

      <div className="space-y-4">
        {problem.content.map((item, idx) => {
          if (item.type === 'text') {
            return (
              <div key={idx} className="problem-text prose prose-lg max-w-none text-black text-lg">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{item.value}</ReactMarkdown>
              </div>
            )
          }

          if (item.type === 'equation') {
            return shouldRenderAsBlock(item.value) ? (
              <div
                key={idx}
                className="problem-equation my-4 text-center text-2xl sm:text-3xl text-black"
                style={{ color: '#000' }}
              >
                <BlockMath math={item.value} />
              </div>
            ) : (
              <div
                key={idx}
                className="problem-equation my-4 text-center text-xl sm:text-2xl text-black"
                style={{ color: '#000' }}
              >
                <InlineMath math={item.value} />
              </div>
            )
          }

          if (item.type === 'image') {
            return (
              <div
                key={idx}
                className="my-6 flex w-full justify-center overflow-hidden rounded-xl border border-gray-100 bg-gray-50 p-2"
              >
                <img
                  src={item.url}
                  alt={item.alt}
                  loading="lazy"
                  className="max-h-96 max-w-full rounded object-contain"
                />
              </div>
            )
          }

          if (item.type === 'diagram') {
            return (
              <div
                key={idx}
                className="my-6 flex w-full justify-center overflow-hidden [&>svg]:h-auto [&>svg]:max-w-full"
                dangerouslySetInnerHTML={{ __html: item.svg }}
              />
            )
          }

          return null
        })}
      </div>

      <div className="mt-8 flex gap-4">
        <button
          type="button"
          onClick={onHintClick}
          aria-label="Abrir ayuda del AI Tutor"
          className="rounded-lg border border-blue-600 px-4 py-2 font-semibold text-blue-600 transition-colors hover:bg-blue-50"
        >
          Hint
        </button>
        <button
          type="button"
          onClick={onAiChatClick}
          aria-label="Abrir panel de AI Tutor"
          className="rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700"
        >
          AI Tutor
        </button>
      </div>
    </div>
  )
}
