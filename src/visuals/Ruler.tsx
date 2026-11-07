import { useMemo, useState } from 'react';
import { digitsOf } from '../engine/steps';
import { useHops, useWidth } from '../lib/hooks';
import { useSound } from '../lib/sound';
import { RANK_CLASS, type VisualProps } from './common';

const BASE = 92;
/** Pixels par unité selon le pas en cours : on dézoome pour les dizaines et les centaines. */
const ZOOM: Record<number, { px: number; minor: number; label: number }> = {
  1: { px: 26, minor: 1, label: 1 },
  10: { px: 3.4, minor: 5, label: 10 },
  100: { px: 0.36, minor: 50, label: 100 },
};

interface Hop {
  from: number;
  to: number;
  rank: number;
}

/** Règle graduée : un personnage avance par petits bonds, puis par bonds de 10 et de 100. */
export default function Ruler({ lesson, step, dur }: VisualProps) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const play = useSound();
  const s = lesson.steps[step];
  const [flash, setFlash] = useState<{ id: number; rank: number } | null>(null);

  const v = useHops(s.value, s.unit, dur * 0.75, lesson.id, (rank) => {
    setFlash({ id: Date.now(), rank });
    play('click');
  });

  // Le zoom suit le dernier pas utilisé (la fin garde celui des centaines par exemple).
  const zoomUnit = s.kind === 'done' ? lesson.steps[step - 1].unit : s.unit;
  const z = ZOOM[zoomUnit];

  const hops = useMemo(() => {
    const list: Hop[] = [];
    let p = lesson.ex.a;
    digitsOf(lesson.ex.b).forEach((d, rank) => {
      for (let k = 0; k < d; k++) {
        list.push({ from: p, to: p + 10 ** rank, rank });
        p += 10 ** rank;
      }
    });
    return list;
  }, [lesson]);

  if (!width) return <div ref={ref} className="vis ruler" />;

  const half = width / 2 / z.px + z.minor * 2;
  const lo = Math.max(0, Math.floor((Math.min(v, s.value) - half) / z.minor) * z.minor);
  const hi = Math.max(v, s.value) + half;
  const ticks: number[] = [];
  for (let t = lo; t <= hi; t += z.minor) ticks.push(t);
  const shift = width / 2 - v * z.px;
  const kind = (t: number) => (t % 100 === 0 ? 'c' : t % 10 === 0 ? 'd' : t % 5 === 0 ? 'five' : 'u');

  return (
    <div ref={ref} className="vis ruler">
      <svg width={width} height={128} role="img" aria-label={`Règle graduée, le personnage est sur ${v}`}>
        <g className="ruler-track" style={{ transform: `translateX(${shift}px)`, transitionDuration: `${dur * 0.7}ms` }}>
          <line x1={lo * z.px} x2={hi * z.px} y1={BASE} y2={BASE} className="ruler-base" />
          {ticks.map((t) => {
            const k = kind(t);
            const h = k === 'c' ? 30 : k === 'd' ? 24 : k === 'five' ? 14 : 9;
            const showLabel = t % z.label === 0;
            return (
              <g key={t}>
                <line x1={t * z.px} x2={t * z.px} y1={BASE} y2={BASE - h} className={`tick ${k}`} />
                {showLabel && (
                  <text x={t * z.px} y={BASE + 18} className={`tick-label ${k}`} textAnchor="middle">
                    {t}
                  </text>
                )}
              </g>
            );
          })}
          <g className="start-flag">
            <line x1={lesson.ex.a * z.px} x2={lesson.ex.a * z.px} y1={BASE} y2={BASE + 28} />
            <text x={lesson.ex.a * z.px + 4} y={BASE + 34}>
              départ
            </text>
          </g>
          {hops
            .filter((h) => h.to <= v && (h.to - h.from) * z.px >= 6)
            .map((h) => {
              const x1 = h.from * z.px;
              const x2 = h.to * z.px;
              const lift = Math.min(46, (x2 - x1) * 0.6);
              return (
                <path
                  key={`${h.from}-${h.rank}`}
                  d={`M${x1},${BASE - 4} Q${(x1 + x2) / 2},${BASE - 4 - lift * 1.6} ${x2},${BASE - 4}`}
                  className={`hop ${RANK_CLASS[h.rank]}`}
                />
              );
            })}
        </g>
      </svg>
      <div className="frog-wrap" style={{ left: width / 2 }}>
        <svg key={v} className="frog" viewBox="0 0 48 40" aria-hidden="true">
          <ellipse cx="24" cy="26" rx="17" ry="12" className="frog-body" />
          <circle cx="15" cy="13" r="6.5" className="frog-body" />
          <circle cx="33" cy="13" r="6.5" className="frog-body" />
          <circle cx="15" cy="12" r="3.6" fill="#fff" />
          <circle cx="33" cy="12" r="3.6" fill="#fff" />
          <circle cx="16" cy="13" r="1.8" fill="#1D2742" />
          <circle cx="34" cy="13" r="1.8" fill="#1D2742" />
          <path d="M17 28q7 5 14 0" fill="none" stroke="#1D2742" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
        <span className="frog-value">{v}</span>
      </div>
      {flash && (
        <span key={flash.id} className={`ruler-flash ${RANK_CLASS[flash.rank]}`} style={{ left: width / 2 }}>
          +1 {flash.rank === 1 ? 'dizaine' : 'centaine'} !
        </span>
      )}
    </div>
  );
}
