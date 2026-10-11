'use client';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { EmptyState, Loading } from '@/components/ui';
import { IS_DEMO } from '@/lib/config';
import { useViewer } from './ViewerProvider';

/** 화면 단 안내용 가드. 실제 권한 검사는 미들웨어·API·규칙 함수에서 합니다 */
export function AdminGuard({ children, policyOnly }: { children: ReactNode; policyOnly?: boolean }) {
  const { viewer, ready } = useViewer();
  if (!ready) return <Loading />;
  const ok = policyOnly ? viewer?.role === 'POLICY_ADMIN' : viewer?.role === 'RANGE_MANAGER' || viewer?.role === 'POLICY_ADMIN';
  if (!ok) {
    return (
      <EmptyState
        icon="🔒"
        title={policyOnly ? '정책 담당자만 볼 수 있습니다' : '담당자만 볼 수 있습니다'}
        desc={IS_DEMO ? '상단의 "역할 전환"에서 담당자를 선택해 보세요.' : '담당자 계정으로 로그인해 주세요.'}
        action={!IS_DEMO ? <Link href="/login" className="text-primary">로그인</Link> : undefined}
      />
    );
  }
  return <>{children}</>;
}
