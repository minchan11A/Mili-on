import type { Category, Solution } from '../types';

export interface LlmProvider {
  name: string;                                   // "commercial:claude" | "cache"
  generateSolution(input: SolutionInput): Promise<Solution>;
  summarizeIssue(input: SummaryInput): Promise<string>;
  answerQuestion(input: QnaInput): Promise<QnaAnswer | null>;
  classifyProposal?(maskedText: string): Promise<{ category: Category; subtopic: string; sentiment: 1 | 2 | 3 }>;
}

export interface SolutionInput {
  issueId: string;
  category: Category;
  subtopic: string;
  maskedProposals: string[];        // 대표 제안 최대 20건 (마스킹 후)
  stats: { proposalCount: number; empathyCount: number; rangeCount: number; trend: 'up' | 'flat' | 'down' };
  bestPractices: Array<{ id: string; title: string; before: string; after: string }>;  // 근거 후보
}

export interface SummaryInput { issueId: string; category: Category; subtopic: string; maskedProposals: string[] }

export interface QnaInput {
  question: string;                 // 마스킹 후
  guides: Array<{ id: string; section: string; body: string }>;
}
export interface QnaAnswer { body: string; sourceGuideIds: string[] }

export class SolutionGenerationError extends Error {
  constructor(message: string, public readonly raw?: string) { super(message); }
}
