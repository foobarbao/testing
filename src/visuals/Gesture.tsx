import { useRef } from 'react';
import { inside, useDrag } from '../lib/drag';
import type { Gesture } from './common';

export interface ColRect {
  c: number;
  left: number;
  width: number;
}

/** Main qui montre où toucher. */
export function Hand({ x, y, slide = 0 }: { x: number; y: number; slide?: number }) {
  return (
    <svg
      className={`hand ${slide ? 'slide' : ''}`}
      style={{ left: x, top: y, ['--slide' as string]: `${slide}px` }}
      viewBox="0 0 40 48"
      aria-hidden="true"
    >
      <path
        d="M14 4a4 4 0 0 1 8 0v17l2-1a4 4 0 0 1 5 2l1-1a4 4 0 0 1 5 3v9c0 7-5 13-12 13h-3c-5 0-8-3-10-7L4 28a4 4 0 0 1 6-5l4 4z"
        className="hand-shape"
      />
    </svg>
  );
}

/**
 * Couche transparente posée sur un visuel en colonnes : l'enfant touche la bonne colonne,
 * ou fait glisser le paquet de 10 vers la colonne de gauche au moment de la retenue.
 */
export function GestureLayer({ rects, height, gesture }: { rects: ColRect[]; height: number; gesture: Gesture }) {
  const layer = useRef<HTMLDivElement>(null);
  const { next } = gesture;
  const c = next.col;
  const carry = next.kind === 'carry';
  // Pour la retenue, on accepte aussi un simple appui sur le paquet ou sur la colonne d'arrivée.
  const ok = (col: number) => (carry ? col === c || col === c + 1 : col === c);
  const colAt = (x: number, y: number) => {
    const el = layer.current;
    if (!el || !inside(el, x, y, 16)) return -1;
    const left = x - el.getBoundingClientRect().left;
    return rects.find((r) => left >= r.left && left <= r.left + r.width)?.c ?? -1;
  };

  const { start } = useDrag<number>({
    onTap: (col) => (ok(col) ? gesture.onDone() : gesture.onWrong()),
    onDrop: (col, x, y) => {
      const to = colAt(x, y);
      if (carry ? col === c && to === c + 1 : ok(col) && to === col) gesture.onDone();
      else if (to !== col) gesture.onWrong();
    },
  });

  if (next.kind === 'done' || c < 0) return null;
  const target = rects.find((r) => r.c === (carry ? c + 1 : c));
  const from = rects.find((r) => r.c === c);

  return (
    <div ref={layer} className="gesture-layer" style={{ height }}>
      {rects.map((r) => (
        <button
          key={r.c}
          className={`g-col ${target?.c === r.c ? 'target' : ''} ${carry && r.c === c ? 'source' : ''}`}
          style={{ left: r.left, width: r.width }}
          onPointerDown={(e) => start(r.c, e)}
          aria-label={target?.c === r.c ? 'Touche ici' : 'Colonne'}
        />
      ))}
      {carry && from && target && (
        <svg className="g-arrow" style={{ left: target.left + target.width / 2, width: from.left - target.left, top: height / 2 - 20 }} viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true">
          <path d="M96 20 H10 M24 6 L8 20 L24 34" />
        </svg>
      )}
      {gesture.hint && from && target && (
        <Hand
          x={(carry ? from : target).left + (carry ? from : target).width / 2 - 14}
          y={height * 0.55}
          slide={carry ? target.left - from.left : 0}
        />
      )}
    </div>
  );
}
