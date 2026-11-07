import { useState } from 'react';
import { useSound } from '../lib/sound';
import { RANK_CLASS, RANK_LABEL, activeCol, type VisualProps } from './common';
import { Hand } from './Gesture';
import { useTaps } from './taps';

interface SceneProps {
  n: number;
  v: number;
  /** Chiffre à toucher (pulsation), ou -1. */
  target: number;
  /** Points sous le chiffre à toucher : combien d'appuis attendus, combien faits. */
  dots?: { need: number; done: number };
  hint?: boolean;
  active?: number;
  clic: { id: number; rank: number } | null;
  onTap?: (rank: number) => void;
  onMinus?: (rank: number) => void;
}

/** Compteur à gros chiffres : chaque appui fait tourner un chiffre d'un cran. */
export function CounterScene({ n, v, target, dots, hint, active = -1, clic, onTap, onMinus }: SceneProps) {
  return (
    <div className="counter" aria-label={`Le compteur affiche ${v}`}>
      {Array.from({ length: n }, (_, i) => {
        const c = n - 1 - i;
        const digit = Math.floor(v / 10 ** c) % 10;
        const isTarget = target === c;
        return (
          <div key={c} className={`counter-col ${active === c ? 'hl' : ''}`}>
            <span className={`counter-name t-${['u', 'd', 'c'][c]}`}>{RANK_LABEL[c]}</span>
            <button
              className={`counter-digit ${RANK_CLASS[c]} ${isTarget ? 'target' : ''} ${clic?.rank === c ? 'bump' : ''}`}
              key={clic?.rank === c ? clic.id : undefined}
              onClick={() => onTap?.(c)}
              disabled={!onTap}
              aria-label={`Chiffre des ${RANK_LABEL[c].toLowerCase()} : ${digit}`}
            >
              <span key={digit} className="roll">
                {digit}
              </span>
              {clic?.rank === c && <span className="counter-clic">clic</span>}
            </button>
            {isTarget && dots && dots.need > 0 && (
              <span className="tap-dots" aria-label={`Encore ${dots.need - dots.done}`}>
                {Array.from({ length: dots.need }, (_, k) => (
                  <i key={k} className={k < dots.done ? 'on' : ''} />
                ))}
              </span>
            )}
            {onMinus && (
              <button className="pm-btn" onClick={() => onMinus(c)} aria-label="Reculer d'un cran">
                −
              </button>
            )}
            {isTarget && hint && <Hand x={0} y={40} />}
          </div>
        );
      })}
    </div>
  );
}

/** Le compteur pendant un calcul : l'enfant tape sur le chiffre pour ajouter le second nombre. */
export default function Counter({ lesson, step, dur, gesture }: VisualProps) {
  const play = useSound();
  const s = lesson.steps[step];
  const [clic, setClic] = useState<{ id: number; rank: number } | null>(null);
  const { taps, need, tap } = useTaps(step, gesture, dur * 0.9);
  const unit = gesture?.next.kind === 'add' ? gesture.next.unit : 0;
  const v = s.value + taps * unit;
  const rank = gesture?.next.kind === 'add' ? gesture.next.col : -1;

  const onTap = (c: number) => {
    if (!gesture) return;
    if (c !== rank || need === 0) return gesture.onWrong();
    if (!tap()) return;
    const next = v + unit;
    // Le chiffre passe de 9 à 0 : le chiffre de gauche avance d'un cran.
    if (Math.floor(next / (unit * 10)) > Math.floor(v / (unit * 10))) {
      setClic({ id: Date.now(), rank: c + 1 });
      play('click');
    } else play('pop');
  };

  return (
    <div className="vis counter-vis">
      <CounterScene
        n={lesson.n}
        v={v}
        target={rank}
        dots={{ need, done: taps }}
        hint={gesture?.hint}
        active={gesture ? -1 : activeCol(s)}
        clic={clic}
        onTap={gesture ? onTap : undefined}
      />
    </div>
  );
}
