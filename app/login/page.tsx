'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { Button, Card, Field, inputCls, Loading, Notice } from '@/components/ui';
import { useViewer } from '@/components/layout/ViewerProvider';
import { getDataSource } from '@/lib/data';
import { IS_DEMO } from '@/lib/config';

const ACCOUNTS = [
  ['reservist', '예비군 (A훈련장 7일 전 이수)'],
  ['manager-a', 'A훈련장 담당자'],
  ['policy', '정책 담당자'],
];

function LoginForm() {
  const router = useRouter();
  const next = useSearchParams().get('next') || '/';
  const { refresh } = useViewer();
  const [loginId, setLoginId] = useState('reservist');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  if (IS_DEMO) return <Notice>시연 모드에서는 로그인 대신 상단의 "역할 전환"을 사용합니다.</Notice>;
  return (
    <Card className="mx-auto max-w-md p-6">
      <h1 className="mb-1 text-2xl font-extrabold">로그인</h1>
      <p className="mb-4 text-sm text-ink-2">공모전 시연용 시드 계정입니다. 실제 도입 시 예비군 홈페이지 본인인증으로 대체합니다.</p>
      <form className="space-y-3" onSubmit={async (e) => {
        e.preventDefault(); setErr(null);
        try { await getDataSource().login!(loginId, password); refresh(); router.push(next); } catch (e2) { setErr((e2 as Error).message); }
      }}>
        <Field label="계정">
          <select className={inputCls} value={loginId} onChange={(e) => setLoginId(e.target.value)}>
            {ACCOUNTS.map(([id, label]) => <option key={id} value={id}>{label} ({id})</option>)}
          </select>
        </Field>
        <Field label="비밀번호" hint="시드 계정 비밀번호는 배포 환경변수 SEED_PASSWORD (기본값은 README 참고)">
          <input type="password" className={inputCls} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
        </Field>
        {err && <Notice tone="danger">{err}</Notice>}
        <Button type="submit" className="w-full">로그인</Button>
      </form>
    </Card>
  );
}

export default function LoginPage() {
  return <Suspense fallback={<Loading />}><LoginForm /></Suspense>;
}
