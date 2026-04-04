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
  difficulty: "Easy" | "Medium" | "Hard"
  yourPreviousAccuracy?: number
}

export interface Recommendation {
  id: string
  skill: string
  reason: string
  difficulty: "Easy" | "Medium" | "Hard"
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

const mockSkills: Skill[] = [
  { id: '1', name: 'Suma de Fracciones', category: 'Aritmética', grade: 'Grado 5-6', mastery: 100, problemsSolved: 50, totalProblems: 50, accuracy: 95 },
  { id: '2', name: 'Área y Perímetro', category: 'Geometría', grade: 'Grado 5-6', mastery: 85, problemsSolved: 34, totalProblems: 40, accuracy: 88 },
  { id: '3', name: 'Ecuaciones Lineales', category: 'Álgebra', grade: 'Grado 7-8', mastery: 40, problemsSolved: 12, totalProblems: 30, accuracy: 40, drop: 15 },
  { id: '4', name: 'Derivadas Básicas', category: 'Cálculo', grade: 'Grado 11-12', mastery: 20, problemsSolved: 4, totalProblems: 20, accuracy: 25 },
]

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

  skills: mockSkills,
  tasks: [
    { id: 't1', name: 'Fracciones Especiales', deadline: '2026-03-22', difficulty: 'Hard', yourPreviousAccuracy: 40 },
    { id: 't2', name: 'Álgebra Básica', deadline: '2026-03-28', difficulty: 'Medium' }
  ],
  recommendations: [
    { id: 'r1', skill: 'Ecuaciones Lineales', reason: 'Tuviste dificultades en la última prueba', difficulty: 'Medium', estimatedTime: 15 }
  ],
  leaderboardData: [
    { studentId: '1', name: 'Juan', skillsmastered: 45, xp: 15230, isCurrentUser: true },
    { studentId: '2', name: 'María', skillsmastered: 42, xp: 14890, isCurrentUser: false },
    { studentId: '3', name: 'Carlos', skillsmastered: 38, xp: 13500, isCurrentUser: false },
    { studentId: '4', name: 'Ana', skillsmastered: 35, xp: 12100, isCurrentUser: false },
    { studentId: '5', name: 'Pedro', skillsmastered: 30, xp: 10500, isCurrentUser: false },
  ],

  filters: { grade: 'Todos', category: 'Todos', search: '' },

  applyFilter: (type, value) => set((state) => ({
    filters: { ...state.filters, [type]: value }
  })),

  setProfile: (data) => set((_state) => ({
    ...data,
    profileLoaded: true,
  })),
}))
