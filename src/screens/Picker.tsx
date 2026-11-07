import { Back, VisualIcon } from '../components/Icons';
import { LEVELS } from '../engine/levels';
import type { VisualId } from '../lib/storage';
import { VISUALS } from '../visuals';

interface Props {
  level: number;
  selected: VisualId;
  onChange: (v: VisualId) => void;
  onBack: () => void;
  onStart: () => void;
}

/** Choix du visuel de départ (on pourra en changer pendant l'exercice). */
export default function Picker({ level, selected, onChange, onBack, onStart }: Props) {
  const info = LEVELS.find((l) => l.id === level);
  return (
    <main className="screen">
      <header className="bar">
        <button className="icon-btn" onClick={onBack} aria-label="Retour aux niveaux">
          <Back />
        </button>
        <h1 className="bar-title">{info?.title}</h1>
      </header>
      <p className="screen-lead">Choisis ton visuel</p>
      <div className="picker-grid">
        {VISUALS.map((v) => (
          <button
            key={v.id}
            className={`picker-card ${selected === v.id ? 'on' : ''}`}
            aria-pressed={selected === v.id}
            onClick={() => onChange(v.id)}
          >
            <VisualIcon id={v.id} />
            <b>{v.name}</b>
          </button>
        ))}
      </div>
      <button className="btn primary big" onClick={onStart}>
        C'est parti !
      </button>
    </main>
  );
}
