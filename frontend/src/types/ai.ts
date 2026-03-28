export type QuestionType = 'direct_request' | 'conceptual' | 'strategy' | 'general_math'

export interface ExplanationStep {
  title: string
  description: string
  equation?: string
  image?: string
}

export interface ChatMessage {
  id: string
  studentId: string
  problemId: string
  role: 'student' | 'ai'
  content: string | ExplanationStep[] | any
  timestamp: Date
  messageType: 'question' | 'hint_l1' | 'hint_l2' | 'explanation' | 'exercise' | 'general'
}

export interface StudentSkill {
  skillId: string
  mastery: number
  errors?: string[]
}

export interface StudentError {
  type: string
  description: string
}

export interface StudentProfile {
  studentId: string
  name: string
  gradeLevel: number
  learningStyle: 'visual' | 'auditory' | 'kinesthetic'
  masteredSkills: StudentSkill[]
  inProgressSkills: StudentSkill[]
  commonErrors: StudentError[]
}

export interface AIResponse {
  answer: string
  type: string
}
