"""KOSTAT 2013 시군구 경계(GeoJSON)로 시군구 중심점 CSV를 만든다. 외부 패키지 불필요."""
import csv, json, sys, os

SIDO = {'11':'서울특별시','21':'부산광역시','22':'대구광역시','23':'인천광역시','24':'광주광역시','25':'대전광역시',
        '26':'울산광역시','29':'세종특별자치시','31':'경기도','32':'강원특별자치도','33':'충청북도','34':'충청남도',
        '35':'전북특별자치도','36':'전라남도','37':'경상북도','38':'경상남도','39':'제주특별자치도'}

def ring_area_centroid(r):
    a = cx = cy = 0.0
    for (x1, y1), (x2, y2) in zip(r, r[1:] + r[:1]):
        f = x1 * y2 - x2 * y1
        a += f; cx += (x1 + x2) * f; cy += (y1 + y2) * f
    if a == 0: return 0, 0, 0
    return a / 2, cx / (3 * a), cy / (3 * a)

def geom_centroid(g):
    polys = [g['coordinates']] if g['type'] == 'Polygon' else g['coordinates']
    A = X = Y = 0.0
    for poly in polys:
        for i, ring in enumerate(poly):
            a, x, y = ring_area_centroid(ring)
            a = abs(a) * (1 if i == 0 else -1)
            A += a; X += x * a; Y += y * a
    return X / A, Y / A, A

def main(src, out):
    d = json.load(open(src, encoding='utf-8'))
    rows = []
    for f in d['features']:
        p = f['properties']; lng, lat, area = geom_centroid(f['geometry'])
        rows.append({'code': p['code'], 'sido': SIDO[p['code'][:2]], 'sigungu': p['name'],
                     'lat': round(lat, 5), 'lng': round(lng, 5), 'area': area})
    # 구가 나뉜 시(예: 창원시성산구)는 시 단위 행도 추가 (면적 가중 평균)
    from collections import defaultdict
    groups = defaultdict(list)
    for r in rows:
        n = r['sigungu']
        if '시' in n[:-1] and n.endswith('구') and n.index('시') < len(n) - 1:
            groups[(r['sido'], n[:n.index('시') + 1])].append(r)
    for (sido, city), rs in groups.items():
        A = sum(r['area'] for r in rs)
        rows.append({'code': rs[0]['code'][:4] + 'X', 'sido': sido, 'sigungu': city,
                     'lat': round(sum(r['lat'] * r['area'] for r in rs) / A, 5),
                     'lng': round(sum(r['lng'] * r['area'] for r in rs) / A, 5), 'area': A})
    with open(out, 'w', newline='', encoding='utf-8-sig') as fp:
        w = csv.DictWriter(fp, fieldnames=['code', 'sido', 'sigungu', 'lat', 'lng'])
        w.writeheader()
        for r in sorted(rows, key=lambda r: r['code']):
            w.writerow({k: r[k] for k in w.fieldnames})
    print(len(rows), 'rows ->', out)

if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
