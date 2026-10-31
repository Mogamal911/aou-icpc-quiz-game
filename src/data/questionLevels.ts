import type { QuestionDifficulty } from '../types/game';

export const QUESTION_LEVELS: QuestionDifficulty[] = ['beginner', 'intermediate', 'advanced'];
export type QuestionLevelFilter = 'all' | QuestionDifficulty | 'unrated';
export const LEVEL_LABELS = {
  beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced', unrated: 'Unrated',
};
export const LEVEL_DESCRIPTIONS = {
  beginner: 'Core concepts and short code traces. Suggested time: 20–30 seconds.',
  intermediate: 'Apply familiar data structures and algorithms. Suggested time: 30–45 seconds.',
  advanced: 'Reason about constraints, correctness and multi-step problems. Suggested time: 45–60 seconds.',
};
