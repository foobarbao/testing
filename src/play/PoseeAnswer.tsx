import { useEffect, useRef, useState } from 'react';
import { useSay } from '../lib/speech';
import { digitsOf } from '../engine/steps';
import type { Lesson } from '../engine/types';
import { Ghost, inside, useDrag } from '../lib/drag';
import { RANK_CLASS } from '../visuals/common';

const CELL = 46;
const OP = 38;

type Slot = { kind: 'res' | 'carry'; c: number };

interface Props {
  lesson: Lesson;
  solved: boolean;
  onAnswer: (value: number) => boolean;
  onIncomplete: () => void;
}

/**
 * L'enfant écrit lui-même l'addition posée : il glisse (ou touche) des chiffres
 * dans les cases du résultat, en commençant par les unités, et peut noter la retenue.
 */
export default function PoseeAnswer({ lesson, solved, onAnswer, onIncomplete }: Props) {
  const { n } = lesson;
  const da = digitsOf(lesson.ex.a);
  const db = digitsOf(lesson.ex.b);
  const [res, setRes] = useState<(number | null)[]>(() => Array(n).fill(null));
  const [carry, setCarry] = useState<(number | null)[]>(() => Array(n).fill(null));
  const [sel, setSel] = useState<Slot>({ kind: 'res', c: 0 });
  const slotRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const say = useSay();
  useEffect(() => {
    say("Commence par les unités. La petite case orange, c'est pour la retenue.");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const x = (c: number) => OP + (n - 1 - c) * CELL;
  const keyOf = (s: Slot) => `${s.kind}${s.c}`;

  const fill = (slot: Slot, d: number) => {
    if (solved) return;
    if (slot.kind === 'res') {
      setRes((r) => r.map((v, c) => (c === slot.c ? d : v)));
      // On avance vers la colonne de gauche, comme on écrit une addition posée.
      const next = slot.c + 1;
      setSel(next < n && res[next] === null ? { kind: 'res', c: next } : slot);
    } else {
      setCarry((r) => r.map((v, c) => (c === slot.c ? d : v)));
      setSel({ kind: 'res', c: slot.c });
    }
  };

  const { drag, start } = useDrag<number>({
    onTap: (d) => fill(sel, d),
    onDrop: (d, px, py) => {
      for (const [key, el] of Object.entries(slotRefs.current)) {
        if (inside(el, px, py, 6)) {
          const slot: Slot = { kind: key.startsWith('res') ? 'res' : 'carry', c: Number(key.replace(/\D/g, '')) };
          setSel(slot);
          fill(slot, d);
          return;
        }
      }
    },
  });

  const erase = () => {
    if (sel.kind === 'res') setRes((r) => r.map((v, c) => (c === sel.c ? null : v)));
    else setCarry((r) => r.map((v, c) => (c === sel.c ? null : v)));
  };

  const validate = () => {
    if (res.some((v) => v === null)) return onIncomplete();
    onAnswer(res.reduce<number>((acc, v, c) => acc + (v ?? 0) * 10 ** c, 0));
  };

  const slotBtn = (slot: Slot, top: number, value: number | null) => {
    const on = sel.kind === slot.kind && sel.c === slot.c;
    return (
      <button
        key={keyOf(slot)}
        ref={(el) => {
          slotRefs.current[keyOf(slot)] = el;
        }}
        className={`slot s-${slot.kind} ${RANK_CLASS[slot.c]} ${on ? 'on' : ''} ${value !== null ? 'filled' : ''}`}
        style={{ left: x(slot.c) + (slot.kind === 'carry' ? 9 : 3), top }}
        onClick={() => setSel(slot)}
        aria-label={slot.kind === 'res' ? `Case du résultat, colonne ${slot.c + 1}` : `Case de la retenue, colonne ${slot.c + 1}`}
        disabled={solved}
      >
        {value ?? ''}
      </button>
    );
  };

  return (
    <div className="pose-answer">
      <div className="posee" style={{ width: OP + n * CELL, height: 190 }}>
        {da.map((d, c) => (
          <span key={`a${c}`} className={`cell ${RANK_CLASS[c]}`} style={{ left: x(c), top: 34 }}>
            {d}
          </span>
        ))}
        <span className="cell op" style={{ left: 0, top: 82 }}>
          +
        </span>
        {db.map((d, c) => (
          <span key={`b${c}`} className={`cell ${RANK_CLASS[c]}`} style={{ left: x(c), top: 82 }}>
            {d}
          </span>
        ))}
        <div className="rule" style={{ top: 134 }} />
        {Array.from({ length: n - 1 }, (_, i) => slotBtn({ kind: 'carry', c: i + 1 }, 2, carry[i + 1]))}
        {res.map((v, c) => slotBtn({ kind: 'res', c }, 140, v))}
      </div>
      <div className="tiles">
        {Array.from({ length: 10 }, (_, d) => (
          <button key={d} className="tile" onPointerDown={(e) => !solved && start(d, e)} disabled={solved}>
            {d}
          </button>
        ))}
      </div>
      {!solved && (
        <div className="row-2">
          <button className="btn" onClick={erase}>
            Effacer
          </button>
          <button className="btn primary" onClick={validate}>
            Valider
          </button>
        </div>
      )}
      <Ghost drag={drag}>
        <span className="tile ghost-tile">{drag?.item}</span>
      </Ghost>
    </div>
  );
}
