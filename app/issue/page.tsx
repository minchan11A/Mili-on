'use client';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { AiBadge, Badge, Button, Card, CategoryBadge, EmptyState, Loading, Notice, SectionTitle } from '@/components/ui';
import { ProposalCard } from '@/components/proposal/ProposalCard';
import { StatusDistribution } from '@/components/trends/IssueTable';
import { SolutionCard } from '@/components/ai/SolutionCard';
import { MaskedPayloadView } from '@/components/ai/MaskedPayloadView';
import { DecisionBar } from '@/components/ai/DecisionBar';
import { useViewer } from '@/components/layout/ViewerProvider';
import { getDataSource, DataError } from '@/lib/data';
import { useQuery } from '@/lib/hooks';
import { explainPriority } from '@/lib/analysis/priority';
import type { AiSolutionView, Solution } from '@/lib/types';

function Generating() {
  return (
    <Card className="flex items-center gap-3 border-ai/30 p-5 text-ai" data-testid="ai-generating">
      <AiBadge />
      <span className="font-semibold">보안 마스킹 후 대책 초안을 만드는 중</span>
      <span className="flex gap-1" aria-hidden>{[0, 1, 2].map((i) => <i key={i} className="ai-dot inline-block h-2 w-2 rounded-full bg-ai" />)}</span>
    </Card>
  );
}

function IssueView() {
  const id = useSearchParams().get('id') ?? '';
  const ds = getDataSource();
  const q = useQuery(() => ds.getIssue(id), [id], !!id);
  const { viewer } = useViewer();
  const [sol, setSol] = useState<AiSolutionView | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Solution | null>(null);
  const [showAll, setShowAll] = useState(false);

  // 저장된 최신 대책이 있으면 보여줌 (결정 후 갱신 포함)
  useEffect(() => {
    if (q.data?.latestSolution) setSol(q.data.latestSolution);
  }, [q.data?.latestSolution]);
  useEffect(() => { if (sol && !editing) setDraft(structuredClone(sol.edited ?? sol.solution)); }, [sol, editing]);

  if (!id) return <EmptyState title="이슈를 선택해 주세요" />;
  if (q.error) return <EmptyState title="이슈를 찾을 수 없습니다" desc={q.error.message} />;
  if (!q.data) return <Loading />;
  const issue = q.data;
  const isManager = viewer?.role === 'RANGE_MANAGER' || viewer?.role === 'POLICY_ADMIN';
  const canAi = viewer?.role === 'POLICY_ADMIN' || (viewer?.role === 'RANGE_MANAGER' && issue.byRange.some((r) => r.rangeId === viewer.managedRangeId));
  const openCount = issue.proposals.filter((p) => (p.status === 'RECEIVED' || p.status === 'REVIEWING') && (viewer?.role === 'POLICY_ADMIN' || p.rangeId === viewer?.managedRangeId)).length;

  async function generate() {
    setLoading(true); setErr(null);
    try { setSol(await ds.requestAiSolution(id)); } catch (e) {
      setErr(e instanceof DataError && e.code === 'NO_CACHE' ? '이 이슈는 시연 캐시가 없습니다. 우선순위 상위 이슈를 선택해 주세요.' : (e as Error).message);
    } finally { setLoading(false); }
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href={isManager ? '/admin' : '/trends'} className="text-sm text-ink-3">← {isManager ? '대시보드' : '개선 동향'}</Link>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <CategoryBadge category={issue.category} subtopic={issue.subtopic} />
          {issue.isSafety && <Badge tone="orange">안전 관련</Badge>}
        </div>
        <h1 className="mt-1 text-[28px] font-semibold" data-testid="issue-title">{issue.subtopic}</h1>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-2">
          <span>제안 <b className="text-ink">{issue.proposalCount}</b>건</span>
          <span>공감 <b className="text-ink">{issue.empathyCount}</b></span>
          <span>관련 훈련장 <b className="text-ink">{issue.rangeCount}</b>곳</span>
          <span title={explainPriority(issue.priorityBreakdown)}>우선순위 <b className="text-ink">{issue.priorityScore.toFixed(1)}</b> ⓘ</span>
        </div>
        <p className="mt-1 text-xs text-ink-3">점수 = {explainPriority(issue.priorityBreakdown)}</p>
        <div className="mt-2 max-w-md"><StatusDistribution counts={issue.statusCounts} total={issue.proposalCount} /></div>
      </div>

      {issue.summary && <Notice tone="ai"><AiBadge>AI 요약</AiBadge> {issue.summary}</Notice>}

      {canAi && (
        <section className="space-y-3" data-testid="ai-section">
          {!sol && !loading && (
            <Button variant="ai" size="lg" onClick={generate} data-testid="ai-generate">AI 대책 초안 보기</Button>
          )}
          {loading && <Generating />}
          {err && <Notice tone="danger">{err}</Notice>}
          {sol && !loading && draft && (
            <>
              <SolutionCard view={sol} solution={sol.edited ?? sol.solution} />
              <MaskedPayloadView view={sol} />
              <DecisionBar view={sol} openCount={openCount} editing={editing} onEditingChange={setEditing} draft={draft} setDraft={setDraft} />
              {sol.decision !== 'PENDING' && <Button variant="ghost" size="sm" onClick={generate}>새 초안 다시 만들기</Button>}
            </>
          )}
        </section>
      )}
      {isManager && !canAi && <Notice>이 이슈에는 내 훈련장 제안이 없어 AI 대책을 다룰 수 없습니다.</Notice>}

      <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
        <section>
          <SectionTitle>관련 제안</SectionTitle>
          <div className="grid gap-3">{issue.proposals.slice(0, showAll ? undefined : 8).map((p) => <ProposalCard key={p.id} p={p} showRange />)}</div>
          {!showAll && issue.proposals.length > 8 && <Button variant="secondary" className="mt-3 w-full" onClick={() => setShowAll(true)}>제안 {issue.proposals.length - 8}건 더 보기</Button>}
        </section>
        <section>
          <SectionTitle>훈련장별 분포</SectionTitle>
          <Card className="p-4">
            <ul className="space-y-2 text-sm">
              {issue.byRange.map((r) => (
                <li key={r.rangeId} className="grid grid-cols-[72px_1fr_28px] items-center gap-2">
                  <Link href={`/ranges/${r.rangeId}`} className="font-semibold hover:text-primary">{r.rangeName}</Link>
                  <span className="h-2.5 rounded-r bg-primary" style={{ width: `${(r.count / issue.byRange[0].count) * 100}%` }} />
                  <span className="text-right tabular-nums">{r.count}</span>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      </div>
    </div>
  );
}

export default function IssuePage() {
  return <Suspense fallback={<Loading />}><IssueView /></Suspense>;
}
