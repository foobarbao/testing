import { useMemo, useState } from 'react';
import { useHops, useWidth } from '../lib/hooks';
import { useSound } from '../lib/sound';
import { RANK_CLASS, RANK_LABEL, activeCol, type VisualProps } from './common';

const TEETH = 10;

function gearPath(r: number, depth: number) {
  // Une dent par chiffre : sommet plat, flancs inclinés.
  const pts: string[] = [];
  const step = (Math.PI * 2) / TEETH;
  for (let i = 0; i < TEETH; i++) {
    const a = i * step - Math.PI / 2 + step / 2;
    const seq: [number, number][] = [
      [a - step * 0.5, r - depth],
      [a - step * 0.3, r - depth],
      [a - step * 0.18, r],
      [a + step * 0.18, r],
      [a + step * 0.3, r - depth],
    ];
    seq.forEach(([ang, rad]) => pts.push(`${(Math.cos(ang) * rad).toFixed(2)},${(Math.sin(ang) * rad).toFixed(2)}`));
  }
  return `M${pts.join('L')}Z`;
}

/** Compteur à roues dentées : quand les unités passent de 9 à 0, la dent orange fait avancer les dizaines. */
export default function Gears({ lesson, step, dur }: VisualProps) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const play = useSound();
  const s = lesson.steps[step];
  const [clic, setClic] = useState<{ id: number; rank: number } | null>(null);
  const v = useHops(s.value, s.unit, dur * 0.8, lesson.id, (rank) => {
    setClic({ id: Date.now(), rank });
    play('click');
  });
  const { n } = lesson;
  const act = activeCol(s);

  const colW = width / n;
  const r = Math.max(30, Math.min(58, colW / 2 - 10));
  const depth = r * 0.16;
  const path = useMemo(() => gearPath(r, depth), [r, depth]);
  const size = r * 2 + 24;

  return (
    <div ref={ref} className="vis gears">
      <div className="odometer" aria-label={`Le compteur affiche ${v}`}>
        {Array.from({ length: n }, (_, i) => {
          const c = n - 1 - i;
          const digit = Math.floor(v / 10 ** c) % 10;
          return (
            <span key={c} className={`odo-digit ${RANK_CLASS[c]}`}>
              <span key={digit} className="odo-roll">
                {digit}
              </span>
            </span>
          );
        })}
      </div>
      {width > 0 && (
        <div className="gear-row">
          {Array.from({ length: n }, (_, i) => {
            const c = n - 1 - i;
            const turns = Math.floor(v / 10 ** c);
            return (
              <div key={c} className={`gear-cell ${act === c ? 'hl' : ''}`} style={{ width: colW }}>
                <span className={`gear-name ${RANK_CLASS[c]}`}>{RANK_LABEL[c]}</span>
                <svg width={size} height={size} viewBox={`${-size / 2} ${-size / 2} ${size} ${size}`} className="gear-svg">
                  <g
                    className={`gear ${RANK_CLASS[c]}`}
                    style={{ transform: `rotate(${-turns * 36}deg)`, transitionDuration: `${dur * 0.6}ms` }}
                  >
                    <path d={path} className="gear-body" />
                    <circle r={r * 0.28} className="gear-hub" />
                    {Array.from({ length: 10 }, (_, d) => {
                      const ang = (d * 36 * Math.PI) / 180;
                      const rr = r - depth - r * 0.2;
                      return (
                        <text
                          key={d}
                          x={Math.sin(ang) * rr}
                          y={-Math.cos(ang) * rr}
                          className="gear-digit"
                          textAnchor="middle"
                          dominantBaseline="central"
                          transform={`rotate(${d * 36} ${Math.sin(ang) * rr} ${-Math.cos(ang) * rr})`}
                        >
                          {d}
                        </text>
                      );
                    })}
                    {c < n - 1 && (
                      // Dent d'entraînement : elle passe à gauche au moment où l'on passe de 9 à 0.
                      <g transform="rotate(252)">
                        <rect x={-4} y={-r - 9} width={8} height={14} rx={3} className="driver" />
                      </g>
                    )}
                  </g>
                  {/* Repère fixe : le chiffre dans l'anneau est celui qu'on lit. */}
                  <circle cx={0} cy={-(r - depth - r * 0.2)} r={11} className="gear-window" />
                  <path d={`M-7,${-r - 10} L7,${-r - 10} L0,${-r - 1}Z`} className="gear-pointer" />
                </svg>
                {clic && clic.rank === c && (
                  <span key={clic.id} className="gear-clic">
                    clic !
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
