import type { VisualId } from '../lib/storage';

type P = { className?: string };

export const Back = ({ className }: P) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M15 5l-7 7 7 7" />
  </svg>
);

export const Replay = ({ className }: P) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 12a8 8 0 1 0 2.5-5.8" />
    <path d="M4 4v4h4" />
  </svg>
);

export const Speaker = ({ className, off }: P & { off?: boolean }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 10v4h4l5 4V6L8 10z" fill="currentColor" />
    {off ? <path d="M17 9l5 6M22 9l-5 6" /> : <path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11" />}
  </svg>
);

export const Note = ({ className, off }: P & { off?: boolean }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M9 18V6l10-2v12" />
    <circle cx="6.5" cy="18" r="2.5" fill="currentColor" />
    <circle cx="16.5" cy="16" r="2.5" fill="currentColor" />
    {off && <path d="M3 3l18 18" />}
  </svg>
);

export const Gauge = ({ className }: P) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
    <path d="M4 16a8 8 0 1 1 16 0" />
    <path d="M12 16l4-5" />
  </svg>
);

export const Star = ({ className, filled }: P & { filled?: boolean }) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M12 2.5l2.9 6 6.6.8-4.9 4.6 1.3 6.6L12 17.2l-5.9 3.3 1.3-6.6L2.5 9.3l6.6-.8z"
      fill={filled ? 'var(--star)' : 'var(--line)'}
    />
  </svg>
);

export const Frog = ({ className }: P) => (
  <svg className={className} viewBox="0 0 48 48" aria-hidden="true">
    <ellipse cx="24" cy="29" rx="18" ry="15" fill="var(--units)" />
    <circle cx="15.5" cy="16" r="7.5" fill="var(--units)" />
    <circle cx="32.5" cy="16" r="7.5" fill="var(--units)" />
    <circle cx="15.5" cy="15" r="4.2" fill="#fff" />
    <circle cx="32.5" cy="15" r="4.2" fill="#fff" />
    <circle cx="16.5" cy="16" r="2.1" fill="#1D2742" />
    <circle cx="33.5" cy="16" r="2.1" fill="#1D2742" />
    <path d="M16 32q8 6 16 0" fill="none" stroke="#1D2742" strokeWidth="2.4" strokeLinecap="round" />
    <circle cx="11" cy="28" r="2.5" fill="#F7A6B8" opacity=".7" />
    <circle cx="37" cy="28" r="2.5" fill="#F7A6B8" opacity=".7" />
  </svg>
);

/** Petites illustrations pour choisir un visuel. */
export function VisualIcon({ id }: { id: VisualId }) {
  switch (id) {
    case 'sticks':
      return (
        <svg viewBox="0 0 64 48" className="vicon" aria-hidden="true">
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
            <rect key={i} x={6 + i * 1.6} y={8} width={1.2} height={32} fill="var(--tens)" />
          ))}
          <rect x={4} y={21} width={20} height={5} rx={2.5} fill="var(--tens-dark)" />
          {[0, 1, 2, 3].map((i) => (
            <rect key={i} x={34 + i * 7} y={8} width={4} height={32} rx={2} fill="var(--units)" />
          ))}
        </svg>
      );
    case 'posee':
      return (
        <svg viewBox="0 0 64 48" className="vicon" aria-hidden="true">
          <text x="31" y="9" className="vicon-t" fill="var(--carry)" fontSize="10">1</text>
          <text x="30" y="22" className="vicon-t" fill="var(--tens)">4</text>
          <text x="44" y="22" className="vicon-t" fill="var(--units)">7</text>
          <text x="14" y="36" className="vicon-t" fill="var(--muted)">+</text>
          <text x="30" y="36" className="vicon-t" fill="var(--tens)">2</text>
          <text x="44" y="36" className="vicon-t" fill="var(--units)">8</text>
          <rect x="12" y="40" width="44" height="3" rx="1.5" fill="var(--ink)" />
        </svg>
      );
    case 'ruler':
      return (
        <svg viewBox="0 0 64 48" className="vicon" aria-hidden="true">
          <rect x="2" y="34" width="60" height="3" fill="var(--ink)" />
          {Array.from({ length: 13 }, (_, i) => (
            <rect key={i} x={3 + i * 5} y={i % 10 === 4 ? 24 : 30} width={i % 10 === 4 ? 2 : 1.4} height={i % 10 === 4 ? 10 : 4} fill={i % 10 === 4 ? 'var(--carry)' : 'var(--ink)'} />
          ))}
          <path d="M8 30 Q15 12 23 30 M23 30 Q30 12 38 30" fill="none" stroke="var(--units)" strokeWidth="2" />
          <circle cx="44" cy="24" r="6" fill="var(--units)" />
        </svg>
      );
    case 'gears':
      return (
        <svg viewBox="0 0 64 48" className="vicon" aria-hidden="true">
          <circle cx="20" cy="24" r="14" fill="none" stroke="var(--tens)" strokeWidth="5" strokeDasharray="4 3" />
          <circle cx="20" cy="24" r="8" fill="var(--tens)" />
          <circle cx="45" cy="24" r="12" fill="none" stroke="var(--units)" strokeWidth="5" strokeDasharray="4 3" />
          <circle cx="45" cy="24" r="6" fill="var(--units)" />
          <rect x="31" y="20" width="5" height="8" rx="2" fill="var(--carry)" />
        </svg>
      );
    case 'abacus':
      return (
        <svg viewBox="0 0 64 48" className="vicon" aria-hidden="true">
          <rect x="6" y="4" width="52" height="40" rx="5" fill="none" stroke="var(--muted)" strokeWidth="2.5" />
          {[20, 42].map((x, c) => (
            <g key={x}>
              <rect x={x - 1} y={6} width={2} height={36} fill="var(--muted)" />
              {Array.from({ length: c ? 5 : 3 }, (_, i) => (
                <ellipse key={i} cx={x} cy={38 - i * 6} rx={8} ry={3} fill={c ? 'var(--units)' : 'var(--tens)'} />
              ))}
            </g>
          ))}
        </svg>
      );
    case 'money':
      return (
        <svg viewBox="0 0 64 48" className="vicon" aria-hidden="true">
          <rect x="4" y="12" width="30" height="18" rx="3" fill="var(--tens)" />
          <text x="19" y="25" textAnchor="middle" fontSize="9" fontWeight="700" fill="#fff">10 €</text>
          {[0, 1, 2].map((i) => (
            <g key={i}>
              <circle cx={46 + (i % 2) * 8} cy={16 + i * 10} r={7} fill="var(--coin)" stroke="var(--coin-edge)" strokeWidth="1.5" />
              <text x={46 + (i % 2) * 8} y={19 + i * 10} textAnchor="middle" fontSize="7" fontWeight="700" fill="var(--coin-ink)">1€</text>
            </g>
          ))}
        </svg>
      );
  }
}
