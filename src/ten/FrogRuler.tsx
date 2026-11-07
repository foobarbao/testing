import { useWidth } from '../lib/hooks';

interface Props {
  /** Première graduation (0, ou 40 pour aller de 47 à 50). */
  base: number;
  start: number;
  /** Bonds déjà faits par l'enfant. */
  hops: number;
  target: number;
  locked: boolean;
  onHop: () => void;
}

const M = 22;

/** Règle de 10 graduations : chaque appui fait un bond, numéroté, et le total « +3 » s'affiche. */
export default function FrogRuler({ base, start, hops, target, locked, onHop }: Props) {
  const [ref, width] = useWidth<HTMLButtonElement>();
  const step = (width - 2 * M) / 10;
  const x = (v: number) => M + (v - base) * step;
  const at = start + hops;
  return (
    <button ref={ref} className={`frog-ruler ${locked ? '' : 'tappable'}`} onClick={onHop} disabled={locked} aria-label={`La grenouille est sur ${at}. Touche pour faire un bond.`}>
      {width > 0 && (
        <svg width={width} height={150} aria-hidden="true">
          <line x1={M - 8} x2={width - M + 8} y1={110} y2={110} className="ruler-base" />
          {Array.from({ length: 11 }, (_, i) => {
            const v = base + i;
            const isTarget = v === target;
            return (
              <g key={i}>
                <line x1={x(v)} x2={x(v)} y1={110} y2={isTarget ? 78 : i === 5 ? 96 : 100} className={`tick ${isTarget ? 'goal' : ''}`} />
                <text x={x(v)} y={132} textAnchor="middle" className={`fr-label ${isTarget ? 'goal' : v === start ? 'start' : ''}`}>
                  {v}
                </text>
              </g>
            );
          })}
          {Array.from({ length: hops }, (_, j) => {
            const x1 = x(start + j);
            const x2 = x(start + j + 1);
            return (
              <g key={j} className="fr-hop">
                <path d={`M${x1},106 Q${(x1 + x2) / 2},${70} ${x2},106`} />
                <text x={(x1 + x2) / 2} y={80} textAnchor="middle">
                  {j + 1}
                </text>
              </g>
            );
          })}
        </svg>
      )}
      {width > 0 && (
        <span className="fr-frog" style={{ left: x(at) }}>
          <span className={`plus-chip ${hops ? 'on' : ''}`}>+{hops}</span>
          <svg key={at} className="frog" viewBox="0 0 48 40" aria-hidden="true">
            <ellipse cx="24" cy="26" rx="17" ry="12" className="frog-body" />
            <circle cx="15" cy="13" r="6.5" className="frog-body" />
            <circle cx="33" cy="13" r="6.5" className="frog-body" />
            <circle cx="15" cy="12" r="3.6" fill="#fff" />
            <circle cx="33" cy="12" r="3.6" fill="#fff" />
            <circle cx="16" cy="13" r="1.8" fill="#1D2742" />
            <circle cx="34" cy="13" r="1.8" fill="#1D2742" />
            <path d="M17 28q7 5 14 0" fill="none" stroke="#1D2742" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
        </span>
      )}
    </button>
  );
}
