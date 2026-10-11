"""
국방부_예비군 훈련장 정보 CSV(공공데이터포털)를 밀라인드 훈련장 시드로 변환한다.

  1) https://www.data.go.kr/dcat/metadata/15050550 에서 CSV를 내려받는다.
  2) python3 scripts/convert_mnd_ranges.py 내려받은파일.csv
     -> data/ranges_real.json, data/ranges_real.csv, data/ranges_unmatched.csv
  3) python3 scripts/generate_seed.py --real-ranges data/ranges_real.json

좌표는 상세 주소가 아니라 '군구' 중심점이다 (보안·지오코딩 불필요).
"""
import csv, json, os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from geo_lookup import GeoLookup, norm_sido  # noqa: E402

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
COLS = {  # 공공데이터 컬럼명 -> 내부 키 (공백 차이는 무시하고 비교)
    '훈련장': 'name', '훈련장명': 'name', '시도': 'sido', '군구': 'sigungu', '시군구': 'sigungu',
    '주소': 'address', '약도': 'mapNote', '훈련장유형명': 'typeName', '훈련장형태명': 'formName',
    '훈련장종류명': 'kindName', '훈련장전화번호': 'phone', '전화번호': 'phone',
}


def read_any(path):
    for enc in ('utf-8-sig', 'cp949', 'euc-kr'):
        try:
            with open(path, encoding=enc) as f:
                return list(csv.DictReader(f)), enc
        except UnicodeDecodeError:
            continue
    raise SystemExit('인코딩을 알 수 없습니다 (utf-8, cp949 모두 실패)')


def main(src):
    rows, enc = read_any(src)
    geo = GeoLookup()
    out, miss = [], []
    for i, raw in enumerate(rows, 1):
        r = {}
        for k, v in raw.items():
            key = COLS.get((k or '').replace(' ', ''))
            if key:
                r[key] = (v or '').strip()
        if not r.get('name'):
            continue
        sido = norm_sido(r.get('sido'))
        hit = geo.find(sido, r.get('sigungu'))
        if hit is None:
            miss.append({**r, 'reason': '군구 좌표 없음'})
            continue
        lat, lng, _ = hit
        labels = ' '.join(r.get(k, '') for k in ('typeName', 'formName', 'kindName', 'name'))
        out.append({
            'code': f'R-MND-{i:03d}', 'name': r['name'],
            'type': 'MOBILIZATION' if '동원' in labels else 'REGIONAL',
            'sido': sido, 'sigungu': r.get('sigungu', '').replace(' ', ''), 'lat': lat, 'lng': lng,
            'address': r.get('address'), 'phone': r.get('phone'),
            'typeName': r.get('typeName'), 'formName': r.get('formName'), 'kindName': r.get('kindName'),
        })
    os.makedirs(os.path.join(ROOT, 'data'), exist_ok=True)
    with open(os.path.join(ROOT, 'data', 'ranges_real.json'), 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
    for name, data in (('ranges_real.csv', out), ('ranges_unmatched.csv', miss)):
        with open(os.path.join(ROOT, 'data', name), 'w', newline='', encoding='utf-8-sig') as f:
            if data:
                w = csv.DictWriter(f, fieldnames=list(data[0].keys()))
                w.writeheader(); w.writerows(data)
    print(f'입력 인코딩 {enc}, 변환 {len(out)}곳, 좌표 못 찾음 {len(miss)}곳 (data/ranges_unmatched.csv 확인)')


if __name__ == '__main__':
    if len(sys.argv) != 2:
        raise SystemExit(__doc__)
    main(sys.argv[1])
