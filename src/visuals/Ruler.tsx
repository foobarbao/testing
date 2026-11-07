import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
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
  /** Bond qui complète la dizaine (complément à 10), dessiné en orange. */
  comp?: boolean;
  /** Numéro du bond dans sa série (1, 2, 3…). */
  n?: number;
}

/** Bonds d'une série depuis `from` : numérotés, ceux qui mènent à la dizaine suivante marqués. */
export function hopRun(from: number, count: number, rank: number): Hop[] {
  const size = 10 ** rank;
  const big = size * 10;
  const ten = Math.ceil((from + 1) / big) * big;
  const reaches = from + count * size >= ten && from % big !== 0;
  return Array.from({ length: count }, (_, k) => ({
    from: from + k * size,
    to: from + (k + 1) * size,
    rank,
    n: k + 1,
    comp: reaches && from + (k + 1) * size <= ten,
  }));
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
  flash: { id: number; rank: number; text?: string } | null;
  /** Total ajouté depuis le départ de la série, affiché « +3 » à côté de la grenouille. */
  plus?: number;
}

const MIN_PX = 0.25;
const MAX_PX = 60;
const MINORS = [1, 5, 10, 50, 100, 500];
const LABELS = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000];
const clampPx = (px: number) => Math.min(MAX_PX, Math.max(MIN_PX, px));

/** Graduations adaptées au zoom : assez serrées pour compter, assez espacées pour lire. */
function tickPlan(px: number) {
  const minor = MINORS.find((m) => m * px >= 6) ?? 500;
  const label = LABELS.find((l) => l * px >= 32 && l % minor === 0) ?? 1000;
  return { minor, label };
}

const Loupe = ({ plus }: { plus: boolean }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="10" cy="10" r="6.5" />
    <path d="M15 15l6 6M7 10h6" />
    {plus && <path d="M10 7v6" />}
  </svg>
);

/**
 * La règle, la grenouille et ses bonds.
 * L'enfant peut faire glisser la règle avec le doigt, la rapprocher ou l'éloigner
 * (boutons loupe, ou deux doigts), puis revenir à la grenouille. Dès qu'elle bondit, la règle la suit.
 */
export function RulerScene({ width, v, target = v, hops, start, zoomUnit, dur, flash, plus }: SceneProps) {
  const [userPx, setUserPx] = useState<number | null>(null);
  const [pan, setPan] = useState(0);
  const [dragging, setDragging] = useState(false);
  const pointers = useRef(new Map<number, number>());
  const gesture = useRef<{ x0: number; pan0: number; d0: number; px0: number } | null>(null);
  const dragged = useRef(false);

  // La grenouille bondit : on revient sur elle.
  useEffect(() => setPan(0), [v]);

  const px = userPx ?? (ZOOM[zoomUnit] ?? ZOOM[1]).px;
  const { minor, label } = tickPlan(px);
  const center = Math.min(1000, Math.max(0, v + pan));
  const half = width / 2 / px + minor * 2;
  const lo = Math.max(0, Math.floor((Math.min(center, v, target) - half) / minor) * minor);
  const hi = Math.min(1000, Math.max(center, v, target) + half);
  const ticks: number[] = [];
  for (let t = lo; t <= hi; t += minor) ticks.push(t);
  const shift = width / 2 - center * px;
  const frogX = width / 2 + (v - center) * px;
  const frogVisible = frogX > -20 && frogX < width + 20;
  const moved = pan !== 0 || userPx !== null;
  const kind = (t: number) => (t % 100 === 0 ? 'c' : t % 10 === 0 ? 'd' : t % 5 === 0 ? 'five' : 'u');

  const zoom = (factor: number) => setUserPx(clampPx(px * factor));

  const onDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    pointers.current.set(e.pointerId, e.clientX);
    e.currentTarget.setPointerCapture?.(e.pointerId);
    const xs = [...pointers.current.values()];
    gesture.current = { x0: xs[0], pan0: pan, d0: xs.length > 1 ? Math.abs(xs[1] - xs[0]) || 1 : 1, px0: px };
  };
  const onMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(e.pointerId) || !gesture.current) return;
    pointers.current.set(e.pointerId, e.clientX);
    const xs = [...pointers.current.values()];
    const g = gesture.current;
    if (xs.length > 1) {
      // Deux doigts : on rapproche ou on éloigne la règle.
      dragged.current = true;
      setUserPx(clampPx((g.px0 * Math.abs(xs[1] - xs[0])) / g.d0));
      return;
    }
    const dx = xs[0] - g.x0;
    if (!dragged.current && Math.abs(dx) < 8) return;
    dragged.current = true;
    setDragging(true);
    setPan(g.pan0 - dx / px);
  };
  const onUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    pointers.current.delete(e.pointerId);
    const xs = [...pointers.current.values()];
    gesture.current = xs.length ? { x0: xs[0], pan0: pan, d0: 1, px0: px } : null;
    if (!xs.length) setDragging(false);
  };

  const stop = (e: { stopPropagation: () => void }) => e.stopPropagation();

  return (
    <div
      className={`ruler-scene ${dragging ? 'dragging' : ''}`}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      onClickCapture={(e) => {
        // Un glissement n'est pas un appui : il ne fait pas bondir la grenouille.
        if (dragged.current) {
          e.stopPropagation();
          dragged.current = false;
        }
      }}
    >
      <svg width={width} height={128} role="img" aria-label={`Règle graduée, la grenouille est sur ${v}`}>
        <g className="ruler-track" style={{ transform: `translateX(${shift}px)`, transitionDuration: dragging ? '0ms' : `${dur * 0.7}ms` }}>
          <line x1={lo * px} x2={hi * px} y1={BASE} y2={BASE} className="ruler-base" />
          {ticks.map((t) => {
            const k = kind(t);
            const h = k === 'c' ? 30 : k === 'd' ? 24 : k === 'five' ? 14 : 9;
            return (
              <g key={t}>
                <line x1={t * px} x2={t * px} y1={BASE} y2={BASE - h} className={`tick ${k}`} />
                {t % label === 0 && (
                  <text x={t * px} y={BASE + 18} className={`tick-label ${k}`} textAnchor="middle">
                    {t}
                  </text>
                )}
              </g>
            );
          })}
          <g className="start-flag">
            <line x1={start * px} x2={start * px} y1={BASE} y2={BASE + 28} />
            <text x={start * px + 4} y={BASE + 34}>
              départ
            </text>
          </g>
          {hops
            .filter((h) => Math.max(h.from, h.to) <= Math.max(v, start) && Math.abs(h.to - h.from) * px >= 6)
            .map((h, i) => {
              const x1 = h.from * px;
              const x2 = h.to * px;
              const lift = Math.min(46, Math.abs(x2 - x1) * 0.6);
              return (
                <g key={`${i}-${h.from}-${h.rank}`} className={`hop ${RANK_CLASS[h.rank]} ${h.comp ? 'comp' : ''}`}>
                  <path d={`M${x1},${BASE - 4} Q${(x1 + x2) / 2},${BASE - 4 - lift * 1.6} ${x2},${BASE - 4}`} />
                  {h.n !== undefined && x2 - x1 >= 14 && (
                    <text x={(x1 + x2) / 2} y={BASE - 4 - lift * 0.8 - 4} textAnchor="middle" className="hop-n">
                      {h.n}
                    </text>
                  )}
                </g>
              );
            })}
        </g>
      </svg>
      {frogVisible && (
        <div className={`frog-wrap ${dragging ? 'still' : ''}`} style={{ left: frogX }}>
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
      )}
      {frogVisible && plus !== undefined && plus > 0 && (
        <span className="plus-chip on ruler-plus" style={{ left: frogX + 26 }}>
          +{plus}
        </span>
      )}
      {flash && frogVisible && (
        <span key={flash.id} className={`ruler-flash ${RANK_CLASS[flash.rank]} ${flash.text ? 'comp' : ''}`} style={{ left: frogX }}>
          {flash.text ?? `+1 ${flash.rank === 1 ? 'dizaine' : 'centaine'} !`}
        </span>
      )}
      <div className="ruler-tools" onPointerDown={stop} onClick={stop}>
        <button className="rt-btn" onClick={() => zoom(0.5)} disabled={px <= MIN_PX} aria-label="Éloigner la règle">
          <Loupe plus={false} />
        </button>
        <button className="rt-btn" onClick={() => zoom(2)} disabled={px >= MAX_PX} aria-label="Rapprocher la règle">
          <Loupe plus />
        </button>
        {moved && (
          <button
            className={`rt-btn home ${frogVisible ? '' : 'pulse'}`}
            onClick={() => {
              setPan(0);
              setUserPx(null);
            }}
            aria-label="Revenir à la grenouille"
          >
            <svg viewBox="0 0 48 40" aria-hidden="true">
              <ellipse cx="24" cy="26" rx="17" ry="12" className="frog-body" />
              <circle cx="15" cy="13" r="6.5" className="frog-body" />
              <circle cx="33" cy="13" r="6.5" className="frog-body" />
              <circle cx="15" cy="12" r="3.6" fill="#fff" />
              <circle cx="33" cy="12" r="3.6" fill="#fff" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

/** Règle graduée : l'enfant tape pour faire chaque bond de la grenouille (1, puis 10, puis 100). */
export default function Ruler({ lesson, step, dur, gesture }: VisualProps) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const play = useSound();
  const s = lesson.steps[step];
  const [flash, setFlash] = useState<{ id: number; rank: number; text?: string } | null>(null);
  const { taps, need, tap } = useTaps(step, gesture, dur * 0.9);
  const unit = gesture?.next.kind === 'add' ? gesture.next.unit : 0;
  const v = s.value + taps * unit;

  // Le zoom suit la taille des bonds en cours (la fin garde celui du dernier bond).
  const zoomUnit = unit || (s.kind === 'done' ? lesson.steps[step - 1].unit : s.unit);

  const hops = useMemo(() => {
    const list: Hop[] = [];
    let p = lesson.ex.a;
    digitsOf(lesson.ex.b).forEach((d, rank) => {
      list.push(...hopRun(p, d, rank));
      p += d * 10 ** rank;
    });
    return list;
  }, [lesson]);

  const onTap = () => {
    if (!gesture) return;
    if (need === 0) return gesture.onWrong();
    if (!tap()) return;
    const next = v + unit;
    if (Math.floor(next / (unit * 10)) > Math.floor(v / (unit * 10))) {
      // On arrive sur la dizaine : on montre le complément, « 47 + 3 = 50 ».
      setFlash({ id: Date.now(), rank: Math.round(Math.log10(unit)) + 1, text: `${s.value} + ${next - s.value} = ${next}` });
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
            plus={taps * unit}
          />
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
