import { useMemo, useState } from 'react';
import { digitsOf } from '../engine/steps';
import { useWidth } from '../lib/hooks';
import { useSound } from '../lib/sound';
import { RANK_CLASS, type VisualProps } from './common';
import { Hand } from './Gesture';
import { useTaps } from './taps';

const BASE = 92;
/** Pixels par unité selon le pas en cours : on dézoome pour les dizaines et les centaines. */
const ZOOM: Record<number, { px: number; minor: number; label: number }> = {
  1: { px: 26, minor: 1, label: 1 },
  10: { px: 3.4, minor: 5, label: 10 },
  100: { px: 0.36, minor: 50, label: 100 },
};

export interface Hop {
  from: number;
  to: number;
  rank: number;
}

interface SceneProps {
  width: number;
  /** Position de la grenouille. */
  v: number;
  /** Prochaine position (pour dessiner la règle assez loin pendant le bond). */
  target?: number;
  hops: Hop[];
  start: number;
  zoomUnit: number;
  dur: number;
  flash: { id: number; rank: number } | null;
}

/** La règle, la grenouille et ses bonds. */
export function RulerScene({ width, v, target = v, hops, start, zoomUnit, dur, flash }: SceneProps) {
  const z = ZOOM[zoomUnit] ?? ZOOM[1];
  const half = width / 2 / z.px + z.minor * 2;
  const lo = Math.max(0, Math.floor((Math.min(v, target) - half) / z.minor) * z.minor);
  const hi = Math.max(v, target) + half;
  const ticks: number[] = [];
  for (let t = lo; t <= hi; t += z.minor) ticks.push(t);
  const shift = width / 2 - v * z.px;
  const kind = (t: number) => (t % 100 === 0 ? 'c' : t % 10 === 0 ? 'd' : t % 5 === 0 ? 'five' : 'u');

  return (
    <>
      <svg width={width} height={128} role="img" aria-label={`Règle graduée, la grenouille est sur ${v}`}>
        <g className="ruler-track" style={{ transform: `translateX(${shift}px)`, transitionDuration: `${dur * 0.7}ms` }}>
          <line x1={lo * z.px} x2={hi * z.px} y1={BASE} y2={BASE} className="ruler-base" />
          {ticks.map((t) => {
            const k = kind(t);
            const h = k === 'c' ? 30 : k === 'd' ? 24 : k === 'five' ? 14 : 9;
            return (
              <g key={t}>
                <line x1={t * z.px} x2={t * z.px} y1={BASE} y2={BASE - h} className={`tick ${k}`} />
                {t % z.label === 0 && (
                  <text x={t * z.px} y={BASE + 18} className={`tick-label ${k}`} textAnchor="middle">
                    {t}
                  </text>
                )}
              </g>
            );
          })}
          <g className="start-flag">
            <line x1={start * z.px} x2={start * z.px} y1={BASE} y2={BASE + 28} />
            <text x={start * z.px + 4} y={BASE + 34}>
              départ
            </text>
          </g>
          {hops
            .filter((h) => Math.max(h.from, h.to) <= Math.max(v, start) && Math.abs(h.to - h.from) * z.px >= 6)
            .map((h, i) => {
              const x1 = h.from * z.px;
              const x2 = h.to * z.px;
              const lift = Math.min(46, Math.abs(x2 - x1) * 0.6);
              return (
                <path
                  key={`${i}-${h.from}-${h.rank}`}
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
    </>
  );
}

/** Règle graduée : l'enfant tape pour faire chaque bond de la grenouille (1, puis 10, puis 100). */
export default function Ruler({ lesson, step, dur, gesture }: VisualProps) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const play = useSound();
  const s = lesson.steps[step];
  const [flash, setFlash] = useState<{ id: number; rank: number } | null>(null);
  const { taps, need, tap } = useTaps(step, gesture, dur * 0.9);
  const unit = gesture?.next.kind === 'add' ? gesture.next.unit : 0;
  const v = s.value + taps * unit;

  // Le zoom suit la taille des bonds en cours (la fin garde celui du dernier bond).
  const zoomUnit = unit || (s.kind === 'done' ? lesson.steps[step - 1].unit : s.unit);

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

  const onTap = () => {
    if (!gesture) return;
    if (need === 0) return gesture.onWrong();
    if (!tap()) return;
    const next = v + unit;
    if (Math.floor(next / (unit * 10)) > Math.floor(v / (unit * 10))) {
      setFlash({ id: Date.now(), rank: Math.round(Math.log10(unit)) + 1 });
      play('click');
    } else play('pop');
  };

  const rank = gesture?.next.kind === 'add' ? gesture.next.col : 0;
  return (
    <div className="ruler-wrap">
      <div ref={ref} className={`vis ruler ${gesture && need ? 'tappable' : ''}`} onClick={onTap}>
        {width > 0 && (
          <RulerScene
            width={width}
            v={v}
            hops={hops.filter((h) => h.to <= v)}
            start={lesson.ex.a}
            zoomUnit={zoomUnit}
            dur={dur}
            flash={flash}
          />
        )}
        {gesture && need > 0 && (
          <span className={`hop-size t-${RANK_CLASS[rank]}`} style={{ left: width / 2 + 26 }}>
            +{unit}
          </span>
        )}
        {gesture?.hint && need > 0 && <Hand x={width / 2 - 10} y={58} />}
      </div>
      {gesture && need > 0 && (
        <span className={`tap-dots ${RANK_CLASS[rank]}`} aria-label={`Encore ${need - taps} bonds`}>
          {Array.from({ length: need }, (_, k) => (
            <i key={k} className={k < taps ? 'on' : ''} />
          ))}
        </span>
      )}
    </div>
  );
}
