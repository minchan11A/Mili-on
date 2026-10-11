import Link from 'next/link';
import { Badge, CategoryBadge, StatusBadge } from '@/components/ui';
import { MaskHighlight } from '@/components/security/MaskHighlight';
import { fmtAgo } from '@/lib/format';
import type { ProposalView } from '@/lib/types';

export function ProposalCard({ p, showRange }: { p: ProposalView; showRange?: boolean }) {
  return (
    <Link href={`/proposal?id=${encodeURIComponent(p.id)}`} className="block" data-testid="proposal-card">
      <article className="rounded-2xl border border-line bg-surface p-4 transition-colors hover:border-primary">
        <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
          <CategoryBadge category={p.category} />
          <StatusBadge status={p.status} />
          {p.hasReply && <Badge tone="olive">💬 공식 답변</Badge>}
          {p.isMine && <Badge tone="yellow">내 제안</Badge>}
          {p.hidden && <Badge tone="red">숨김</Badge>}
        </div>
        <h3 className="font-bold leading-snug">{p.title}</h3>
        <p className="mt-1 line-clamp-2 text-sm text-ink-2"><MaskHighlight text={p.body} /></p>
        <div className="mt-2 flex items-center gap-3 text-xs text-ink-3">
          <span className={p.empathized ? 'font-bold text-primary' : ''}>👍 공감 {p.empathyCount}</span>
          {showRange && <span>{p.rangeName}</span>}
          <span>{fmtAgo(p.createdAt)}</span>
        </div>
      </article>
    </Link>
  );
}
