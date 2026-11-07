import { Back, VisualIcon } from '../components/Icons';
import { LEVELS } from '../engine/levels';
import type { VisualId } from '../lib/storage';
import { VISUALS } from '../visuals';

interface Props {
  level: number;
  selected: VisualId[];
  onChange: (v: VisualId[]) => void;
  onBack: () => void;
  onStart: () => void;
}

/** Ajoute ou retire un visuel : deux au maximum, au moins un. */
export function toggleVisual(selected: VisualId[], id: VisualId): VisualId[] {
  if (selected.includes(id)) return selected.length > 1 ? selected.filter((v) => v !== id) : selected;
  return [...selected, id].slice(-2);
}

export default function Picker({ level, selected, onChange, onBack, onStart }: Props) {
  const info = LEVELS.find((l) => l.id === level);
  return (
    <main className="screen">
      <header className="bar">
        <button className="icon-btn" onClick={onBack} aria-label="Retour aux niveaux">
          <Back />
        </button>
        <h1 className="bar-title">
          {info?.title} <span className="bar-sub">{info?.hint}</span>
        </h1>
      </header>
      <p className="screen-lead">Choisis un ou deux visuels</p>
      <div className="picker-grid">
        {VISUALS.map((v) => {
          const on = selected.includes(v.id);
          return (
            <button
              key={v.id}
              className={`picker-card ${on ? 'on' : ''}`}
              aria-pressed={on}
              onClick={() => onChange(toggleVisual(selected, v.id))}
            >
              <VisualIcon id={v.id} />
              <b>{v.name}</b>
              <span>{v.hint}</span>
              {on && <i className="picker-check">{selected.indexOf(v.id) + 1}</i>}
            </button>
          );
        })}
      </div>
      <p className="picker-tip">Avec deux visuels, ils avancent ensemble, étape par étape.</p>
      <button className="btn primary big" onClick={onStart}>
        C'est parti !
      </button>
    </main>
  );
}
