import { Back, Star } from '../components/Icons';
import { LEVELS, STARS_PER_LEVEL } from '../engine/levels';
import type { Prefs } from '../lib/storage';

interface Props {
  prefs: Prefs;
  onBack: () => void;
  onPick: (level: number) => void;
}

export default function Levels({ prefs, onBack, onPick }: Props) {
  return (
    <main className="screen">
      <header className="bar">
        <button className="icon-btn" onClick={onBack} aria-label="Retour">
          <Back />
        </button>
        <h1 className="bar-title">Addition</h1>
      </header>
      <p className="screen-lead">Choisis ton niveau</p>
      <div className="level-list">
        {LEVELS.map((l) => {
          const won = Math.min(STARS_PER_LEVEL, prefs.stars[l.id] ?? 0);
          return (
            <button key={l.id} className={`level-card l${l.id}`} onClick={() => onPick(l.id)}>
              <span className="level-num">{l.id}</span>
              <span className="level-text">
                <b>{l.hint}</b>
                <span className="level-ex">{l.example}</span>
              </span>
              <span className="stars" aria-label={`${won} étoiles sur ${STARS_PER_LEVEL}`}>
                {Array.from({ length: STARS_PER_LEVEL }, (_, i) => (
                  <Star key={i} filled={i < won} />
                ))}
              </span>
            </button>
          );
        })}
      </div>
    </main>
  );
}
