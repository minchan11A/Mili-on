/**
 * 시드 JSON 묶음 (seed/ 파이프라인 산출물). JSON은 빌드에 포함되므로 fetch하지 않습니다. (명세 §5.1)
 */
import ranges from '../../data/demo/ranges.json';
import users from '../../data/demo/users.json';
import records from '../../data/demo/training-records.json';
import reviews from '../../data/demo/reviews.json';
import proposals from '../../data/demo/proposals.json';
import empathies from '../../data/demo/proposal-empathies.json';
import history from '../../data/demo/status-history.json';
import replies from '../../data/demo/official-replies.json';
import issues from '../../data/demo/issues.json';
import bestPractices from '../../data/demo/best-practices.json';
import guides from '../../data/demo/guides.json';
import questions from '../../data/demo/questions.json';
import answers from '../../data/demo/answers.json';
import { datasetFromSeed } from '../core/dataset';
import type { Dataset } from '../types';

export function seedDataset(): Dataset {
  return datasetFromSeed({
    ranges, users, 'training-records': records, reviews, proposals, 'proposal-empathies': empathies,
    'status-history': history, 'official-replies': replies, issues, 'best-practices': bestPractices,
    guides, questions, answers,
  });
}
