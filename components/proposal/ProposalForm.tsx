'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Badge, Button, Card, Chip, EmptyState, Field, inputCls, Loading, Notice } from '@/components/ui';
import { SecurityWarning, type SecurityLevel } from '@/components/security/SecurityWarning';
import { MaskHighlight } from '@/components/security/MaskHighlight';
import { useToast } from '@/components/layout/Toast';
import { useViewer } from '@/components/layout/ViewerProvider';
import { getDataSource, DataError } from '@/lib/data';
import { useDebounced, useQuery } from '@/lib/hooks';
import { CATEGORIES, CATEGORY_LABEL, SUBTOPICS } from '@/lib/constants';
import { cx } from '@/lib/format';
import type { Category, ProposalView } from '@/lib/types';

/** 개선 제안 작성 (명세 §6.4): 카테고리 → 세부 주제 → 제목·내용(보안 경고) → 유사 제안 → 제출 */
export function ProposalForm({ rangeId }: { rangeId: string }) {
  const ds = getDataSource();
  const router = useRouter();
  const toast = useToast();
  const { viewer, ready } = useViewer();
  const range = useQuery(() => ds.getRange(rangeId), [rangeId]);
  const [category, setCategory] = useState<Category | null>(null);
  const [subtopic, setSubtopic] = useState<string>('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [titleLevel, setTitleLevel] = useState<SecurityLevel>('ok');
  const [bodyLevel, setBodyLevel] = useState<SecurityLevel>('ok');
  const [similar, setSimilar] = useState<ProposalView[]>([]);
  const [dismissed, setDismissed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const text = useDebounced(`${title} ${body}`.trim(), 400);

  useEffect(() => {
    if (!category || text.length < 6) { setSimilar([]); return; }
    let alive = true;
    ds.findSimilarProposals(rangeId, text, category).then((r) => { if (alive) setSimilar(r); }, () => {});
    return () => { alive = false; };
  }, [text, category, rangeId, ds]);

  if (!ready || !range.data) return <Loading />;
  if (viewer?.role !== 'RESERVIST') {
    return <EmptyState title="예비군만 제안할 수 있습니다" desc={viewer ? '담당자 계정으로는 제안을 작성할 수 없습니다.' : '로그인 후 이용해 주세요.'} action={<Link className="text-primary" href={`/ranges/${rangeId}?tab=proposals`}>제안 목록 보기</Link>} />;
  }

  const blocked = titleLevel === 'block' || bodyLevel === 'block';
  const canSubmit = !!category && title.trim().length > 0 && body.trim().length > 0 && !blocked && !busy;
  const showSimilar = similar.length > 0 && !dismissed;

  async function empathizeAndFinish(p: ProposalView) {
    try {
      if (!p.empathized) await ds.toggleEmpathy(p.id);
      toast('공감했습니다. 처리 상태는 "내 활동"에서 확인할 수 있어요');
      router.push(`/proposal?id=${encodeURIComponent(p.id)}`);
    } catch (e) { toast((e as Error).message, 'error'); }
  }

  async function submit() {
    if (!category) return;
    setBusy(true); setErr(null);
    try {
      const p = await ds.createProposal({ rangeId, category, subtopic: subtopic || undefined, title, body });
      toast('제안이 접수되었습니다');
      router.push(`/proposal?id=${encodeURIComponent(p.id)}`);
    } catch (e) {
      setErr(e instanceof DataError && e.code === 'BLOCKED' ? `보안 검사에서 차단되었습니다: ${(e.reasons ?? []).join(', ')}` : (e as Error).message);
    } finally { setBusy(false); }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link href={`/ranges/${rangeId}?tab=proposals`} className="text-sm text-ink-3">← {range.data.name}</Link>
      <h1 className="mb-1 mt-1 text-2xl font-semibold">{range.data.name} 개선 제안</h1>
      <p className="mb-5 text-ink-2">불편했던 점과 바라는 점을 적어 주세요. 담당자가 처리 과정을 공개합니다.</p>

      <div className="space-y-5">
        <section>
          <h2 className="mb-2 font-semibold">1. 어떤 분야인가요?</h2>
          <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="카테고리">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={category === c}
                data-testid={`cat-${c}`}
                onClick={() => { setCategory(c); setSubtopic(''); }}
                className={cx('min-h-12 rounded-xl border px-1 text-center text-[13px] font-medium transition-colors', category === c ? 'border-ink bg-ink text-white' : 'border-line bg-surface text-ink-2 hover:border-ink-3')}
              >
                {CATEGORY_LABEL[c]}
              </button>
            ))}
          </div>
        </section>

        {category && (
          <section>
            <h2 className="mb-2 font-semibold">2. 세부 주제</h2>
            <div className="flex flex-wrap gap-2">
              {SUBTOPICS[category].filter((s) => s !== '기타').map((s) => <Chip key={s} active={subtopic === s} onClick={() => setSubtopic(s)}>{s}</Chip>)}
              <Chip active={subtopic === '기타'} onClick={() => setSubtopic('기타')}>기타</Chip>
            </div>
          </section>
        )}

        <section className="space-y-3">
          <h2 className="font-semibold">3. 내용</h2>
          <Field label="제목" counter={`${title.length}/50`}>
            <SecurityWarning value={title} onChange={setTitle} onLevelChange={setTitleLevel} multiline={false} maxLength={50} placeholder="예: 점심 배식 줄이 너무 길어요" label="제목" testId="proposal-title" />
          </Field>
          <Field label="내용" counter={`${body.length}/1000`}>
            <SecurityWarning value={body} onChange={setBody} onLevelChange={setBodyLevel} rows={6} maxLength={1000} placeholder="언제, 어디서, 무엇이 불편했는지 구체적으로 적어 주세요. 부대명·사람 이름·연락처는 쓰지 않아도 됩니다." label="내용" testId="proposal-body" />
          </Field>
        </section>

        {showSimilar && (
          <Card className="border-primary/40 p-4" data-testid="similar-panel">
            <h2 className="font-semibold">비슷한 제안이 있어요. 공감하시겠어요?</h2>
            <p className="mb-3 text-sm text-ink-2">같은 훈련장의 비슷한 제안에 공감하면 우선순위가 올라갑니다.</p>
            <ul className="space-y-2">
              {similar.map((p) => (
                <li key={p.id} className="rounded-xl border border-line p-3">
                  <div className="mb-1 flex items-center gap-2 text-xs text-ink-3"><Badge tone="olive">{p.subtopic}</Badge>{p.empathyCount}</div>
                  <div className="font-semibold">{p.title}</div>
                  <p className="line-clamp-2 text-sm text-ink-2"><MaskHighlight text={p.body} /></p>
                  <Button size="sm" className="mt-2" data-testid="empathize-finish" onClick={() => empathizeAndFinish(p)}>{p.empathized ? '이미 공감함 · 보러 가기' : '공감하고 끝내기'}</Button>
                </li>
              ))}
            </ul>
            <Button variant="ghost" size="sm" className="mt-2" onClick={() => setDismissed(true)}>그래도 새로 작성</Button>
          </Card>
        )}

        {err && <Notice tone="danger">{err}</Notice>}
        <Button size="lg" className="w-full" disabled={!canSubmit} onClick={submit} data-testid="proposal-submit">
          {blocked ? '보안 검사에 걸린 내용을 지워 주세요' : busy ? '등록 중…' : '제안 등록'}
        </Button>
        <p className="text-center text-xs text-ink-3">등록하면 부대명·장비명 등은 가려진 상태로 저장되고, 담당자에게는 작성자 별명 대신 연령대·훈련 유형만 보입니다.</p>
      </div>
    </div>
  );
}
