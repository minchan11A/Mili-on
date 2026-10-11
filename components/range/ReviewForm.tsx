'use client';
import Link from 'next/link';
import { useState } from 'react';
import { Button, Card, EmptyState, LinkButton, Loading, Notice } from '@/components/ui';
import { SecurityWarning, type SecurityLevel } from '@/components/security/SecurityWarning';
import { getDataSource, DataError } from '@/lib/data';
import { useQuery } from '@/lib/hooks';
import { SCORE_AXES, type ScoreKey } from '@/lib/constants';
import { cx } from '@/lib/format';

const SCORE_WORD = ['', '매우 나쁨', '나쁨', '보통', '좋음', '매우 좋음'];

/** 만족도 평가 작성: 5개 지표 1~5점, 큰 터치 영역, 1분 안에 끝 (명세 §6.3) */
export function ReviewForm({ rangeId }: { rangeId: string }) {
  const ds = getDataSource();
  const range = useQuery(() => ds.getRange(rangeId), [rangeId]);
  const el = useQuery(() => ds.getReviewEligibility(rangeId), [rangeId]);
  const [scores, setScores] = useState<Partial<Record<ScoreKey, number>>>({});
  const [comment, setComment] = useState('');
  const [level, setLevel] = useState<SecurityLevel>('ok');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (!range.data || !el.data) return <Loading />;
  if (done) {
    return (
      <EmptyState
        icon="🙏"
        title="평가가 등록되었습니다"
        desc="불편했던 점을 구체적으로 제안하면 담당자가 처리 과정을 공개합니다."
        action={<div className="mt-2 flex flex-wrap justify-center gap-2"><LinkButton href={`/ranges/${rangeId}/propose`}>✍️ 개선 제안도 남기기</LinkButton><LinkButton href={`/ranges/${rangeId}`} variant="secondary">훈련장으로</LinkButton></div>}
      />
    );
  }
  if (!el.data.eligible) {
    return <EmptyState icon="🔒" title="평가할 수 없습니다" desc={el.data.reason} action={<Link className="text-primary" href={`/ranges/${rangeId}`}>훈련장으로 돌아가기</Link>} />;
  }
  const complete = SCORE_AXES.every((a) => scores[a.key]);
  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-1 text-2xl font-extrabold">{range.data.name} 평가</h1>
      <p className="mb-5 text-ink-2">지표마다 점수를 눌러 주세요. 1분이면 끝납니다.</p>
      <div className="space-y-4">
        {SCORE_AXES.map((a) => (
          <Card key={a.key} className="p-4">
            <div className="mb-2 flex items-baseline justify-between">
              <span className="font-bold">{a.label}</span>
              <span className="text-sm text-ink-3">{SCORE_WORD[scores[a.key] ?? 0]}</span>
            </div>
            <div className="grid grid-cols-5 gap-2" role="radiogroup" aria-label={a.label}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={scores[a.key] === n}
                  aria-label={`${a.label} ${n}점`}
                  data-testid={`score-${a.key}-${n}`}
                  onClick={() => setScores({ ...scores, [a.key]: n })}
                  className={cx('min-h-12 rounded-xl border text-lg font-extrabold transition-colors', (scores[a.key] ?? 0) >= n ? 'border-primary bg-primary text-white' : 'border-line bg-surface text-ink-3')}
                >
                  {n}
                </button>
              ))}
            </div>
          </Card>
        ))}
        <Card className="p-4">
          <div className="mb-2 font-bold">한 줄 의견 <span className="text-sm font-normal text-ink-3">(선택, 300자)</span></div>
          <SecurityWarning value={comment} onChange={setComment} onLevelChange={setLevel} rows={2} maxLength={300} placeholder="가장 좋았던 점이나 불편했던 점" label="한 줄 의견" />
        </Card>
        {err && <Notice tone="danger">{err}</Notice>}
        <Button size="lg" className="w-full" disabled={!complete || level === 'block' || busy} data-testid="review-submit" onClick={async () => {
          setBusy(true); setErr(null);
          try {
            await ds.createReview({ rangeId, recordId: el.data!.recordId!, ...(scores as Record<ScoreKey, number>), comment });
            setDone(true);
          } catch (e) { setErr(e instanceof DataError && e.reasons ? `등록할 수 없습니다: ${e.reasons.join(', ')}` : (e as Error).message); } finally { setBusy(false); }
        }}>{complete ? '평가 등록' : '모든 지표를 선택해 주세요'}</Button>
      </div>
    </div>
  );
}
