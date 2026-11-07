import type { ReactNode } from 'react';
import type { Lesson } from '../engine/types';
import { RANK_CLASS, RANK_LABEL, activeCol, colCount, colLeft } from './common';
import type { Extra, Placed } from './pieces';

interface FrameProps {
  n: number;
  width: number;
  height: number;
  /** Colonne en surbrillance, ou -1. */
  active: number;
  /** Nombre affiché dans la pastille de chaque colonne (null = pas de pastille). */
  counts?: (number | null)[];
  /** Colonne à faire clignoter (indice pour l'enfant). */
  hint?: number;
  children?: ReactNode;
}

/** Fond commun des visuels en colonnes : titres, surbrillance, pastilles. */
export function ColumnsFrame({ n, width, height, active, counts, hint = -1, children }: FrameProps) {
  const colW = width / n;
  return (
    <div className="board" style={{ height }}>
      {Array.from({ length: n }, (_, c) => {
        const count = counts?.[c] ?? null;
        return (
          <div
            key={c}
            className={`board-col ${RANK_CLASS[c]} ${active === c ? 'hl' : ''} ${hint === c ? 'hint' : ''}`}
            style={{ left: colLeft(c, n, width) + 2, width: colW - 4 }}
          >
            <span className="board-head">{RANK_LABEL[c]}</span>
            {counts && <span className={`board-count ${count !== null ? 'on' : ''}`}>{count ?? ''}</span>}
          </div>
        );
      })}
      {children}
    </div>
  );
}

interface ColumnsProps {
  lesson: Lesson;
  step: number;
  width: number;
  height: number;
  children?: ReactNode;
  /** Masquer les pastilles de comptage (pour le boulier par exemple). */
  counts?: boolean;
}

/** Fond d'un visuel qui suit une leçon pas à pas. */
export function Columns({ lesson, step, width, height, children, counts = true }: ColumnsProps) {
  const s = lesson.steps[step];
  return (
    <ColumnsFrame
      n={lesson.n}
      width={width}
      height={height}
      active={activeCol(s)}
      counts={counts ? s.cols.map((_, c) => colCount(s, c)) : undefined}
    >
      {children}
    </ColumnsFrame>
  );
}

/** Rectangles des colonnes pour la couche de gestes. */
export function columnRects(n: number, width: number) {
  return Array.from({ length: n }, (_, c) => ({ c, left: colLeft(c, n, width), width: width / n }));
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
