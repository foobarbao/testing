import { digitsOf } from '../engine/steps';
import { RANK_CLASS, activeCol, carryStepIndex, type VisualProps } from './common';

const CELL = 46;
const OP = 38;
const ROW = { carry: 2, a: 32, b: 80, rule: 132, res: 138 };

/** L'addition posée en colonnes, avec la retenue qui s'envole. */
export default function Posee({ lesson, step }: VisualProps) {
  const s = lesson.steps[step];
  const { n } = lesson;
  const act = activeCol(s);
  const da = digitsOf(lesson.ex.a);
  const db = digitsOf(lesson.ex.b);
  const x = (c: number) => OP + (n - 1 - c) * CELL;

  return (
    <div className="vis posee-vis">
      <div className="posee" style={{ width: OP + n * CELL, height: ROW.res + 50 }}>
        {Array.from({ length: n }, (_, c) => (
          <div key={`h${c}`} className={`pcol ${RANK_CLASS[c]} ${act === c ? 'hl' : ''}`} style={{ left: x(c) }} />
        ))}
        {da.map((d, c) => (
          <span key={`a${c}`} className={`cell ${RANK_CLASS[c]}`} style={{ left: x(c), top: ROW.a }}>
            {d}
          </span>
        ))}
        <span className="cell op" style={{ left: 0, top: ROW.b }}>
          +
        </span>
        {db.map((d, c) => (
          <span key={`b${c}`} className={`cell ${RANK_CLASS[c]}`} style={{ left: x(c), top: ROW.b }}>
            {d}
          </span>
        ))}
        <div className="rule" style={{ top: ROW.rule }} />
        {s.cols.map((cs, c) => (
          <span
            key={`r${c}`}
            className={`cell res ${RANK_CLASS[c]} ${cs.result !== null ? 'on' : ''}`}
            style={{ left: x(c), top: ROW.res }}
          >
            {cs.result ?? ''}
          </span>
        ))}
        {Array.from({ length: n - 1 }, (_, i) => {
          // Retenue qui part de la colonne i vers la colonne i + 1.
          const at = carryStepIndex(lesson, i);
          if (at < 0) return null;
          const on = step >= at;
          return (
            <span
              key={`k${i}`}
              className={`carry-digit ${on ? 'on' : ''}`}
              style={on ? { left: x(i + 1), top: ROW.carry } : { left: x(i) - 14, top: ROW.res + 4 }}
            >
              1
            </span>
          );
        })}
      </div>
      <p className="posee-note" aria-live="polite">
        {s.note.map((seg, i) => (
          <span key={i} className={seg.tone ? `t-${seg.tone}` : undefined}>
            {seg.t}
          </span>
        ))}
      </p>
    </div>
  );
}
