/**
 * 시연 빌드 외부 리소스 검사 (명세 §10.2): out/ 의 HTML·CSS·JS에서 외부로 나가는 URL을 찾습니다.
 * 라이브러리 안의 문서 링크·XML 네임스페이스 같은 "요청이 아닌 문자열"은 허용 목록으로 거릅니다.
 * 실제 네트워크 요청이 없는지는 E2E(오프라인 + 요청 감시)에서 한 번 더 확인합니다.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const OUT = join(process.cwd(), 'out');
const ALLOW = [
  /^https?:\/\/www\.w3\.org\//,             // SVG/XML 네임스페이스
  /^https?:\/\/(react\.dev|reactjs\.org|nextjs\.org|github\.com|fb\.me|recharts\.org|d3js\.org)\//, // 오류 메시지 속 문서 링크
  /^https?:\/\/(localhost|127\.0\.0\.1)/,
  /^https?:\/\/(github\.com\/rsms|opensource\.org)/,
  /^https?:\/\/(cdn\.jsdelivr\.net\/gh\/orioncactus)/, // Pretendard CSS 주석 속 출처 (요청 아님, 아래에서 주석 여부 확인)
];

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

const URL_RE = /https?:\/\/[^\s"'`)<>\\]+/g;
const findings: Array<{ file: string; url: string; ctx: string }> = [];
for (const file of walk(OUT)) {
  if (!['.html', '.js', '.css', '.txt', '.json'].includes(extname(file))) continue;
  const text = readFileSync(file, 'utf8');
  for (const m of text.matchAll(URL_RE)) {
    const url = m[0];
    if (ALLOW.some((re) => re.test(url))) continue;
    const ctx = text.slice(Math.max(0, m.index! - 60), m.index! + url.length + 20).replace(/\s+/g, ' ');
    // 리소스 로딩 형태(src=, href=, url(, @import, fetch()인 것만 실패로 봄
    const loadLike = /(src=|href=|url\(|@import|fetch\(|import\()\s*["']?$/.test(text.slice(Math.max(0, m.index! - 12), m.index!));
    if (loadLike) findings.push({ file: file.replace(OUT, 'out'), url, ctx });
  }
}

if (findings.length) {
  console.error('❌ 시연 빌드에 외부 리소스 로딩이 있습니다:');
  for (const f of findings) console.error(`  ${f.file}: ${f.url}\n    …${f.ctx}…`);
  process.exit(1);
}
console.log('✅ 외부 리소스 로딩 없음 (out/ 검사 완료)');
