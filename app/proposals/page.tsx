'use client';
import { useState } from 'react';
import { Button, Chip, ChipRow, EmptyState, ErrorBox, inputCls, LinkButton, Loading, Notice, PageHeader } from '@/components/ui';
import { ProposalCard } from '@/components/proposal/ProposalCard';
import { useViewer } from '@/components/layout/ViewerProvider';
import { getDataSource } from '@/lib/data';
import { useQuery } from '@/lib/hooks';
import { CATEGORIES, CATEGORY_LABEL, STATUS_LABEL, STATUSES } from '@/lib/constants';
import type { Category, ProposalStatus } from '@/lib/types';

/** 개선 제안 탭: 전체 제안 둘러보기 + 내 훈련장에 제안하기 */
export default function ProposalsPage() {
  const ds = getDataSource();
  const { viewer } = useViewer();
  const [rangeId, setRangeId] = useState('');
  const [status, setStatus] = useState<ProposalStatus | ''>('');
  const [category, setCategory] = useState<Category | ''>('');
  const [sort, setSort] = useState<'empathy' | 'recent'>('recent');
  const [page, setPage] = useState(1);
  const ranges = useQuery(() => ds.listRanges({}), []);
  const q = useQuery(() => ds.listProposals({ rangeId, status, category, sort, page, pageSize: 12 }), [rangeId, status, category, sort, page]);
  const myRecord = viewer?.role === 'RESERVIST' ? viewer.records[0] : undefined;
  const pages = q.data ? Math.max(1, Math.ceil(q.data.total / q.data.pageSize)) : 1;
  return (
    <div>
      <PageHeader title="개선 제안" sub="예비군이 남긴 제안과 처리 상태를 모두 공개합니다." right={myRecord && <LinkButton href={`/ranges/${myRecord.rangeId}/propose`}>✍️ {myRecord.rangeName}에 제안하기</LinkButton>} />
      {viewer?.role === 'RESERVIST' && !myRecord && <Notice className="mb-3">이수 기록이 있는 훈련장에 제안할 수 있습니다.</Notice>}
      <div className="mb-2 grid gap-2 sm:grid-cols-3">
        <select aria-label="훈련장" className={inputCls} value={rangeId} onChange={(e) => { setRangeId(e.target.value); setPage(1); }}>
          <option value="">모든 훈련장</option>
          {(ranges.data ?? []).slice().sort((a, b) => a.name.localeCompare(b.name)).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        <select aria-label="카테고리" className={inputCls} value={category} onChange={(e) => { setCategory(e.target.value as Category | ''); setPage(1); }}>
          <option value="">모든 분야</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
        </select>
        <select aria-label="정렬" className={inputCls} value={sort} onChange={(e) => setSort(e.target.value as 'empathy' | 'recent')}>
          <option value="recent">최신순</option>
          <option value="empathy">공감순</option>
        </select>
      </div>
      <ChipRow className="mb-3">
        <Chip active={status === ''} onClick={() => { setStatus(''); setPage(1); }}>전체</Chip>
        {STATUSES.map((s) => <Chip key={s} active={status === s} onClick={() => { setStatus(s); setPage(1); }}>{STATUS_LABEL[s]}</Chip>)}
      </ChipRow>
      <ErrorBox error={q.error} onRetry={q.reload} />
      {!q.data ? <Loading /> : q.data.items.length === 0 ? <EmptyState title="해당하는 제안이 없습니다" icon="✍️" /> : (
        <>
          <p className="mb-2 text-sm text-ink-3">총 {q.data.total}건</p>
          <div className="grid gap-3 md:grid-cols-2">{q.data.items.map((p) => <ProposalCard key={p.id} p={p} showRange />)}</div>
          <div className="mt-4 flex items-center justify-center gap-2">
            <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>이전</Button>
            <span className="text-sm text-ink-2">{page} / {pages}</span>
            <Button size="sm" variant="secondary" disabled={page >= pages} onClick={() => setPage(page + 1)}>다음</Button>
          </div>
        </>
      )}
    </div>
  );
}
