# mili:on

> 2026 예비전력분야 혁신 아이디어 공모전 · 혁신 서비스 개발 분야
> 예비군 훈련장 **만족도 지도 → 개선 제안 → 담당자 처리 → 보안 마스킹을 거친 AI 대책 초안 → 결과 공개**를 한 흐름으로 잇는 서비스

데이터는 **전부 가상**입니다. 훈련장 이름은 가명(A~X훈련장), 위치는 시군구 중심점입니다.

## 한눈에 보기

| 화면 | 경로 | 내용 |
| --- | --- | --- |
| 홈 | `/` | 이번 달 제안·개선 완료·평균 처리 기간, 개선 사례 Before/After |
| [1] 만족도 지도 | `/map` | 로컬 TopoJSON + d3 지도, 지표별 핀 점수·추세, 겹치면 묶음, 목록 보기 |
| 훈련장 상세 | `/ranges/[id]` | 만족도(방사형·막대·월별 추이·평가 목록) / 개선 제안 / 가이드 / Q&A 탭 |
| 훈련 설문 | `/survey`, `/ranges/[id]/review` | 훈련 일정 고지·교통·숙식·기타 15문항을 **불만족 ←→ 만족 5단계**(16유형 검사 방식)로, 다른 예비군에게 전하고 싶은 말. 이수 후 30일·1회 |
| 로그인 | `/login` | Supabase 이메일 로그인·가입 (미설정 시 시드 계정, 오프라인 시연은 시연 계정) |
| [2] 제안 작성 | `/ranges/[id]/propose` | 카테고리→세부 주제→내용, **실시간 보안 경고**, 유사 제안 "공감하고 끝내기" |
| 제안 상세 | `/proposal?id=` | 상태 단계 표시, 처리 이력, 공식 답변, 공감·신고, 담당자 처리 |
| [3] 개선 동향 | `/trends`, `/issue?id=` | 분야별 순위·월별 추이·급증 알림, 이슈 우선순위, **AI 대책 초안 + 외부로 나간 텍스트 보기** |
| [4] 가이드·Q&A | `/guide`, 상세 탭 | 공식 안내/꿀팁, 준비물 체크리스트, 근거 있는 AI 1차 답변 |
| 보안 마스킹 체험 | `/masking-demo` | 심사위원이 부르는 문장을 실시간으로 마스킹·차단 (완전 오프라인) |
| 관리 | `/admin`, `/admin/queue`, `/admin/analysis`, `/admin/audit` | KPI·우선순위·급증, 처리 큐(일괄 처리), 제안 분석(분야별·월별·세부 주제·훈련장×분야, 훈련장 담당자는 자기 훈련장만), 마스킹 감사 로그 |

## 두 가지 실행 모드 (코드는 하나)

| | 시연 모드 `NEXT_PUBLIC_APP_MODE=demo` | 서버 모드 `NEXT_PUBLIC_APP_MODE=server` |
| --- | --- | --- |
| 결과물 | 정적 HTML (`out/`), **인터넷 없이 동작** | Next.js 서버 + PostgreSQL |
| 데이터 | `data/demo/*.json` → 브라우저 메모리, 변경분만 localStorage | Prisma (같은 JSON으로 시드) |
| 마스킹 | 브라우저에서 같은 TS 코드 | API 라우트에서 같은 TS 코드 (클라이언트 결과를 믿지 않고 다시 적용) |
| AI | 사전 생성 캐시 | 상용 AI 실호출 (키가 없으면 캐시로 대체하고 화면에 표시) |
| 로그인 | 상단 "역할 전환", `/login`의 시연 계정 | Supabase Auth → 서버가 토큰 확인 후 httpOnly 서명 쿠키 (미설정 시 시드 계정) |

화면과 규칙은 공유하고 **데이터를 읽고 쓰는 어댑터만** 바뀝니다 (`lib/data/demo.ts` ↔ `lib/data/api.ts`).
집계(점수·추세·우선순위·급증)와 쓰기 규칙(권한·자격·차단·마스킹)도 `lib/core/`의 같은 순수 함수를 두 모드가 함께 씁니다.
API 라우트와 미들웨어는 `*.server.ts` 확장자로 두어, 시연 빌드에서는 `pageExtensions`에서 빠져 아예 포함되지 않습니다.

## 빠른 시작

Node 20.9 이상.

```bash
npm install

# 시연 모드 개발 서버 (DB 불필요)
npm run dev:demo            # http://localhost:3000

# 오프라인 시연 빌드 → 로컬 정적 서버
npm run build:demo          # out/ 생성 + 외부 URL 검사
npm run serve:demo          # http://localhost:4173  (백업: python -m http.server 4173 -d out)
```

> `file://`로 열면 경로가 깨집니다. 반드시 로컬 정적 서버로 여세요.

### 서버 모드 (로컬)

```bash
cp .env.example .env        # DATABASE_URL, SESSION_SECRET, LLM_* 설정
npx prisma migrate deploy
npx prisma db seed          # 이미 데이터가 있으면 건너뜀
npm run build && npm start
```

시드 계정 (비밀번호: `SEED_PASSWORD` 환경변수, 기본 `demo1234` — 공개 배포 시 반드시 바꾸세요)

| 계정 | 역할 |
| --- | --- |
| `demo` | 예비군 (A훈련장 7일 전 이수, 아직 설문 전) |
| `manager_ra01` ~ `manager_rx24` | 각 훈련장 담당자 |
| `policy` | 정책 담당자 (전체 범위, 감사 로그) |
| `reservist001` ~ `reservist200` | 시드 예비군 |

### Supabase 로그인 설정

1. Supabase 프로젝트 → Authentication → Providers에서 Email 사용, Site URL과 Redirect URL에 배포 주소(`https://…/login`) 등록
2. 환경변수 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (빌드 시점에 들어가므로 바꾼 뒤 다시 빌드)
3. DB도 Supabase를 쓰려면 `DATABASE_URL`=풀러(6543, `?pgbouncer=true`), `DIRECT_URL`=직접 연결(5432)

동작: 브라우저가 Supabase로 로그인 → 액세스 토큰을 `/api/auth/supabase`로 보냄 → 서버가 Supabase에 토큰을 확인 → 처음이면 **예비군** 계정을 만들고 앱 세션 쿠키 발급. 담당자·정책 담당자 역할은 가입으로 얻을 수 없고 DB에서만 부여합니다.
마이그레이션이 모든 테이블에 RLS를 켭니다(정책 없음). Supabase의 anon 키로 Data API에 접근해도 테이블을 읽거나 쓸 수 없고, 테이블 소유자로 접속하는 Prisma만 동작합니다.

## 보안 마스킹 (`lib/masking/`)

- 처리 순서: 정규화 → **차단 검사**(좌표·암구호·작전계획·비밀·시설 위치·취약점 등, 걸리면 외부 전송 안 함) → 정규식 → 사전 → 이름 패턴, 겹치면 긴 매치 우선
- 같은 원문은 같은 토큰(`3사단`이 두 번 → 둘 다 `[부대_1]`), 여러 제안을 하나의 vault로 합침
- 개인정보(전화번호·군번·주민번호·차량번호·이메일)는 복원하지 않음
- 저장 시에는 번호 없는 토큰(`[부대]`)으로 가린 본문만 저장, 차단 대상은 저장 자체를 거부(422)
- 사전은 `lib/masking/dictionary.json`으로 분리 — 운영 중에 늘릴 수 있음
- AI 호출 흐름(`lib/llm/flow.ts`): 대표 제안 20건 → 마스킹(차단 건 제외·감사 기록) → 공급자 호출 → 응답 문자열 전체 복원 → 근거 사례 id 검증. **vault는 저장하지 않고 버림**, 감사 로그엔 외부로 나간 텍스트만

탐지율 측정: `npm run masking:eval` → `docs/masking-eval.md`

> 평가 문장 103개는 규칙을 만들며 함께 쓴 문장이라 수치가 실제보다 높게 나옵니다. 그래서 **규칙과 따로 작성된 시드 제안**(마스킹 대상 45건, `maskExpected`)으로도 측정합니다: 기대 유형 재현율 45/45, 오차단 0/300, 마스킹 대상이 없는 255건·평가·가이드에서 과잉 마스킹 0건. 발표 전에 규칙을 보지 않은 사람이 쓴 문장을 `lib/masking/__tests__/fixtures.json`에 추가해 다시 측정하고, 그 값을 발표자료에 쓰세요.

## AI 대책 캐시

`data/demo/ai-cache/{issueId}.json` — 시연 모드와 "키 없는 서버 모드"가 씁니다.

현재 들어 있는 파일은 우선순위 상위 10개 이슈에 대한 **사람 작성 초안**(`scripts/seed-ai-drafts.ts` → `scripts/build-cache-drafts.ts`, `provider: "cache:seed-draft"`, `reviewed: false`)입니다. 발표 전에 실제 상용 AI 응답으로 교체하세요.

```bash
npm run ai-cache -- --dry                                # 외부로 나갈 (마스킹된) 텍스트만 확인
LLM_PROVIDER=claude LLM_API_KEY=... npm run ai-cache     # 상위 10개 + 주인공 이슈 생성
```

생성 후 **사람이 모두 읽고** 지어낸 수치·규정이 없는지 고친 다음 `"reviewed": true`로 바꿉니다.
Claude는 공식 SDK의 구조화 출력(zod 스키마)으로 호출하고, 정책 거절 시 서버 측 대체 모델(`fallbacks: "default"`)을 씁니다. Gemini·OpenAI는 REST + JSON 모드입니다. 모델은 `LLM_MODEL`로 바꿀 수 있습니다.

## 시드 데이터 (`seed/`)

`seed/`에 생성 파이프라인 전체가 있습니다(설정·템플릿·근거 자료·Python 스크립트, 외부 패키지 없음). 자세한 내용은 [`seed/README.md`](seed/README.md).

```bash
npm run seed:generate   # seed/scripts/generate_seed.py → data/demo/*.json, 13개 조건 검증, AI 캐시 초안 갱신
```

- 훈련장 24곳(가명 A~X, 실제 시군구 중심점), 예비군 200 + 시연·담당자·정책 계정, 이수 525 · 평가 417 · 제안 300 · 공감 1,550 · 이슈 28 · 개선 사례 10(권익위 권고 6 + 가상 4) · 가이드 346 · Q&A 113
- 카테고리 비중과 4~5월 집중은 권익위 민원 분석을 반영했고, 출처는 `seed/reference/sources.json`에 있습니다.
- 국방부 훈련장 CSV로 실제 목록을 쓰는 방법도 `seed/README.md`에 있습니다.
- 시드 제안 원문에는 마스킹 시연용 가상 단대호·인물·전화번호가 45건 들어 있습니다. 앱은 불러올 때 작성 시점과 같은 보안 필터를 거쳐 `[부대]` 등으로 가린 뒤 씁니다. 훈련장의 시나리오 메모(`description`)는 화면에 내보내지 않습니다.
- 날짜는 기준일(2026-10-11, KST) 기준이고, 불러올 때 **오늘 기준으로 평행 이동**합니다.

## 테스트

```bash
npm test                    # Vitest 75개: 마스킹(규칙·토큰·복원·차단·탐지율), 유사도, 우선순위, 급증 경계값, 스키마, AI 흐름, 시연 DataSource(자격·권한·신고)
npm run build:demo && npm run test:e2e   # Playwright 5개: 시연 시나리오 7단계 + 마스킹 체험 + 차단 + 설문 + 시연 로그인
BASE_URL=http://localhost:3000 npx tsx scripts/smoke-server.ts   # 서버 모드 API 35개 항목 (SUPABASE_TEST_TOKEN이 있으면 Supabase 로그인까지)
```

E2E는 **인터넷을 끊은 브라우저**로 돕니다. Chromium의 `context.setOffline(true)`는 localhost까지 막기 때문에, 대신 DNS를 끊어(`--host-resolver-rules`) localhost 외에는 어떤 호스트도 찾을 수 없게 하고, localhost 밖으로 나가는 요청이 하나라도 있으면 실패 처리합니다.

## Railway 배포 (서버 모드)

1. `+ New → Deploy from GitHub repo`로 서비스 `web` 생성, `+ New → Database → PostgreSQL` 추가 (Public Access 끔)
2. `web` → Variables

   | 변수 | 값 |
   | --- | --- |
   | `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` |
   | `NEXT_PUBLIC_APP_MODE` | `server` |
   | `LLM_PROVIDER` | `claude` / `gemini` / `openai` |
   | `LLM_API_KEY` | (Sealed) |
   | `SESSION_SECRET` | 임의의 긴 문자열 (Sealed) |
   | `SEED_PASSWORD` | 시드 계정 비밀번호 (Sealed) |
   | `DIRECT_URL` | `${{Postgres.DATABASE_URL}}` (Railway Postgres면 DATABASE_URL과 같게) |
   | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 로그인을 쓸 때 |

3. Settings: Build/Start Command 비워 둠(`npm run build` / `npm run start`). `npm run start`가 서버를 켜기 전에 `prisma migrate deploy`와 `prisma db seed`(데이터가 있으면 건너뜀)를 실행하므로 Pre-Deploy Command는 필요 없습니다. Healthcheck Path `/api/health`, Restart Policy On Failure, Region Singapore
4. Networking → Generate Domain. 11월부터는 배포 브랜치를 `release`로 바꿔 시연 직전 실수 배포를 막습니다.

## 저장소 구조

```
app/                 화면 (/survey, /login 포함) (모두 DataSource만 호출) + app/api/**/route.server.ts (서버 모드 전용)
components/          map, range, proposal, trends, ai, guide, security, layout, ui
lib/
  config.ts          모드 판별 (한 곳)
  types.ts           도메인 타입 (Prisma 타입과 별개, 두 모드 공용)
  constants.ts       카테고리·상태·지표 라벨, 색
  core/              queries.ts(읽기 집계) · mutations.ts(쓰기 규칙 → 변경 목록) · dataset.ts(날짜 평행 이동)
  data/              DataSource 인터페이스, demo.ts(zustand + localStorage), api.ts(fetch)
  masking/           maskText · restoreText · checkText, rules.ts, dictionary.json
  llm/               공급자(cache/commercial), prompts, zod 스키마, 마스킹→호출→복원 흐름, 오프라인 Q&A
  analysis/          similarity(2-gram Jaccard), priority(공식), stats(추세·급증), classify(키워드)
  server/            Prisma, 서명 쿠키 세션, 변경 목록 → DB 반영, 감사 로그, 레이트 리밋
data/geo/            시도·시군구 TopoJSON (통계청 2013 경계, southkorea/southkorea-maps)
seed/                시드 생성 파이프라인 (설정·템플릿·근거·Python 스크립트)
data/demo/           시드 산출물 + ai-cache/
prisma/              schema.prisma, migrations, seed.ts
scripts/             build-ai-cache, build-cache-drafts, masking-eval, check-external-urls, smoke-server
tests/               unit/, e2e/demo-scenario.spec.ts
```

## 명세와 다르게 한 것

- 개선 제안 탭은 `/proposals`(전체 제안 둘러보기), 예비군용 `/my`(내 제안·공감한 제안·이수 기록), `/survey`(설문), `/login`(Supabase)을 추가했습니다. 하단 탭은 설문을 넣어 5개입니다.
- 평가 5개 지표는 설문 섹션에 맞춰 일정 고지·교통·식사·숙소·시설·운영·기타로 바꿨습니다(DB 컬럼은 그대로).
- 스키마 추가: `Proposal.subtopic`·`maskExpected`, `Answer.state`, `AiSolution.generatedAt/reviewed`, `Issue @@unique([category, subtopic])`, 훈련장 출처 필드(`isFictional` 등), `BestPractice` 권고 필드(훈련장·완료일 선택), `Review.answers`(설문 응답), `TrainingRecord.selfReported`, `User.authId/email`(Supabase). EntityType에 `FACILITY`(`[시설_n]`)를 추가했습니다.
- 유사 제안: Jaccard 0.3 기준은 그대로이고, 긴 본문은 집합이 커져 점수가 낮아지므로 제목·본문·전체 중 가장 높은 값을 씁니다.
- 지도 핀 묶음은 시도 단위 고정이 아니라 **화면에서 라벨이 겹칠 때** 묶고(같은 시도면 "경기 2곳 · 평균 3.4"), 누르면 확대합니다.
- 차트 색은 카테고리에 고정되며(순위가 바뀌어도 색 유지), 대비가 낮은 색이 있어 숫자 라벨·범례를 항상 함께 표시합니다. 제안 수와 공감 수는 척도가 달라 한 축에 겹치지 않고 두 열로 나눴습니다.
