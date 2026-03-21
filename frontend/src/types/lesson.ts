export interface Problem {
  id: string;
  title: string;
  content: ProblemContentItem[];
  expectedAnswer: string;
  skillId: string;
}

export type ProblemContentItem =
  | { type: 'text'; value: string }
  | { type: 'equation'; value: string }
  | { type: 'image'; url: string; alt: string }
  | { type: 'diagram'; svg: string };

export interface FeedbackState {
  status: 'none' | 'incorrect' | 'correct';
  message: string;
  attemptNumber: number;
  showFeedback: boolean;
}
