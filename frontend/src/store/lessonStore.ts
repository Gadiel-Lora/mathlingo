import { create } from 'zustand'
import { ChatMessage } from '../types/ai'
import { Problem, FeedbackState } from '../types/lesson'

interface LessonState {
  // Problema actual
  currentProblem: Problem | null
  problemIndex: number
  totalProblems: number
  
  // Respuesta estudiante
  answer: string
  setAnswer: (answer: string) => void
  
  // Feedback
  feedbackState: FeedbackState
  setFeedbackState: (state: FeedbackState) => void
  
  // Intentos
  attemptCount: number
  maxAttempts: number
  
  // XP
  totalXp: number
  addXp: (amount: number) => void

  // AI Tutor & Chat (Integrado en LessonStore como indica P2)
  aiSidebarOpen: boolean
  toggleAISidebar: () => void
  chatHistory: ChatMessage[]
  addChatMessage: (msg: string, sender: 'student' | 'ai') => void
  
  // Metodos
  submitAnswer: (answer: string) => Promise<{correct: boolean, xp: number}>
  skipProblem: () => Promise<void>
  moveToNextProblem: () => Promise<void>
  goToNextLesson: () => void
}

export const useLessonStore = create<LessonState>((set) => ({
  currentProblem: null,
  problemIndex: 0,
  totalProblems: 5,
  
  answer: '',
  setAnswer: (answer) => set({ answer }),
  
  feedbackState: { status: 'none', message: '', attemptNumber: 1, showFeedback: false },
  setFeedbackState: (state) => set({ feedbackState: state }),
  
  attemptCount: 0,
  maxAttempts: 3,
  
  totalXp: 0,
  addXp: (amount) => set((state) => ({ totalXp: state.totalXp + amount })),

  aiSidebarOpen: false,
  toggleAISidebar: () => set((state) => ({ aiSidebarOpen: !state.aiSidebarOpen })),
  
  chatHistory: [],
  addChatMessage: (msg, sender) => set((state) => ({
    chatHistory: [...state.chatHistory, { msg, sender, timestamp: Date.now() }]
  })),
  
  submitAnswer: async (answer) => { return { correct: false, xp: 0 } },
  skipProblem: async () => {},
  moveToNextProblem: async () => {},
  goToNextLesson: () => {}
}))

