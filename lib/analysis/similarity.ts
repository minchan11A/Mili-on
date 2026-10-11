/**
 * 유사 제안 찾기 (명세 §5.4). 임베딩 없이 오프라인에서 동작합니다.
 * 토큰: 한글 2-gram + 공백 단어, 불용어 제거. 유사도: Jaccard.
 */

export const SIMILARITY_THRESHOLD = 0.3;

const STOPWORDS = new Set([
  '너무', '진짜', '정말', '좀', '있어요', '없어요', '했어요', '해요', '합니다', '했습니다', '같아요', '좋겠어요', '좋겠습니다',
  '그리고', '근데', '그런데', '그래서', '매우', '아주', '많이', '조금', '계속', '항상', '다시', '것', '수', '때', '더',
  '이', '그', '저', '은', '는', '이가', '을', '를', '에', '의', '도', '요', '네요', '어요', '습니다', '주세요', '해주세요',
]);

/** 어미·조사를 대충 떼어 냄 (오프라인 경량 처리) */
const SUFFIX_RE = /(이에요|예요|에서|으로|에게|까지|부터|이랑|하고|해서|했어요|있어요|없어요|합니다|입니다|이요|어요|아요|해요|네요|은|는|이|가|을|를|에|의|도|로|와|과|만)$/;

export function tokenize(text: string): Set<string> {
  const clean = (text ?? '')
    .toLowerCase()
    .replace(/\[[^\]]*\]/g, ' ')            // 마스킹 토큰 제외
    .replace(/[^가-힣a-z0-9\s]/g, ' ');
  const tokens = new Set<string>();
  for (const raw of clean.split(/\s+/)) {
    if (!raw || STOPWORDS.has(raw)) continue;
    const word = raw.length > 2 ? raw.replace(SUFFIX_RE, '') : raw;
    if (!word || STOPWORDS.has(word)) continue;
    if (word.length >= 2) tokens.add(`w:${word}`);
    const hangul = word.replace(/[^가-힣]/g, '');
    for (let i = 0; i + 1 < hangul.length; i++) tokens.add(`g:${hangul.slice(i, i + 2)}`);
  }
  return tokens;
}

export function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  return inter / (a.size + b.size - inter);
}

export function similarity(a: string, b: string): number {
  return jaccard(tokenize(a), tokenize(b));
}

/** text 외에 제목 등 짧은 텍스트를 altTexts로 주면 그중 가장 높은 Jaccard를 씀 (긴 본문은 집합이 커져 점수가 낮아지므로) */
export interface SimilarCandidate { id: string; text: string; altTexts?: string[]; rangeId: string; category: string }

/** 같은 훈련장·같은 카테고리 안에서 유사도 0.3 이상 상위 3건 */
export function findSimilar<T extends SimilarCandidate>(
  pool: T[], query: { rangeId: string; category?: string; text: string }, limit = 3, threshold = SIMILARITY_THRESHOLD,
): Array<T & { score: number }> {
  const q = tokenize(query.text);
  if (q.size === 0) return [];
  return pool
    .filter((p) => p.rangeId === query.rangeId && (!query.category || p.category === query.category))
    .map((p) => ({ ...p, score: Math.max(jaccard(q, tokenize(p.text)), ...(p.altTexts ?? []).map((t) => jaccard(q, tokenize(t)))) }))
    .filter((p) => p.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
