import type { ReactNode } from 'react';
import type { Lesson } from '../engine/types';
import { RANK_CLASS, RANK_LABEL, activeCol, colCount, colLeft } from './common';
import type { Extra, Placed } from './pieces';

interface ColumnsProps {
  lesson: Lesson;
  step: number;
  width: number;
  height: number;
  children?: ReactNode;
  /** Masquer les pastilles de comptage (pour le boulier par exemple). */
  counts?: boolean;
}

/** Fond commun des visuels en colonnes : titres, surbrillance, pastilles. */
export function Columns({ lesson, step, width, height, children, counts = true }: ColumnsProps) {
  const s = lesson.steps[step];
  const act = activeCol(s);
  const colW = width / lesson.n;
  return (
    <div className="board" style={{ height }}>
      {s.cols.map((cs, c) => {
        const count = colCount(s, c);
        return (
          <div
            key={c}
            className={`board-col ${RANK_CLASS[c]} ${act === c ? 'hl' : ''}`}
            style={{ left: colLeft(c, lesson.n, width) + 2, width: colW - 4 }}
          >
            <span className="board-head">{RANK_LABEL[cs.rank]}</span>
            {counts && <span className={`board-count ${count !== null ? 'on' : ''}`}>{count ?? ''}</span>}
          </div>
        );
      })}
      {children}
    </div>
  );
}

export function Pieces({ items, render }: { items: Placed[]; render?: (p: Placed) => ReactNode }) {
  return (
    <>
      {items.map((p) => (
        <div
          key={p.key}
          className={`pc r${p.rank} ${p.cls}`}
          style={{ transform: `translate(${p.x}px, ${p.y}px)`, width: p.w, height: p.h }}
        >
          {render?.(p)}
        </div>
      ))}
    </>
  );
}

export function Extras({ extras }: { extras: Extra[] }) {
  return (
    <>
      {extras.map((e) =>
        e.kind === 'band' ? (
          <div key={e.key} className="band" style={{ transform: `translate(${e.x}px, ${e.y}px)`, width: e.w }} />
        ) : (
          <div key={e.key} className={`bank ${e.side ?? 'right'}`} style={{ left: e.x, top: e.y }}>
            {e.label}
          </div>
        ),
      )}
    </>
  );
}
