/**
 * 시드 JSON 묶음. JSON은 빌드에 포함되므로 fetch하지 않습니다. (명세 §5.1)
 */
import ranges from '../../data/demo/ranges.json';
import users from '../../data/demo/users.json';
import records from '../../data/demo/records.json';
import reviews from '../../data/demo/reviews.json';
import proposals from '../../data/demo/proposals.json';
import empathies from '../../data/demo/empathies.json';
import history from '../../data/demo/history.json';
import replies from '../../data/demo/replies.json';
import issues from '../../data/demo/issues.json';
import bestPractices from '../../data/demo/best-practices.json';
import guides from '../../data/demo/guides.json';
import qna from '../../data/demo/qna.json';
import audits from '../../data/demo/audits.json';
import type { Dataset } from '../types';

export function seedDataset(): Dataset {
  return {
    ranges, users, records, reviews, proposals, empathies, history, replies, issues, bestPractices, guides,
    questions: qna.questions, answers: qna.answers, audits, solutions: [], reports: [],
  } as unknown as Dataset;
}
