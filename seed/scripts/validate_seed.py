"""생성된 시드가 설계 조건(분포, 시나리오)을 만족하는지 확인한다."""
import json, os, sys
from collections import Counter, defaultdict
from datetime import date, datetime, timedelta

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
D = os.path.join(ROOT, '..', 'data', 'demo')
L = lambda n: json.load(open(os.path.join(D, n + '.json'), encoding='utf-8'))
TODAY = date(2026, 10, 11)
day = lambda s: datetime.fromisoformat(s).date()
ok = True
def check(cond, msg):
    global ok
    print(('PASS ' if cond else 'FAIL ') + msg); ok &= bool(cond)

ranges, props, revs, issues = L('ranges'), L('proposals'), L('reviews'), L('issues')
rid = {r['code']: r['id'] for r in ranges}

# 1. 카테고리 분포 (권익위 비율 반영)
c = Counter(p['category'] for p in props); n = len(props)
print('  카테고리 비중:', {k: round(v / n * 100, 1) for k, v in c.most_common()})
check(all(r['lat'] and r['lng'] for r in ranges), '모든 훈련장에 좌표 있음')

# 2. 4~5월 비중 (스파이크 제외 기준선)
base = [p for p in props if day(p['createdAt']) < TODAY - timedelta(days=27)]
am = sum(1 for p in base if day(p['createdAt']).month in (4, 5)) / len(base) * 100
check(25 <= am <= 45, f'4~5월 제안 비중 {am:.1f}% (목표 34.8% 근처)')

# 3. 식사·급식 급증
meal = [day(p['createdAt']) for p in props if p['category'] == 'MEAL']
r4 = sum(1 for d in meal if (TODAY - d).days < 28)
p12 = sum(1 for d in meal if 28 <= (TODAY - d).days < 112)
ratio = (r4 / 4) / max(p12 / 12, 0.01)
check(ratio >= 1.8 and r4 >= 10, f'식사·급식 급증: 최근4주 {r4}건, 주평균 비율 {ratio:.2f} (기준 1.8)')

# 4. 주인공 이슈가 우선순위 1위
top = issues[0]
check(top['subtopic'] == '배식 대기시간', f"우선순위 1위 이슈: {top['title']} ({top['priorityScore']})")
print('  상위 5개:', [(i['title'], i['priorityScore']) for i in issues[:5]])

# 5. 훈련장별 지표 평균
avg = defaultdict(lambda: defaultdict(list))
for r in revs:
    for a in ['scoreTransport', 'scoreMeal', 'scoreFacility', 'scoreOperation', 'scoreComm']:
        avg[r['rangeId']][a].append(r[a])
m = lambda rg, a: sum(avg[rg][a]) / len(avg[rg][a])
check(m(rid['R-A01'], 'scoreMeal') < 3.0, f"A훈련장 식사 평균 {m(rid['R-A01'], 'scoreMeal'):.2f} (< 3.0)")
def before_after(code, axis, when):
    b = [r[axis] for r in revs if r['rangeId'] == rid[code] and day(r['createdAt']) < when]
    a = [r[axis] for r in revs if r['rangeId'] == rid[code] and day(r['createdAt']) >= when + timedelta(days=21)]
    return (sum(b) / len(b) if b else 0, sum(a) / len(a) if a else 0, len(b), len(a))
for code, axis, when in [('R-D04', 'scoreMeal', date(2026, 6, 15)), ('R-H08', 'scoreTransport', date(2026, 5, 20)),
                         ('R-K11', 'scoreFacility', date(2026, 7, 1))]:
    b, a, nb, na = before_after(code, axis, when)
    check(a - b >= 0.6, f'{code} {axis} 개선 전 {b:.2f}(n={nb}) → 후 {a:.2f}(n={na})')
counts = Counter(r['rangeId'] for r in revs)
low = [k for k, v in counts.items() if v < 5]
check(1 <= len(low) <= 3, f'평가 5건 미만 훈련장 {len(low)}곳 ("평가 부족" 표시 예시로 적당)')

# 6. 상태 분포 / 시연 대상
s = Counter(p['status'] for p in props)
print('  상태 분포:', {k: round(v / n * 100, 1) for k, v in s.items()})
hero = [p for p in props if p['rangeId'] == rid['R-A01'] and p['subtopic'] == '배식 대기시간']
check(len(hero) >= 6 and all(p['status'] in ('RECEIVED', 'REVIEWING') for p in hero),
      f'A훈련장 배식 대기시간 제안 {len(hero)}건, 모두 미처리 상태')
check(sum(1 for p in props if p['maskExpected']) >= 30, f"마스킹 대상 포함 제안 {sum(1 for p in props if p['maskExpected'])}건")
recs = L('training-records')
check(any(r['id'] == 'rec_demo' for r in recs), '시연 사용자 이수 기록 있음 (A훈련장, 7일 전)')
check(not any(r['userId'] == 'usr_demo' for r in revs), '시연 사용자는 아직 평가 전')
sys.exit(0 if ok else 1)
