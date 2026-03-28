import { create } from 'zustand'
import { ChatMessage } from '../types/ai'
import { Problem, FeedbackState } from '../types/lesson'
import { lessonProblems, replacementProblems } from '../components/lesson/mockLessonData'
import { detectFraud } from '../api/fraudDetectionApi'
import { toast } from 'sonner'
import { useAIStore } from './aiStore'
import { useUIStore } from './uiStore'
import { useAudioStore } from './audioStore'

const baseXp = 100
const fastBonusXp = 50
const maxFastBonusSeconds = 120

const defaultFeedbackState: FeedbackState = {
  status: 'none',
  message: '',
  attemptNumber: 1,
  showFeedback: false,
}

const normalizeAnswer = (value: string) => value.replace(/\s+/g, '').trim().toLowerCase()

interface LessonState {
  currentProblem: Problem | null
  problemIndex: number
  totalProblems: number
  answer: string
  setAnswer: (answer: string) => void
  feedbackState: FeedbackState
  setFeedbackState: (state: FeedbackState) => void
  clearFeedback: () => void
  attemptCount: number
  maxAttempts: number
  attemptHistory: string[]
  totalXp: number
  addXp: (amount: number) => void
  resetLesson: () => void
  submitAnswer: (answer: string, timeTakenSeconds?: number) => Promise<{ correct: boolean; xp: number }>
  skipProblem: () => Promise<void>
  moveToNextProblem: () => Promise<void>
  goToNextLesson: () => void
}

const buildIncorrectMessage = (attemptNumber: number, maxAttempts: number) => {
  if (attemptNumber >= maxAttempts) {
    return 'Has agotado tus intentos. Revisa la explicacion y continua.'
  }

  if (attemptNumber === maxAttempts - 1) {
    return 'Respuesta incorrecta. Ultima oportunidad.'
  }

  return 'Respuesta incorrecta. Intenta de nuevo.'
}

const getInitialState = () => ({
  currentProblem: lessonProblems[0] ?? null,
  problemIndex: 0,
  totalProblems: lessonProblems.length,
  answer: '',
  feedbackState: defaultFeedbackState,
  attemptCount: 0,
  maxAttempts: 3,
  attemptHistory: [] as string[],
  totalXp: 0,
})

export const useLessonStore = create<LessonState>()((set, get) => ({
  ...getInitialState(),

  setAnswer: (answer) => set({ answer }),
  setFeedbackState: (state) => set({ feedbackState: state }),
  clearFeedback: () => set({ feedbackState: defaultFeedbackState }),
  addXp: (amount) => set((state) => ({ totalXp: state.totalXp + amount })),

  resetLesson: () => set(getInitialState()),

  submitAnswer: async (answer, timeTakenSeconds = 0) => {
    const { currentProblem, attemptCount, maxAttempts, attemptHistory } = get()

    if (!currentProblem) {
      return { correct: false, xp: 0 }
    }

    const fraudCheck = await detectFraud({
      studentId: 'student-123',
      problemId: currentProblem.id,
      attempt: answer,
      attemptHistory,
      expectedAnswer: currentProblem.expectedAnswer
    })

    if (fraudCheck.isFraud) {
      toast.error(fraudCheck.reason)
      return { correct: false, xp: 0 }
    }

    set({ attemptHistory: [...attemptHistory, answer] })

    const isCorrect = normalizeAnswer(answer) === normalizeAnswer(currentProblem.expectedAnswer)

    if (isCorrect) {
      // P26-P30: Calculate dynamic XP penalty from hints
      const aiState = useAIStore.getState()
      let penalty = 0
      if (aiState.hasAskedExplanation) {
        penalty = 0.30
      } else if (aiState.hasAskedLevel2) {
        penalty = 0.20
      } else if (aiState.hasAskedLevel1) {
        penalty = 0.10
      }

      const bonus = timeTakenSeconds > 0 && timeTakenSeconds <= maxFastBonusSeconds ? fastBonusXp : 0
      const earnedXp = Math.floor((baseXp * (1 - penalty)) + bonus)

      set((state) => ({
        totalXp: state.totalXp + earnedXp,
        feedbackState: {
          status: 'correct',
          message: bonus > 0 ? 'Correcto. Ganaste XP y bonus rapido.' : 'Correcto. Buen trabajo.',
          attemptNumber: state.attemptCount + 1,
          showFeedback: true,
        },
      }))

      // P1: Trigger global XP bounce animation layer
      useUIStore.getState().showXpGain(earnedXp)
      useAudioStore.getState().playSound('correct')

      return { correct: true, xp: earnedXp }
    }

    const nextAttempt = attemptCount + 1

    set({
      attemptCount: nextAttempt,
      feedbackState: {
        status: 'incorrect',
        message: buildIncorrectMessage(nextAttempt, maxAttempts),
        attemptNumber: nextAttempt,
        showFeedback: true,
      },
    })

    useAudioStore.getState().playSound('incorrect')

    return { correct: false, xp: 0 }
  },

  skipProblem: async () => {
    const { problemIndex } = get()
    const replacementProblem = replacementProblems[problemIndex % replacementProblems.length] ?? null

    set({
      currentProblem: replacementProblem,
      answer: '',
      feedbackState: defaultFeedbackState,
      attemptCount: 0,
    })
  },

  moveToNextProblem: async () => {
    const nextIndex = get().problemIndex + 1

    set({
      problemIndex: nextIndex,
      currentProblem: nextIndex < lessonProblems.length ? lessonProblems[nextIndex] : null,
      answer: '',
      feedbackState: defaultFeedbackState,
      attemptCount: 0,
    })
  },

  goToNextLesson: () => {
    if (typeof window !== 'undefined') {
      window.location.reload()
    }
  },
}))
