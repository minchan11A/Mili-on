"""
밀라인드 시드 데이터 생성기.

  python3 scripts/generate_seed.py                       # 가명 훈련장 24곳으로 생성
  python3 scripts/generate_seed.py --real-ranges data/ranges_real.json
                                                         # 국방부 실제 훈련장 + 시나리오용 가명 4곳

외부 패키지 없이 동작하며, 같은 입력이면 항상 같은 결과가 나온다 (고정 난수 시드).
출력: data/demo/*.json (앱이 그대로 읽는 형식) + data/demo/csv/*.csv (사람이 확인용)
"""
import argparse
import csv
import json
import math
import os
import random
import sys
from collections import Counter, defaultdict
from datetime import date, datetime, timedelta, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from geo_lookup import GeoLookup  # noqa: E402

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
OUT = os.path.join(ROOT, '..', 'data', 'demo')  # 앱이 읽는 위치: 저장소 루트의 data/demo
KST = timezone(timedelta(hours=9))

TODAY = date(2026, 10, 11)                       # 데이터 기준일
WINDOW_START = TODAY - timedelta(days=364)       # 최근 12개월
SEED = 'milind-2026'

N_RESERVISTS = 200
N_PROPOSALS_BASE = 286
N_SPIKE = 14                                     # 최근 4주 식사·급식 급증분
HERO_RANGE = 'R-A01'
HERO_SUBTOPIC = ('MEAL', '배식 대기시간')
STORY_RANGES = {'R-A01', 'R-D04', 'R-H08', 'R-K11'}

AXES = ['scoreTransport', 'scoreMeal', 'scoreFacility', 'scoreOperation', 'scoreComm']
AXIS_TO_CAT = {'scoreTransport': 'TRANSPORT', 'scoreMeal': 'MEAL', 'scoreFacility': 'FACILITY',
               'scoreOperation': 'OPERATION', 'scoreComm': 'COMMUNICATION'}

# 시나리오용 개선 시점: (훈련장, 지표, 개선 전 점수, 개선 후 점수, 개선일)
IMPROVEMENTS = [
    ('R-D04', 'scoreMeal', 2.6, 4.0, date(2026, 6, 15)),
    ('R-H08', 'scoreTransport', 2.7, 3.9, date(2026, 5, 20)),
    ('R-K11', 'scoreFacility', 2.8, 4.0, date(2026, 7, 1)),
]
BP_DATES = {'bp_07': date(2026, 6, 15), 'bp_08': date(2026, 5, 20),
            'bp_09': date(2026, 7, 1), 'bp_10': date(2026, 8, 1)}

STATUS_NOTES = {
    'REVIEWING': ['담당 부서에서 내용을 확인하고 있습니다.', '현장 상황을 점검 중입니다.'],
    'PLANNED': ['다음 훈련 차수부터 개선할 수 있도록 계획을 세웠습니다.', '관련 부서와 협의해 조치 일정을 정했습니다.'],
    'DONE': ['개선 조치를 마쳤습니다. 다음 훈련 때 확인 부탁드립니다.', '요청하신 내용을 반영했습니다.'],
    'LONG_TERM': ['예산 반영이 필요해 내년도 사업으로 검토하고 있습니다.', '제도 개선 사항이라 상급 부서에 건의했습니다.'],
}
REPLY_TEMPLATES = [
    '소중한 의견 감사합니다. 말씀하신 내용을 확인해 개선하겠습니다.',
    '불편을 드려 죄송합니다. 다음 훈련부터 개선된 모습을 보여드리겠습니다.',
    '의견 주셔서 감사합니다. 처리 상황은 이 페이지에서 계속 안내하겠습니다.',
]
REVIEW_REPLY_TEMPLATES = [
    '평가 감사합니다. 남겨 주신 내용을 개선에 참고하겠습니다.',
    '좋은 평가 감사합니다. 앞으로도 편하게 훈련받으실 수 있도록 하겠습니다.',
]
AGE_BANDS = ['20대 초반', '20대 후반', '30대 초반', '30대 후반']
TRAINING_TYPES = {'MOBILIZATION': ['MOBILIZATION', 'MOBILIZATION_NOSTAY'],
                  'REGIONAL': ['BASIC', 'FOLLOWUP']}


# ---------------------------------------------------------------- 공통 유틸
def read_csv(rel):
    with open(os.path.join(ROOT, rel), encoding='utf-8-sig') as f:
        return list(csv.DictReader(f))


def iso(d, rng=None, hour=None):
    h = hour if hour is not None else (rng.randint(8, 19) if rng else 9)
    m = rng.randint(0, 59) if rng else 0
    return datetime(d.year, d.month, d.day, h, m, tzinfo=KST).isoformat()


def clamp(x, lo=1, hi=5):
    return max(lo, min(hi, x))


def wchoice(rng, items, weights):
    return rng.choices(items, weights=weights, k=1)[0]


class Sampler:
    """월별 가중치를 반영해 기간 안의 날짜를 뽑는다."""

    def __init__(self, rng, monthly):
        self.rng = rng
        self.monthly = monthly
        self.days = [WINDOW_START + timedelta(days=i) for i in range((TODAY - WINDOW_START).days + 1)]
        # 하루 가중치 = 월 가중치 / 그 달의 일수(전체 달 기준)
        self.w = [monthly[d.month] / 30.0 for d in self.days]

    def date(self, start=None, end=None):
        start = start or WINDOW_START
        end = end or TODAY
        idx = [i for i, d in enumerate(self.days) if start <= d <= end]
        return self.days[wchoice(self.rng, idx, [self.w[i] for i in idx])]


# ---------------------------------------------------------------- 훈련장
def load_ranges(geo, real_path):
    demo = read_csv('config/ranges_demo.csv')
    ranges = []

    def add(r, fictional, extra=None):
        hit = geo.find(r['sido'], r['sigungu'])
        if hit is None:
            print(f"[경고] 좌표를 찾지 못함: {r['sido']} {r['sigungu']} ({r['name']}) - 건너뜀")
            return
        lat, lng, _ = hit
        item = {
            'id': 'rng_' + r['code'].replace('-', '_'), 'code': r['code'], 'name': r['name'],
            'type': r['type'], 'sido': r['sido'], 'sigungu': r['sigungu'], 'lat': lat, 'lng': lng,
            'setting': r.get('setting') or 'suburban', 'isFictional': fictional,
            'description': r.get('story') or None, 'address': None, 'phone': None, 'source': 'fictional',
        }
        item.update(extra or {})
        ranges.append(item)

    if real_path:
        with open(real_path, encoding='utf-8') as f:
            real = json.load(f)
        for r in demo:
            if r['code'] in STORY_RANGES:
                add(r, True)
        for r in real:
            add({'code': r['code'], 'name': r['name'], 'type': r['type'], 'sido': r['sido'],
                 'sigungu': r['sigungu'], 'setting': 'suburban', 'story': None}, False,
                {'address': r.get('address'), 'phone': r.get('phone'), 'source': 'mnd'})
    else:
        for r in demo:
            add(r, True)
    return ranges


def profile_for(rng, rg):
    """훈련장별 지표 기본 점수. 실제 훈련장은 극단값 없이 중간대로만 만든다."""
    if not rg['isFictional']:
        return {a: round(rng.uniform(3.4, 3.9), 2) for a in AXES}
    p = {a: round(rng.uniform(3.4, 3.9), 2) for a in AXES}
    if rg['setting'] == 'rural':
        p['scoreTransport'] = round(rng.uniform(2.4, 2.8), 2)
    if rg['setting'] == 'urban':
        p['scoreTransport'] = round(rng.uniform(3.9, 4.3), 2)
    if rg['code'] == HERO_RANGE:
        p['scoreMeal'] = 2.3
    return p


def score_at(profile, rg, axis, d):
    base = profile[axis]
    for code, ax, before, after, when in IMPROVEMENTS:
        if rg['code'] == code and ax == axis:
            base = after if d >= when else before
    return base


# ---------------------------------------------------------------- 메인
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--real-ranges', help='convert_mnd_ranges.py 결과 JSON')
    args = ap.parse_args()

    rng = random.Random(SEED)
    geo = GeoLookup()
    monthly = {int(r['month']): float(r['weight_pct']) for r in read_csv('config/monthly_weights.csv')}
    sampler = Sampler(rng, monthly)
    cat_rows = read_csv('config/category_distribution.csv')
    cats = [r['category'] for r in cat_rows]
    cat_w = [float(r['target_share_pct']) for r in cat_rows]
    sub_rows = read_csv('config/subtopics.csv')
    subs = defaultdict(list)
    safety = {}
    for r in sub_rows:
        subs[r['category']].append((r['subtopic'], float(r['weight'])))
        safety[(r['category'], r['subtopic'])] = r['is_safety'] == 'true'
    templates = defaultdict(list)
    for r in read_csv('templates/proposal_templates.csv'):
        templates[(r['category'], r['subtopic'])].append(r)
    mask_inserts = read_csv('templates/mask_inserts.csv')
    review_tpl = defaultdict(list)
    for r in read_csv('templates/review_comment_templates.csv'):
        review_tpl[(r['axis'], r['tone'])].append(r['text'])
    guide_tpl = read_csv('templates/guide_templates.csv')
    qna_tpl = read_csv('templates/qna_templates.csv')
    with open(os.path.join(ROOT, 'reference', 'best_practices_basis.json'), encoding='utf-8') as f:
        bp_basis = json.load(f)

    # 훈련장 -------------------------------------------------------------
    ranges = load_ranges(geo, args.real_ranges)
    by_code = {r['code']: r for r in ranges}
    profiles = {r['id']: profile_for(rng, r) for r in ranges}

    # 사용자 ---------------------------------------------------------------
    users = []
    reservists = []
    for i in range(1, N_RESERVISTS + 1):
        u = {'id': f'usr_{i:04d}', 'role': 'RESERVIST', 'nickname': f'예비군_{rng.randint(1000, 9999)}',
             'ageBand': rng.choice(AGE_BANDS), 'loginId': f'reservist{i:03d}', 'managedRangeId': None}
        users.append(u)
        reservists.append(u)
    demo_user = {'id': 'usr_demo', 'role': 'RESERVIST', 'nickname': '예비군_0417', 'ageBand': '20대 후반',
                 'loginId': 'demo', 'managedRangeId': None}
    users.append(demo_user)
    managers = {}
    for r in ranges:
        m = {'id': 'mgr_' + r['code'].replace('-', '_'), 'role': 'RANGE_MANAGER', 'nickname': f"{r['name']} 담당자",
             'ageBand': None, 'loginId': 'manager_' + r['code'].lower().replace('-', ''), 'managedRangeId': r['id']}
        users.append(m)
        managers[r['id']] = m
    admin = {'id': 'adm_0001', 'role': 'POLICY_ADMIN', 'nickname': '정책 담당자', 'ageBand': None,
             'loginId': 'policy', 'managedRangeId': None}
    users.append(admin)

    # 훈련장 선택 가중치: 동원훈련장이 더 크다
    def range_weight(rg, category=None):
        w = 1.6 if rg['type'] == 'MOBILIZATION' else 1.0
        if category == 'TRANSPORT' and rg['setting'] == 'rural':
            w *= 3.0
        if category == 'TRANSPORT' and rg['setting'] == 'urban':
            w *= 0.4
        if category == 'MEAL' and rg['code'] == HERO_RANGE:
            w *= 3.0
        if not rg['isFictional']:
            w *= 0.8
        if rg['code'] == 'R-X24':          # '평가 부족' 표시 예시용으로 평가를 적게
            w *= 0.12
        return w

    # 이수 기록 + 만족도 평가 ------------------------------------------------
    records, reviews, replies = [], [], []

    def add_record(u, rg, d, review_prob=0.8):
        rec = {'id': f'rec_{len(records) + 1:05d}', 'userId': u['id'], 'rangeId': rg['id'],
               'trainingType': rng.choice(TRAINING_TYPES[rg['type']]), 'completedAt': iso(d, hour=17)}
        records.append(rec)
        if rng.random() >= review_prob:
            return
        rd = min(TODAY, d + timedelta(days=rng.randint(0, 20)))
        scores = {a: int(clamp(round(score_at(profiles[rg['id']], rg, a, d) + rng.gauss(0, 0.7))))
                  for a in AXES}
        comment = None
        if rng.random() < 0.55:
            lo_axis = min(AXES, key=lambda a: scores[a])
            hi_axis = max(AXES, key=lambda a: scores[a])
            if scores[lo_axis] <= 2:
                comment = rng.choice(review_tpl[(lo_axis, 'low')])
            elif scores[hi_axis] >= 4:
                comment = rng.choice(review_tpl[(hi_axis, 'high')])
        rv = {'id': f'rev_{len(reviews) + 1:05d}', 'userId': u['id'], 'rangeId': rg['id'], 'recordId': rec['id'],
              **scores, 'comment': comment, 'state': 'VISIBLE', 'createdAt': iso(rd, rng)}
        reviews.append(rv)
        if comment and rng.random() < 0.12:
            replies.append({'id': f'rpl_{len(replies) + 1:05d}', 'targetType': 'REVIEW', 'targetId': rv['id'],
                            'authorId': managers[rg['id']]['id'], 'body': rng.choice(REVIEW_REPLY_TEMPLATES),
                            'createdAt': iso(min(TODAY, rd + timedelta(days=rng.randint(1, 5))), rng)})

    for u in reservists:
        for _ in range(rng.choice([1, 2, 2, 3, 3, 4])):
            add_record(u, wchoice(rng, ranges, [range_weight(r) for r in ranges]), sampler.date())
    # 개선 이후 추세가 차트에서 보이도록, 개선 훈련장에 개선 후 평가를 보강
    for code, _axis, _b, _a, when in IMPROVEMENTS:
        if code in by_code:
            for _ in range(10):
                add_record(rng.choice(reservists), by_code[code], sampler.date(start=when + timedelta(days=7)), 0.95)
    # 시연 사용자: A훈련장 7일 전 이수, 아직 평가 안 함
    hero_rg = by_code[HERO_RANGE]
    records.append({'id': 'rec_demo', 'userId': 'usr_demo', 'rangeId': hero_rg['id'], 'trainingType': 'MOBILIZATION',
                    'completedAt': iso(TODAY - timedelta(days=7), hour=17)})

    # 개선 제안 -------------------------------------------------------------
    proposals = []

    def make_proposal(category, subtopic, rg, d):
        tpl = rng.choice(templates[(category, subtopic)])
        body = tpl['body']
        mask_expected = []
        if rng.random() < 0.15:
            ins = rng.choice([m for m in mask_inserts
                              if not m['categories'] or category in m['categories'].split(';')])
            body = f"{ins['text']} {body}" if ins['position'] == 'prefix' else f"{body} {ins['text']}"
            mask_expected.append(ins['expected_type'])
        sentiment = wchoice(rng, [1, 2, 3], [2, 5, 3])
        if (category, subtopic) == HERO_SUBTOPIC:
            sentiment = wchoice(rng, [2, 3], [4, 6])
        author = rng.choice(reservists)
        p = {'id': f'prp_{len(proposals) + 1:05d}', 'rangeId': rg['id'], 'authorId': author['id'],
             'category': category, 'subtopic': subtopic, 'title': tpl['title'], 'body': body,
             'maskExpected': mask_expected, 'sentiment': sentiment, 'status': 'RECEIVED',
             'issueId': None, 'state': 'VISIBLE', 'createdAt': iso(d, rng), 'updatedAt': iso(d, rng)}
        proposals.append(p)
        return p

    def pick_sub(category):
        names, ws = zip(*subs[category])
        return wchoice(rng, list(names), list(ws))

    for _ in range(N_PROPOSALS_BASE):
        c = wchoice(rng, cats, cat_w)
        s = pick_sub(c)
        rg = wchoice(rng, ranges, [range_weight(r, c) for r in ranges])
        if (c, s) == HERO_SUBTOPIC and rg['code'] == 'R-D04':
            d = sampler.date(end=date(2026, 6, 14))      # D훈련장은 개선 이후 배식 민원 없음
        else:
            d = sampler.date()
        make_proposal(c, s, rg, d)
    # 최근 4주 급증: 식사·급식, 대부분 배식 대기시간, A훈련장 중심
    for _ in range(N_SPIKE):
        s = HERO_SUBTOPIC[1] if rng.random() < 0.85 else pick_sub('MEAL')
        cand = [r for r in ranges if r['code'] != 'R-D04']
        rg = hero_rg if rng.random() < 0.5 else wchoice(rng, cand, [range_weight(r, 'MEAL') for r in cand])
        make_proposal('MEAL', s, rg, sampler.date(start=TODAY - timedelta(days=27)))

    # 상태와 이력
    history, empathies = [], []
    order = ['RECEIVED', 'REVIEWING', 'PLANNED', 'DONE']
    for p in proposals:
        created = datetime.fromisoformat(p['createdAt']).date()
        age = (TODAY - created).days
        if p['rangeId'] == hero_rg['id'] and (p['category'], p['subtopic']) == HERO_SUBTOPIC:
            final = wchoice(rng, ['RECEIVED', 'REVIEWING'], [6, 4])   # 시연 중 담당자가 처리할 대상
        elif age < 7:
            final = wchoice(rng, ['RECEIVED', 'REVIEWING'], [7, 3])
        elif age < 30:
            final = wchoice(rng, ['RECEIVED', 'REVIEWING', 'PLANNED', 'LONG_TERM'], [25, 45, 20, 10])
        else:
            lt = 30 if p['category'] == 'COMPENSATION' else 15
            final = wchoice(rng, ['RECEIVED', 'REVIEWING', 'PLANNED', 'DONE', 'LONG_TERM'], [14, 20, 22, 30, lt])
        steps = order[1:order.index(final) + 1] if final in order else ['REVIEWING', 'LONG_TERM']
        prev, t = 'RECEIVED', created
        actor = managers[p['rangeId']]['id']
        for st in steps:
            span = max(1, (TODAY - t).days // (len(steps) + 1))
            t = min(TODAY, t + timedelta(days=rng.randint(1, max(1, span))))
            history.append({'id': f'his_{len(history) + 1:05d}', 'proposalId': p['id'], 'from': prev, 'to': st,
                            'note': rng.choice(STATUS_NOTES[st]), 'actorId': actor, 'createdAt': iso(t, rng)})
            prev = st
        p['status'] = final
        p['updatedAt'] = iso(t, rng) if steps else p['createdAt']
        if final != 'RECEIVED' and rng.random() < 0.3:
            replies.append({'id': f'rpl_{len(replies) + 1:05d}', 'targetType': 'PROPOSAL', 'targetId': p['id'],
                            'authorId': actor, 'body': rng.choice(REPLY_TEMPLATES), 'createdAt': p['updatedAt']})
        # 공감
        n = int(rng.expovariate(1 / 4.0))
        if (p['category'], p['subtopic']) == HERO_SUBTOPIC:
            n += rng.randint(8, 14)
        for u in rng.sample(reservists, min(n, len(reservists))):
            if u['id'] != p['authorId']:
                empathies.append({'userId': u['id'], 'proposalId': p['id'],
                                  'createdAt': iso(min(TODAY, created + timedelta(days=rng.randint(0, 10))), rng)})

    # 이슈 묶음 + 우선순위 -------------------------------------------------
    emp_count = Counter(e['proposalId'] for e in empathies)
    groups = defaultdict(list)
    for p in proposals:
        groups[(p['category'], p['subtopic'])].append(p)
    cat_label = {r['category']: r['label'] for r in cat_rows}
    issues = []
    for (c, s), ps in sorted(groups.items(), key=lambda kv: -len(kv[1])):
        if len(ps) < 3:
            continue
        iid = f'iss_{len(issues) + 1:03d}'
        n_emp = sum(emp_count[p['id']] for p in ps)
        recent = sum(1 for p in ps if (TODAY - datetime.fromisoformat(p['createdAt']).date()).days <= 30)
        recency = 1.2 if recent / len(ps) >= 0.5 else 1.0
        sev = sum(p['sentiment'] for p in ps) / len(ps)
        score = math.log2(1 + len(ps) + n_emp) * sev * (1.5 if safety[(c, s)] else 1.0) * recency
        issues.append({'id': iid, 'category': c, 'subtopic': s, 'title': f'{cat_label[c]} · {s}',
                       'summary': None, 'priorityScore': round(score, 2), 'isSafety': safety[(c, s)],
                       'proposalCount': len(ps), 'empathyCount': n_emp,
                       'rangeCount': len({p['rangeId'] for p in ps}), 'updatedAt': iso(TODAY, hour=9)})
        for p in ps:
            p['issueId'] = iid
    issues.sort(key=lambda i: -i['priorityScore'])

    # 개선 사례 --------------------------------------------------------------
    best = []
    for b in bp_basis:
        rg = by_code.get(b['rangeCode']) if b['rangeCode'] else None
        if b['rangeCode'] and rg is None:
            continue
        when = BP_DATES.get(b['id'], date(2023, 7, 10))
        best.append({'id': b['id'], 'rangeId': rg['id'] if rg else None, 'category': b['category'],
                     'title': b['title'], 'before': b['before'], 'after': b['after'],
                     'basis': b['basis'], 'basisLabel': b['basisLabel'], 'sourceId': b['sourceId'],
                     'completedAt': iso(when, hour=9) if b['basis'] == 'FICTIONAL' else None,
                     'recommendedAt': iso(when, hour=9) if b['basis'] != 'FICTIONAL' else None})

    # 가이드 + Q&A ------------------------------------------------------------
    guides, questions, answers = [], [], []
    for rg in ranges:
        official = [t for t in guide_tpl if t['is_official'] == 'true']
        tips = [t for t in guide_tpl if t['is_official'] != 'true']
        chosen = rng.sample(official, rng.randint(4, len(official))) + rng.sample(tips, rng.randint(4, len(tips)))
        mine = []
        for t in chosen:
            g = {'id': f'gde_{len(guides) + 1:05d}', 'rangeId': rg['id'], 'section': t['section'],
                 'body': t['text'].replace('{sigungu}', rg['sigungu']), 'isOfficial': t['is_official'] == 'true',
                 'authorId': managers[rg['id']]['id'] if t['is_official'] == 'true' else rng.choice(reservists)['id'],
                 'helpfulCount': rng.randint(0, 40), 'state': 'VISIBLE',
                 'createdAt': iso(sampler.date(), rng)}
            guides.append(g)
            mine.append(g)
        for q in rng.sample(qna_tpl, rng.randint(3, min(6, len(qna_tpl)))):
            qd = sampler.date()
            qid = f'qst_{len(questions) + 1:05d}'
            questions.append({'id': qid, 'rangeId': rg['id'], 'authorId': rng.choice(reservists)['id'],
                              'body': q['question'], 'createdAt': iso(qd, rng)})
            src = [g['id'] for g in mine if g['section'] == q['answer_section']]
            if src and rng.random() < 0.8:   # 20%는 담당자 답변 대기 상태로 둔다
                answers.append({'id': f'ans_{len(answers) + 1:05d}', 'questionId': qid, 'authorId': None,
                                'isAi': True, 'body': q['answer_template'], 'sourceGuideIds': src,
                                'createdAt': iso(qd, rng)})

    # 저장 -----------------------------------------------------------------
    os.makedirs(os.path.join(OUT, 'csv'), exist_ok=True)
    meta = {'generatedAt': datetime.now(KST).isoformat(timespec='seconds'), 'dataAsOf': TODAY.isoformat(),
            'seed': SEED, 'realRanges': bool(args.real_ranges),
            'notice': '훈련장 목록(실제 데이터 사용 시)을 제외한 모든 점수·후기·제안·사용자는 가상 데이터입니다.',
            'counts': {}}
    tables = {'ranges': ranges, 'users': users, 'training-records': records, 'reviews': reviews,
              'proposals': proposals, 'proposal-empathies': empathies, 'status-history': history,
              'official-replies': replies, 'issues': issues, 'best-practices': best, 'guides': guides,
              'questions': questions, 'answers': answers}
    for name, rows in tables.items():
        with open(os.path.join(OUT, f'{name}.json'), 'w', encoding='utf-8') as f:
            json.dump(rows, f, ensure_ascii=False, indent=1)
        meta['counts'][name] = len(rows)
    with open(os.path.join(OUT, 'meta.json'), 'w', encoding='utf-8') as f:
        json.dump(meta, f, ensure_ascii=False, indent=1)
    for name in ['ranges', 'reviews', 'proposals', 'issues']:
        rows = tables[name]
        keys = list(dict.fromkeys(k for r in rows for k in r))
        with open(os.path.join(OUT, 'csv', f'{name}.csv'), 'w', newline='', encoding='utf-8-sig') as f:
            w = csv.DictWriter(f, fieldnames=keys)
            w.writeheader()
            for r in rows:
                w.writerow({k: (json.dumps(v, ensure_ascii=False) if isinstance(v, (list, dict)) else v)
                            for k, v in r.items()})
    print(json.dumps(meta['counts'], ensure_ascii=False))


if __name__ == '__main__':
    main()
