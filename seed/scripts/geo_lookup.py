"""시도·시군구 이름으로 중심 좌표를 찾는다. 2013년 경계 기준이라 이후 명칭 변경을 보정한다."""
import csv
import os

HERE = os.path.dirname(os.path.abspath(__file__))
CENTROIDS = os.path.join(HERE, '..', 'geo', 'sigungu_centroids.csv')

SIDO_ALIASES = {
    '강원도': '강원특별자치도', '강원': '강원특별자치도',
    '전라북도': '전북특별자치도', '전북': '전북특별자치도',
    '서울': '서울특별시', '부산': '부산광역시', '대구': '대구광역시', '인천': '인천광역시',
    '광주': '광주광역시', '대전': '대전광역시', '울산': '울산광역시', '세종': '세종특별자치시',
    '경기': '경기도', '충북': '충청북도', '충남': '충청남도', '전남': '전라남도',
    '경북': '경상북도', '경남': '경상남도', '제주': '제주특별자치도', '제주도': '제주특별자치도',
}


def norm_sido(s):
    s = (s or '').strip()
    return SIDO_ALIASES.get(s, s)


def norm_sgg(s):
    return (s or '').replace(' ', '').strip()


class GeoLookup:
    def __init__(self, path=CENTROIDS):
        with open(path, encoding='utf-8-sig') as f:
            self.rows = list(csv.DictReader(f))
        self.by_key = {(r['sido'], r['sigungu']): r for r in self.rows}
        self.by_name = {}
        for r in self.rows:
            self.by_name.setdefault(r['sigungu'], []).append(r)

    def find(self, sido, sigungu):
        """(lat, lng, matched_label) 또는 None"""
        sido, sgg = norm_sido(sido), norm_sgg(sigungu)
        r = self.by_key.get((sido, sgg))
        if r is None and sgg.endswith('구') and '시' in sgg[:-1]:
            # '수원시장안구' 처럼 저장된 경우와 '수원시'만 있는 경우 모두 대응
            r = self.by_key.get((sido, sgg[:sgg.index('시') + 1]))
        if r is None:
            cands = self.by_name.get(sgg, [])
            if len(cands) == 1:  # 시도가 바뀐 경우 (예: 군위군 경북→대구)
                r = cands[0]
        if r is None:
            return None
        return float(r['lat']), float(r['lng']), f"{r['sido']} {r['sigungu']}"
