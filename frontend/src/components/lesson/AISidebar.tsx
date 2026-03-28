import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ExplanationSteps from './ExplanationSteps'
import FollowUpProblem from './FollowUpProblem'
import { useAIStore } from '../../store/aiStore'
import { useLessonStore } from '../../store/lessonStore'

export default function AISidebar() {
  const { sidebarOpen, toggleSidebar, chatHistory, addMessage, requestHint, hasAskedLevel1, hasAskedLevel2, requestExplanation, requestFollowUpProblem, language, setLanguage, requestStrategies } = useAIStore()
  const { currentProblem } = useLessonStore()
  const [inputValue, setInputValue] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [chatHistory])

  if (!sidebarOpen) return null

  const createDummyMsg = (content: string, role: 'student' | 'ai', type: any = 'question') => {
    addMessage({
      id: Math.random().toString(36).substring(7),
      studentId: 'student-123',
      problemId: currentProblem?.id || 'unknown',
      role,
      content,
      timestamp: new Date(),
      messageType: type
    })
  }

  const handleSend = () => {
    if (!inputValue.trim()) return
    createDummyMsg(inputValue.trim(), 'student', 'question')
    setInputValue('')
    // Mock AI response
    setTimeout(() => {
      createDummyMsg(language === 'en' ? "Good question! Let's think step by step..." : "¡Buena pregunta! Pensemos en esto paso a paso...", 'ai', 'general')
    }, 1000)
  }

  const handleActionClick = (actionText: string) => {
    createDummyMsg(`Quisiera ${actionText.toLowerCase()}`, 'student', 'question')
    setTimeout(() => {
      createDummyMsg(`Generando ${actionText.toLowerCase()}...`, 'ai', 'general')
    }, 800)
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="fixed right-0 top-0 bottom-0 w-[320px] md:w-[380px] bg-white shadow-2xl z-40 flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50 flex-none">
          <h2 className="font-bold text-gray-800 flex items-center gap-2" id="ai-tutor-title">
            <span className="text-xl" aria-hidden="true">💬</span> AI Tutor
          </h2>
          <div className="flex items-center gap-2">
            <label htmlFor="ai-lang-select" className="sr-only">Idioma del tutor</label>
            <select 
              id="ai-lang-select"
              value={language} 
              onChange={e => setLanguage(e.target.value as 'es'|'en')}
              className="text-xs border border-gray-300 py-1 px-2 rounded bg-white text-gray-600 outline-none cursor-pointer hover:bg-gray-100"
              aria-label="Seleccionar idioma del AI Tutor"
            >
              <option value="es">ES</option>
              <option value="en">EN</option>
            </select>
            <button 
              onClick={toggleSidebar}
              aria-label="Cerrar panel del AI Tutor"
              className="text-gray-500 hover:text-gray-800 p-2 rounded hover:bg-gray-200 transition-colors"
            >
              <span aria-hidden="true">✕</span>
            </button>
          </div>
        </div>

        {/* Chat history (scrollable) + aria-live region for screen readers */}
        <div 
          ref={scrollRef} 
          className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50"
          role="log"
          aria-live="polite"
          aria-atomic="false"
          aria-label="Historial de conversación con el AI Tutor"
          aria-labelledby="ai-tutor-title"
        >
          {chatHistory.length === 0 ? (
            <div className="text-center text-gray-500 mt-10" role="status">
              <p>Hola, ¿en qué te puedo ayudar?</p>
            </div>
          ) : (
            chatHistory.map((msg, idx) => (
              <div 
                key={msg.id || idx} 
                role={msg.role === 'ai' ? 'article' : 'note'}
                aria-label={msg.role === 'ai' ? 'Respuesta del AI Tutor' : 'Tu mensaje'}
                className={`p-3 rounded-lg max-w-[85%] text-sm ${
                  msg.role === 'ai' 
                    ? 'bg-white border border-gray-200 text-gray-800 self-start' 
                    : 'bg-indigo-600 text-white self-end ml-auto'
                } ${msg.messageType === 'explanation' || msg.messageType === 'exercise' ? 'w-[95%] max-w-[95%] !p-0 !bg-transparent !border-0' : ''}`}
              >
                {msg.messageType === 'explanation' ? (
                  <ExplanationSteps steps={msg.content} onComplete={() => requestFollowUpProblem()} />
                ) : msg.messageType === 'exercise' ? (
                  <FollowUpProblem problem={msg.content} />
                ) : (
                  msg.content
                )}
              </div>
            ))
          )}
        </div>

        {/* Action Buttons & Input box (sticky bottom) */}
        <div className="p-4 border-t border-gray-200 bg-white flex-none sticky bottom-0">
          <div className="grid grid-cols-2 gap-2 mb-3" role="group" aria-label="Acciones del AI Tutor">
            <button 
              onClick={() => requestHint(1)} 
              disabled={hasAskedLevel1}
              aria-label={hasAskedLevel1 ? 'Pista nivel 1 ya solicitada' : 'Solicitar pista nivel 1'}
              aria-pressed={hasAskedLevel1}
              className={`text-xs py-1.5 px-2 rounded border font-medium transition-colors ${
                !hasAskedLevel1
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-100 hover:bg-indigo-100'
                  : 'bg-gray-100 text-gray-500 border-gray-200'
              }`}
            >
              Pista L1 {hasAskedLevel1 && '✓'}
            </button>
            <button 
              onClick={() => requestHint(2)} 
              disabled={!hasAskedLevel1}
              aria-label={!hasAskedLevel1 ? 'Primero solicita la pista nivel 1' : 'Solicitar pista nivel 2'}
              aria-disabled={!hasAskedLevel1}
              className={`text-xs py-1.5 px-2 rounded border font-medium transition-colors ${
                hasAskedLevel1
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-100 hover:bg-indigo-100'
                  : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
              }`}
            >
              {hasAskedLevel2 ? 'Más Pista L2 +' : !hasAskedLevel1 ? '🔒 Pista L2' : 'Pista L2'}
            </button>
            <button 
              onClick={() => requestExplanation()} 
              aria-label="Solicitar explicación completa paso a paso"
              className="text-xs py-1.5 px-2 bg-indigo-50 text-indigo-700 rounded border border-indigo-100 font-medium hover:bg-indigo-100 transition-colors"
            >
              Explicación
            </button>
            <button 
              onClick={() => requestFollowUpProblem()} 
              aria-label="Solicitar un problema similar para practicar"
              className="text-xs py-1.5 px-2 bg-indigo-50 text-indigo-700 rounded border border-indigo-100 font-medium hover:bg-indigo-100 transition-colors"
            >
              Problema similar
            </button>
            <button 
              onClick={() => requestStrategies()} 
              aria-label="Ver 3 estrategias alternativas de resolución"
              className="col-span-2 text-xs py-1.5 px-2 bg-white text-indigo-600 rounded border border-indigo-200 font-medium hover:bg-indigo-50 transition-colors mt-1"
            >
              Ver otras estrategias de resolución
            </button>
          </div>
          
          <div className="relative flex items-center">
            <label htmlFor="ai-chat-input" className="sr-only">Escribe tu pregunta al AI Tutor</label>
            <input 
              id="ai-chat-input"
              type="text" 
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Escribe tu mensaje..." 
              aria-label="Mensaje para el AI Tutor"
              className="w-full pl-3 pr-10 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
            />
            <button 
              onClick={handleSend}
              disabled={!inputValue.trim()}
              aria-label="Enviar mensaje al AI Tutor"
              className="absolute right-1 top-1 bottom-1 w-8 flex items-center justify-center bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:bg-gray-400 transition-colors"
            >
              <span aria-hidden="true">↑</span>
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

