'use client';
/**
 * 만족도 지도 (명세 §6.1). 지도 API 없이 로컬 TopoJSON + d3-geo로 그립니다.
 * - 시도 경계, 확대(×2.5 이상) 시 시군구 경계
 * - d3-zoom: 휠·핀치·드래그
 * - 화면에서 겹치는 핀은 묶어서 "경기 2곳 · 평균 3.8"로 표시, 누르면 확대
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { geoMercator, geoPath } from 'd3-geo';
import { select } from 'd3-selection';
import 'd3-transition';
import { zoom as d3zoom, zoomIdentity, type ZoomBehavior, type ZoomTransform } from 'd3-zoom';
import { feature } from 'topojson-client';
import type { FeatureCollection, Geometry } from 'geojson';
import type { Topology, GeometryCollection } from 'topojson-specification';
import sidoTopo from '@/data/geo/korea-sido.topo.json';
import sigunguTopo from '@/data/geo/korea-sigungu.topo.json';
import { scoreColor } from '@/components/ui';
import { SIDO_SHORT } from '@/lib/constants';
import type { RangeSummary } from '@/lib/types';

const W = 600;
const H = 760;

type Props = {
  ranges: RangeSummary[];
  value: (r: RangeSummary) => number | null;
  selectedId?: string | null;
  onSelect: (id: string) => void;
};

function toFC(topo: unknown): FeatureCollection<Geometry, { name: string; code: string }> {
  const t = topo as Topology;
  const key = Object.keys(t.objects)[0];
  return feature(t, t.objects[key] as GeometryCollection) as unknown as FeatureCollection<Geometry, { name: string; code: string }>;
}

export function KoreaMap({ ranges, value, selectedId, onSelect }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const zoomRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const [t, setT] = useState<ZoomTransform>(zoomIdentity);
  // 화면 1px당 viewBox 단위. 핀을 화면에서 늘 같은 크기로 그리기 위해 사용 (모바일에서 핀이 작아지지 않게)
  const [unit, setUnit] = useState(1);
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const measure = () => {
      const { width, height } = el.getBoundingClientRect();
      if (width > 0 && height > 0) setUnit(Math.max(W / width, H / height));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { sido, sigungu, path, projection } = useMemo(() => {
    const sidoFC = toFC(sidoTopo);
    const sigunguFC = toFC(sigunguTopo);
    // 본토+제주 범위에 맞춤 (울릉도·독도는 끌어서 볼 수 있음) → 핀이 덜 겹치도록 최대한 크게
    const frame = { type: 'Feature', properties: {}, geometry: { type: 'MultiPoint', coordinates: [[124.6, 33.1], [129.6, 38.62]] } } as const;
    const proj = geoMercator().fitExtent([[12, 12], [W - 12, H - 12]], frame as unknown as FeatureCollection);
    return { sido: sidoFC, sigungu: sigunguFC, path: geoPath(proj), projection: proj };
  }, []);

  useEffect(() => {
    if (!svgRef.current) return;
    const z = d3zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 8])
      .translateExtent([[-100, -100], [W + 100, H + 100]])
      .on('zoom', (e) => setT(e.transform));
    zoomRef.current = z;
    select(svgRef.current).call(z).on('dblclick.zoom', null);
    return () => { if (svgRef.current) select(svgRef.current).on('.zoom', null); };
  }, []);

  const zoomBy = (k: number) => { if (svgRef.current && zoomRef.current) select(svgRef.current).transition().duration(250).call(zoomRef.current.scaleBy, k); };
  const reset = () => { if (svgRef.current && zoomRef.current) select(svgRef.current).transition().duration(250).call(zoomRef.current.transform, zoomIdentity); };
  const zoomTo = (x: number, y: number, k: number) => {
    if (!svgRef.current || !zoomRef.current) return;
    select(svgRef.current).transition().duration(350).call(zoomRef.current.transform, zoomIdentity.translate(W / 2, H / 2).scale(k).translate(-x, -y));
  };

  // 핀 위치와 겹침 묶음 (화면 좌표 기준)
  const pins = useMemo(() => ranges.map((r) => {
    const [x, y] = projection([r.lng, r.lat]) ?? [0, 0];
    return { r, x, y, v: value(r) };
  }), [ranges, projection, value]);

  // 화면에서 라벨 상자가 겹치는 핀은 묶음. 묶음 라벨도 다른 상자와 겹치면 다시 합침 (겹침이 없을 때까지)
  const groups = useMemo(() => {
    type G = { items: typeof pins; x: number; y: number };
    const s = unit / t.k;
    const labelOf = (g: G) => {
      if (g.items.length === 1) return null;
      const vals = g.items.map((p) => p.v).filter((v): v is number => v !== null);
      const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
      const sidos = new Set(g.items.map((p) => p.r.sido));
      const name = sidos.size === 1 ? `${SIDO_SHORT[g.items[0].r.sido] ?? ''} ` : '';
      return `${name}${g.items.length}곳 · 평균 ${avg === null ? '–' : avg.toFixed(1)}`;
    };
    const box = (g: G) => {
      const label = labelOf(g);
      const w = (label ? 14 + label.length * 8.2 : 50) * s;
      const h = (label ? 26 : 34) * s;
      const cy = label ? g.y : g.y - 12 * s;
      return { x0: g.x - w / 2, x1: g.x + w / 2, y0: cy - h / 2, y1: cy + h / 2 };
    };
    const overlap = (a: ReturnType<typeof box>, b: ReturnType<typeof box>) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
    let gs: G[] = pins.map((p) => ({ items: [p], x: p.x, y: p.y }));
    for (let guard = 0; guard < 50; guard++) {
      let merged = false;
      outer: for (let i = 0; i < gs.length; i++) {
        for (let j = i + 1; j < gs.length; j++) {
          if (overlap(box(gs[i]), box(gs[j]))) {
            const items = [...gs[i].items, ...gs[j].items];
            const g = { items, x: items.reduce((a, p) => a + p.x, 0) / items.length, y: items.reduce((a, p) => a + p.y, 0) / items.length };
            gs = [...gs.slice(0, i), g, ...gs.slice(i + 1, j), ...gs.slice(j + 1)];
            merged = true;
            break outer;
          }
        }
      }
      if (!merged) break;
    }
    return gs.map((g) => ({ ...g, label: labelOf(g) }));
  }, [pins, t.k, unit]);

  const showSigungu = t.k >= 2.5;
  const inv = unit / t.k;

  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl border border-line bg-[#eef3f6]">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="h-full w-full touch-none select-none"
        role="img"
        aria-label="전국 훈련장 만족도 지도. 지도 대신 목록 보기도 있습니다."
        data-testid="korea-map"
      >
        <g transform={t.toString()}>
          {sido.features.map((f) => (
            <path key={f.properties.code} d={path(f) ?? ''} fill="var(--c-map-land)" stroke="var(--c-map-stroke)" strokeWidth={1.2 / t.k} />
          ))}
          {showSigungu && sigungu.features.map((f) => (
            <path key={f.properties.code} d={path(f) ?? ''} fill="none" stroke="#c3cbb7" strokeWidth={0.6 / t.k} />
          ))}
          {!showSigungu && sido.features.map((f) => {
            const [cx, cy] = path.centroid(f);
            return (
              <text key={`l-${f.properties.code}`} x={cx} y={cy} textAnchor="middle" fontSize={11 * inv} fill="#8a947f" pointerEvents="none">
                {SIDO_SHORT[f.properties.name] ?? ''}
              </text>
            );
          })}
          {groups.map((g) => {
            if (g.items.length === 1) {
              const p = g.items[0];
              const sel = p.r.id === selectedId;
              const label = p.v === null ? '평가 부족' : `${p.v.toFixed(1)} ${p.r.trend === 'up' ? '▲' : p.r.trend === 'down' ? '▼' : '–'}`;
              const w = p.v === null ? 60 : 48;
              return (
                <g
                  key={p.r.id}
                  transform={`translate(${p.x},${p.y}) scale(${inv})`}
                  onClick={(e) => { e.stopPropagation(); onSelect(p.r.id); }}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect(p.r.id); }}
                  role="button"
                  tabIndex={0}
                  aria-label={`${p.r.name} ${p.v === null ? '평가 부족' : `${p.v.toFixed(1)}점`}`}
                  data-testid={`pin-${p.r.id}`}
                  className="cursor-pointer"
                >
                  <circle r={3} fill={scoreColor(p.v)} />
                  <rect x={-w / 2} y={-32} width={w} height={22} rx={11} fill={scoreColor(p.v)} stroke={sel ? '#111' : '#fff'} strokeWidth={sel ? 2.5 : 1.5} />
                  <text y={-16.5} textAnchor="middle" fontSize={12} fontWeight={800} fill="#fff">{label}</text>
                  <text y={11} textAnchor="middle" fontSize={10} fontWeight={700} fill="#33402e" stroke="#fff" strokeWidth={3} paintOrder="stroke">{p.r.name.replace('훈련장', '')}</text>
                </g>
              );
            }
            const label = g.label!;
            const w = 14 + label.length * 8.2;
            return (
              <g
                key={g.items.map((p) => p.r.id).join('|')}
                transform={`translate(${g.x},${g.y}) scale(${inv})`}
                onClick={(e) => { e.stopPropagation(); zoomTo(g.x, g.y, Math.min(8, t.k * 2.2)); }}
                role="button"
                tabIndex={0}
                aria-label={`${label}, 눌러서 확대`}
                className="cursor-pointer"
              >
                <rect x={-w / 2} y={-13} width={w} height={26} rx={13} fill="#33402e" stroke="#fff" strokeWidth={1.5} />
                <text y={4.5} textAnchor="middle" fontSize={12} fontWeight={700} fill="#fff">{label}</text>
              </g>
            );
          })}
        </g>
      </svg>
      <div className="absolute right-3 top-3 flex flex-col gap-1">
        {[['+', () => zoomBy(1.6), '확대'], ['−', () => zoomBy(1 / 1.6), '축소'], ['⟲', reset, '처음 크기로']].map(([l, fn, a]) => (
          <button key={a as string} type="button" aria-label={a as string} onClick={fn as () => void} className="grid h-11 w-11 place-items-center rounded-xl border border-line bg-surface text-lg font-bold shadow-sm">
            {l as string}
          </button>
        ))}
      </div>
      <div className="absolute bottom-3 left-3 flex flex-wrap gap-2 rounded-xl bg-surface/90 px-3 py-2 text-xs">
        {[['4.0 이상', 4.2], ['3.0~3.9', 3.5], ['3.0 미만', 2.5], ['평가 부족', null]].map(([l, v]) => (
          <span key={l as string} className="flex items-center gap-1"><i className="inline-block h-3 w-3 rounded-full" style={{ background: scoreColor(v as number | null) }} />{l as string}</span>
        ))}
      </div>
    </div>
  );
}
