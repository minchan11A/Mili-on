'use client';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState, type FormEvent } from 'react';
import { Button, Field, inputCls, Loading, Notice } from '@/components/ui';
import { Wordmark } from '@/components/layout/AppShell';
import { useViewer } from '@/components/layout/ViewerProvider';
import { getDataSource } from '@/lib/data';
import { IS_DEMO } from '@/lib/config';
import { authErrorMessage, getSupabase, SUPABASE_ENABLED } from '@/lib/supabase/client';
import { cx } from '@/lib/format';
import type { Role } from '@/lib/types';

const AGE_BANDS = ['20대 초반', '20대 후반', '30대 초반', '30대 후반', '40대 이상'];

function Shell({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto flex max-w-[400px] flex-col pt-4 sm:pt-12">
      <Wordmark className="text-[28px]" />
      <h1 className="mt-8 text-[26px] font-semibold">{title}</h1>
      <p className="mt-1.5 text-[14px] text-ink-2">{sub}</p>
      <div className="mt-8">{children}</div>
    </div>
  );
}

/** 오프라인 시연: 네트워크 없이 시연 계정으로 바로 */
function DemoLogin({ next }: { next: string }) {
  const { switchRole } = useViewer();
  const router = useRouter();
  const go = async (role: Role) => { await switchRole(role); router.push(next); };
  return (
    <Shell title="시연 계정으로 시작" sub="오프라인 시연에서는 Supabase 로그인 대신 준비된 계정을 씁니다.">
      <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
        {([
          ['RESERVIST', '예비군', 'A훈련장 7일 전 이수 · 설문과 제안 작성'],
          ['RANGE_MANAGER', 'A훈련장 담당자', '제안 처리 · 공식 답변 · AI 대책'],
          ['POLICY_ADMIN', '정책 담당자', '전체 훈련장 · 동향 · 감사 로그'],
        ] as Array<[Role, string, string]>).map(([role, t, d]) => (
          <button key={role} type="button" onClick={() => go(role)} data-testid={`demo-login-${role}`} className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-surface-2">
            <span><span className="block text-[15px] font-medium">{t}</span><span className="text-[13px] text-ink-3">{d}</span></span>
            <span className="text-ink-3">→</span>
          </button>
        ))}
      </div>
    </Shell>
  );
}

/** Supabase 미설정 서버: 시드 계정 */
function SeedLogin({ next }: { next: string }) {
  const router = useRouter();
  const { refresh } = useViewer();
  const [loginId, setLoginId] = useState('demo');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  return (
    <Shell title="로그인" sub="Supabase가 설정되지 않아 시드 계정으로 로그인합니다.">
      <form className="space-y-4" onSubmit={async (e) => {
        e.preventDefault(); setErr(null);
        try { await getDataSource().login!(loginId, password); refresh(); router.push(next); } catch (e2) { setErr((e2 as Error).message); }
      }}>
        <Field label="계정">
          <select className={inputCls} value={loginId} onChange={(e) => setLoginId(e.target.value)}>
            <option value="demo">예비군 (demo)</option>
            <option value="manager_ra01">A훈련장 담당자 (manager_ra01)</option>
            <option value="policy">정책 담당자 (policy)</option>
          </select>
        </Field>
        <Field label="비밀번호" hint="시드 계정 비밀번호는 배포 환경변수 SEED_PASSWORD입니다">
          <input type="password" className={inputCls} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
        </Field>
        {err && <Notice tone="danger">{err}</Notice>}
        <Button type="submit" size="lg" className="w-full">로그인</Button>
      </form>
    </Shell>
  );
}

/** Supabase 이메일 로그인·가입 */
function SupabaseLogin({ next }: { next: string }) {
  const router = useRouter();
  const { refresh } = useViewer();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [ageBand, setAgeBand] = useState(AGE_BANDS[1]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function finish(token: string) {
    await getDataSource().loginWithSupabase!(token, mode === 'signup' ? { nickname: nickname.trim() || undefined, ageBand } : undefined);
    refresh();
    router.push(next);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null); setInfo(null);
    try {
      const sb = await getSupabase();
      if (mode === 'signin') {
        const { data, error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
        await finish(data.session.access_token);
      } else {
        const { data, error } = await sb.auth.signUp({
          email, password,
          options: { data: { nickname: nickname.trim(), ageBand }, emailRedirectTo: `${window.location.origin}/login?next=${encodeURIComponent(next)}` },
        });
        if (error) throw error;
        if (data.session) await finish(data.session.access_token);
        else { setInfo(`${email}로 인증 메일을 보냈습니다. 메일의 링크를 누른 뒤 로그인해 주세요.`); setMode('signin'); }
      }
    } catch (e2) { setErr(authErrorMessage(e2)); } finally { setBusy(false); }
  }

  return (
    <Shell title={mode === 'signin' ? '로그인' : '회원가입'} sub={mode === 'signin' ? '이메일로 로그인하고 설문과 제안에 참여하세요.' : '가입하면 훈련 설문과 개선 제안을 남길 수 있습니다.'}>
      <div className="mb-6 grid grid-cols-2 rounded-full border border-line bg-surface p-1 text-[13px]" role="tablist">
        {(['signin', 'signup'] as const).map((m) => (
          <button key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => { setMode(m); setErr(null); }}
            className={cx('h-9 rounded-full font-medium transition-colors', mode === m ? 'bg-ink text-white' : 'text-ink-2')}>
            {m === 'signin' ? '로그인' : '회원가입'}
          </button>
        ))}
      </div>
      <form className="space-y-4" onSubmit={onSubmit}>
        <Field label="이메일"><input type="email" required className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></Field>
        <Field label="비밀번호" hint={mode === 'signup' ? '6자 이상' : undefined}>
          <input type="password" required minLength={6} className={inputCls} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} />
        </Field>
        {mode === 'signup' && (
          <>
            <Field label="별명" hint="다른 사람에게 보이는 이름입니다. 실명·계급·부대명은 쓰지 마세요"><input className={inputCls} maxLength={20} value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="예: 예비군_0417" /></Field>
            <Field label="연령대" hint="통계에만 쓰입니다">
              <select className={inputCls} value={ageBand} onChange={(e) => setAgeBand(e.target.value)}>{AGE_BANDS.map((a) => <option key={a}>{a}</option>)}</select>
            </Field>
          </>
        )}
        {info && <Notice tone="ok">{info}</Notice>}
        {err && <Notice tone="danger">{err}</Notice>}
        <Button type="submit" size="lg" className="w-full" disabled={busy}>{busy ? '잠시만요…' : mode === 'signin' ? '로그인' : '가입하기'}</Button>
      </form>
      <p className="mt-6 text-center text-[12px] text-ink-3">
        실제 도입 시에는 예비군 홈페이지 본인인증으로 대체합니다. 담당자 계정은 가입으로 만들 수 없고 관리자가 부여합니다.
      </p>
    </Shell>
  );
}

function LoginInner() {
  const next = useSearchParams().get('next') || '/';
  if (IS_DEMO) return <DemoLogin next={next} />;
  return SUPABASE_ENABLED ? <SupabaseLogin next={next} /> : <SeedLogin next={next} />;
}

export default function LoginPage() {
  return (
    <Suspense fallback={<Loading />}>
      <LoginInner />
      <p className="mt-10 text-center text-[12px]"><Link href="/" className="text-ink-3 hover:text-ink">홈으로</Link></p>
    </Suspense>
  );
}
