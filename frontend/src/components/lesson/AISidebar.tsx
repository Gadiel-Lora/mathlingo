import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLessonStore } from '../../store/lessonStore'

export default function AISidebar() {
  const { aiSidebarOpen, toggleAISidebar, chatHistory, addChatMessage } = useLessonStore()
  const [inputValue, setInputValue] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [chatHistory])

  if (!aiSidebarOpen) return null

  const handleSend = () => {
    if (!inputValue.trim()) return
    addChatMessage(inputValue.trim(), 'student')
    setInputValue('')
    // Mock AI response
    setTimeout(() => {
      addChatMessage("¡Buena pregunta! Pensemos en esto paso a paso...", 'ai')
    }, 1000)
  }

  const handleActionClick = (actionText: string) => {
    addChatMessage(`Quisiera ${actionText.toLowerCase()}`, 'student')
    setTimeout(() => {
      addChatMessage(`Generando ${actionText.toLowerCase()}...`, 'ai')
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
          <h2 className="font-bold text-gray-800 flex items-center gap-2">
            <span className="text-xl">💬</span> AI Tutor
          </h2>
          <button 
            onClick={toggleAISidebar}
            className="text-gray-500 hover:text-gray-800 p-2 rounded hover:bg-gray-200 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Chat history (scrollable) */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
          {chatHistory.length === 0 ? (
            <div className="text-center text-gray-500 mt-10">
              <p>Hola, oye en que te puedo ayudar?</p>
            </div>
          ) : (
            chatHistory.map((msg, idx) => (
              <div 
                key={idx} 
                className={`p-3 rounded-lg max-w-[85%] text-sm ${
                  msg.sender === 'ai' 
                    ? 'bg-white border border-gray-200 text-gray-800 self-start' 
                    : 'bg-indigo-600 text-white self-end ml-auto'
                }`}
              >
                {msg.msg}
              </div>
            ))
          )}
        </div>

        {/* Action Buttons & Input box (sticky bottom) */}
        <div className="p-4 border-t border-gray-200 bg-white flex-none sticky bottom-0">
          <div className="grid grid-cols-2 gap-2 mb-3">
            <button onClick={() => handleActionClick('Pista L1')} className="text-xs py-1.5 px-2 bg-indigo-50 text-indigo-700 rounded border border-indigo-100 font-medium hover:bg-indigo-100 transition-colors">
              Pista L1
            </button>
            <button onClick={() => handleActionClick('Pista L2')} className="text-xs py-1.5 px-2 bg-indigo-50 text-indigo-700 rounded border border-indigo-100 font-medium hover:bg-indigo-100 transition-colors">
              Pista L2
            </button>
            <button onClick={() => handleActionClick('Una explicación')} className="text-xs py-1.5 px-2 bg-indigo-50 text-indigo-700 rounded border border-indigo-100 font-medium hover:bg-indigo-100 transition-colors">
              Explicación
            </button>
            <button onClick={() => handleActionClick('Un problema similar')} className="text-xs py-1.5 px-2 bg-indigo-50 text-indigo-700 rounded border border-indigo-100 font-medium hover:bg-indigo-100 transition-colors">
              Problema similar
            </button>
          </div>
          
          <div className="relative flex items-center">
            <input 
              type="text" 
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Escribe tu mensaje..." 
              className="w-full pl-3 pr-10 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
            />
            <button 
              onClick={handleSend}
              disabled={!inputValue.trim()}
              className="absolute right-1 top-1 bottom-1 w-8 flex items-center justify-center bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:bg-gray-400 transition-colors"
            >
              ↑
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

