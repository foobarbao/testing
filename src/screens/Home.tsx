import Avatar from '../components/Avatar';
import { Frog, Star } from '../components/Icons';
import { currentProfile, useProfiles } from '../lib/profiles';
import { LEVELS, STARS_PER_LEVEL } from '../engine/levels';
import type { Prefs } from '../lib/storage';

interface Props {
  prefs: Prefs;
  onAddition: () => void;
  onMyCalc: () => void;
  onBuild: () => void;
  onTen: () => void;
  onPlayers: () => void;
}

export default function Home({ prefs, onAddition, onMyCalc, onBuild, onTen, onPlayers }: Props) {
  const { state } = useProfiles();
  const me = currentProfile(state);
  const total = LEVELS.reduce((acc, l) => acc + Math.min(STARS_PER_LEVEL, prefs.stars[l.id] ?? 0), 0);
  const max = LEVELS.length * STARS_PER_LEVEL;
  return (
    <main className="screen home">
      <header className="home-head">
        <Frog className="home-frog" />
        <h1>La retenue</h1>
        <button className="me-chip" onClick={onPlayers} aria-label={me ? `Joueur : ${me.name}. Changer` : 'Qui joue ?'}>
          <Avatar profile={me} size={48} ring={me?.color} />
          <span>{me ? me.name : 'Qui joue ?'}</span>
        </button>
      </header>

      <div className="op-grid">
        <button className="op-card add" onClick={onAddition}>
          <span className="op-sign" aria-hidden="true">+</span>
          <span className="op-name">Addition</span>
          <span className="op-stars">
            <Star filled className="op-star" /> {total} / {max}
          </span>
          <span className="level-stars" aria-label={`${total} étoiles sur ${max}`}>
            {LEVELS.map((l) => (
              <span key={l.id} className="mini-level">
                {Array.from({ length: STARS_PER_LEVEL }, (_, i) => (
                  <i key={i} className={i < (prefs.stars[l.id] ?? 0) ? 'on' : ''} />
                ))}
              </span>
            ))}
          </span>
        </button>

        <button className="op-card mine" onClick={onMyCalc}>
          <span className="op-sign" aria-hidden="true">
            <svg viewBox="0 0 32 32" width="44" height="44">
              <path d="M7 25l2-7L21 6l5 5-12 12z" fill="currentColor" />
              <path d="M6 27h20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </span>
          <span className="op-name">Mon calcul</span>
          <span className="op-hint">Le calcul des devoirs</span>
        </button>

        <button className="op-card ten" onClick={onTen}>
          <span className="op-sign" aria-hidden="true">
            <svg viewBox="0 0 64 30" width="50" height="24">
              {Array.from({ length: 10 }, (_, i) => (
                <circle key={i} cx={8 + (i % 5) * 12} cy={i < 5 ? 8 : 22} r={4.8} fill={i < 7 ? 'currentColor' : 'var(--star)'} />
              ))}
            </svg>
          </span>
          <span className="op-name">Fais 10 !</span>
          <span className="op-hint">Le jeu des compléments</span>
        </button>

        <button className="op-card small build" onClick={onBuild}>
          <span className="op-sign small" aria-hidden="true">
            <svg viewBox="0 0 32 32" width="34" height="34">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
                <rect key={i} x={4 + i * 1.3} y={6} width={1} height={20} fill="currentColor" />
              ))}
              <rect x="3" y="14" width="15" height="4" rx="2" fill="currentColor" />
              {[0, 1, 2].map((i) => (
                <rect key={i} x={21 + i * 3.6} y={6} width={2.2} height={20} rx={1.1} fill="currentColor" />
              ))}
            </svg>
          </span>
          <span className="op-name">Construis le nombre</span>
          <span className="op-hint">Fagots, pièces, perles</span>
        </button>

        <button className="op-card small sub" disabled aria-disabled="true">
          <span className="op-sign small" aria-hidden="true">−</span>
          <span className="op-name">Soustraction</span>
          <span className="op-hint">Bientôt</span>
        </button>
      </div>
    </main>
  );
}
