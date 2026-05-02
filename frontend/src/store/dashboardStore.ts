import { create } from 'zustand'

export interface Skill {
  id: string
  name: string
  category: string
  grade: string
  mastery: number
  problemsSolved: number
  totalProblems: number
  accuracy: number
  drop?: number
}

export interface Task {
  id: string
  name: string
  deadline: string
  difficulty: 'Easy' | 'Medium' | 'Hard'
  yourPreviousAccuracy?: number
}

export interface Recommendation {
  id: string
  skill: string
  reason: string
  difficulty: 'Easy' | 'Medium' | 'Hard'
  estimatedTime: number
}

export interface LeaderboardEntry {
  studentId: string
  name: string
  skillsmastered: number
  xp: number
  isCurrentUser: boolean
}

export interface DashboardState {
  userName: string
  userLevel: number
  totalXP: number
  streak: number
  accuracy: number
  dailyProgress: number
  dailyMinutes: number
  weeklyProgress: number
  profileLoaded: boolean

  skills: Skill[]
  tasks: Task[]
  recommendations: Recommendation[]
  leaderboardData: LeaderboardEntry[]

  filters: { grade: string, category: string, search: string }
  applyFilter: (type: 'grade' | 'category' | 'search', value: string) => void
  setProfile: (data: Partial<DashboardState>) => void
}

const emptyLearningData = {
  skills: [],
  tasks: [],
  recommendations: [],
  leaderboardData: [],
}

export const useDashboardStore = create<DashboardState>((set) => ({
  userName: 'Estudiante',
  userLevel: 1,
  totalXP: 0,
  streak: 0,
  accuracy: 0,
  dailyProgress: 0,
  dailyMinutes: 0,
  weeklyProgress: 0,
  profileLoaded: false,

  ...emptyLearningData,

  filters: { grade: 'Todos', category: 'Todos', search: '' },

  applyFilter: (type, value) => set((state) => ({
    filters: { ...state.filters, [type]: value },
  })),

  setProfile: (data) => set(() => ({
    ...emptyLearningData,
    ...data,
    profileLoaded: true,
  })),
}))
