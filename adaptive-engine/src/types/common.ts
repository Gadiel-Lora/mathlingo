import { SkillCriticality } from './mastery';

export interface Exercise {
  id: string;
  skillId: string;
  difficulty: number;             // 1-10
  problemType: 'directo' | 'variación' | 'transferencia';
  statement: string;
  correctAnswer: string;
  expectedNotation?: RegExp;
  correctSteps?: string[];
}

export interface ExerciseAttempt {
  id: string;
  userId: string;
  exerciseId: string;
  skillId: string;
  studentAnswer: string;
  isCorrect: boolean;
  errorClassification?: any;
  timeMs: number;
  attemptNumber: number;
  createdAt: Date;
}

export interface StudentProfile {
  userId: string;
  currentGrade: number;
  enrollmentDate: Date;
  preferredPace: 'slow' | 'normal' | 'fast';
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  domain: string;
  difficulty: number;
  criticality: SkillCriticality;
  prerequisites: string[];
}
