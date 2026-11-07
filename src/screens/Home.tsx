import { Frog, Star } from '../components/Icons';
import { LEVELS, STARS_PER_LEVEL } from '../engine/levels';
import type { Prefs } from '../lib/storage';

interface Props {
  prefs: Prefs;
  onAddition: () => void;
}

export default function Home({ prefs, onAddition }: Props) {
  const total = LEVELS.reduce((acc, l) => acc + Math.min(STARS_PER_LEVEL, prefs.stars[l.id] ?? 0), 0);
  const max = LEVELS.length * STARS_PER_LEVEL;
  return (
    <main className="screen home">
      <header className="home-head">
        <Frog className="home-frog" />
        <div>
          <h1>La retenue</h1>
          <p>Choisis une opération</p>
        </div>
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
        <button className="op-card sub" disabled aria-disabled="true">
          <span className="op-sign" aria-hidden="true">−</span>
          <span className="op-name">Soustraction</span>
          <span className="op-soon">Bientôt</span>
        </button>
      </div>
    </main>
  );
}
