import type { ContestScore, Medal, Profile, Trophy } from '../lib/profiles';
import { formatTime } from '../lib/profiles';
import Avatar from './Avatar';

export const MEDAL_COLOR: Record<Medal, { fill: string; edge: string }> = {
  bronze: { fill: '#D08A4E', edge: '#9A5A27' },
  argent: { fill: '#C9D2DE', edge: '#8793A6' },
  or: { fill: '#F5C33B', edge: '#B98A10' },
  diamant: { fill: '#7FD8F2', edge: '#2E9CC0' },
};

export function MedalIcon({ medal, size = 48 }: { medal: Medal; size?: number }) {
  const c = MEDAL_COLOR[medal];
  return (
    <svg viewBox="0 0 48 60" width={size} height={size * 1.25} className="medal-icon" aria-hidden="true">
      <path d="M12 0h10l6 20h-10z" fill="#E0444B" />
      <path d="M36 0H26l-6 20h10z" fill="#2B74D9" />
      <circle cx="24" cy="38" r="20" fill={c.fill} stroke={c.edge} strokeWidth="3" />
      {medal === 'diamant' ? (
        <path d="M16 34l4-6h8l4 6-8 11z" fill="#fff" opacity=".9" />
      ) : (
        <path d="M24 26l3.5 7 7.5 1-5.5 5 1.5 7.5L24 43l-7 3.5 1.5-7.5-5.5-5 7.5-1z" fill="#fff" opacity=".85" />
      )}
    </svg>
  );
}

export function Crown({ size = 64 }: { size?: number }) {
  return (
    <svg viewBox="0 0 64 40" width={size} height={size * 0.62} className="crown" aria-hidden="true">
      <path d="M4 36L8 8l14 14L32 2l10 20L56 8l4 28z" fill="#F5C33B" stroke="#B98A10" strokeWidth="2.5" strokeLinejoin="round" />
      <circle cx="32" cy="24" r="4" fill="#E0444B" />
      <circle cx="16" cy="28" r="3" fill="#2B74D9" />
      <circle cx="48" cy="28" r="3" fill="#23995A" />
    </svg>
  );
}

const TROPHY_ART: Record<string, string> = {
  first: '1',
  p10: '10',
  p20: '20',
  p30: '30',
  perfect: '✓',
  flash: '30s',
  gold: '★',
  hundred: '100',
  marathon: '∞',
};

export function TrophyBadge({ trophy, earned, fresh }: { trophy: Trophy; earned: boolean; fresh?: boolean }) {
  return (
    <div className={`trophy ${earned ? 'earned' : ''} ${fresh ? 'fresh' : ''}`} title={trophy.hint}>
      <svg viewBox="0 0 48 48" className="trophy-cup" aria-hidden="true">
        <path d="M12 6h24v10c0 8-5 14-12 14S12 24 12 16z" className="cup" />
        <path d="M12 10H5c0 7 3 11 8 11M36 10h7c0 7-3 11-8 11" className="cup-ear" />
        <rect x="20" y="30" width="8" height="7" className="cup" />
        <rect x="14" y="37" width="20" height="6" rx="2" className="cup" />
        <text x="24" y="21" textAnchor="middle" className="cup-text">
          {TROPHY_ART[trophy.id] ?? '★'}
        </text>
      </svg>
      <span className="trophy-name">{trophy.name}</span>
    </div>
  );
}

/** Podium des trois meilleurs, avec leurs photos. */
export function Podium({ rows, highlight }: { rows: { profile: Profile; best: ContestScore }[]; highlight?: string }) {
  if (!rows.length) return null;
  const order = [rows[1], rows[0], rows[2]];
  const heights = [70, 100, 50];
  const ranks = [2, 1, 3];
  return (
    <div className="podium" aria-label="Podium">
      {order.map((r, i) =>
        r ? (
          <div key={r.profile.id} className={`podium-spot ${highlight === r.profile.id ? 'me' : ''}`}>
            {ranks[i] === 1 && <Crown size={44} />}
            <Avatar profile={r.profile} size={ranks[i] === 1 ? 72 : 56} ring={r.profile.color} />
            <span className="podium-name">{r.profile.name}</span>
            <span className="podium-score">{r.best.mode === 'chrono' ? `${r.best.pairs} paires` : formatTime(r.best.ms)}</span>
            <div className={`podium-step s${ranks[i]}`} style={{ height: heights[i] }}>
              {ranks[i]}
            </div>
          </div>
        ) : (
          <div key={`empty${i}`} className="podium-spot empty" />
        ),
      )}
    </div>
  );
}
