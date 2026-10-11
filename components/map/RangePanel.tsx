'use client';
import { Badge, LinkButton, ScoreBig, scoreColor } from '@/components/ui';
import { RadarScore } from '@/components/range/RadarScore';
import { RANGE_TYPE_LABEL } from '@/lib/constants';
import { fmtAgo } from '@/lib/format';
import type { RangeSummary } from '@/lib/types';

/** 핀 선택 시: 모바일 하단 시트 / PC 오른쪽 패널 (명세 §6.1) */
export function RangePanel({ range, onClose }: { range: RangeSummary; onClose: () => void }) {
  return (
    <div data-testid="range-panel" className="flex h-full flex-col gap-3 overflow-y-auto p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold">{range.name}</h2>
            <Badge tone="olive">{RANGE_TYPE_LABEL[range.type]}</Badge>
          </div>
          <p className="text-sm text-ink-3">{range.sido} {range.sigungu}</p>
        </div>
        <button type="button" onClick={onClose} aria-label="닫기" className="min-h-11 min-w-11 rounded-full text-xl text-ink-3 hover:bg-surface-2">×</button>
      </div>
      <ScoreBig score={range.overall} trend={range.trend} delta={range.trendDelta} count={range.reviewCount} />
      <RadarScore scores={range.scores} height={200} />
      {range.latestReply && (
        <div className="rounded-xl border-l-4 bg-surface-2 p-3 text-sm" style={{ borderColor: scoreColor(4.5) }}>
          <div className="mb-1 text-xs font-semibold text-primary">최근 공식 답변 · {fmtAgo(range.latestReply.createdAt)}</div>
          <p className="line-clamp-3">{range.latestReply.body}</p>
        </div>
      )}
      <div className="text-sm text-ink-2">처리 중인 개선 제안 <b>{range.openProposalCount}건</b></div>
      <LinkButton href={`/ranges/${range.id}`} className="w-full" >상세 보기</LinkButton>
    </div>
  );
}
