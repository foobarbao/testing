import { useCallback, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';

export interface DragState<T> {
  item: T;
  x: number;
  y: number;
  /** Position du doigt dans l'élément saisi, pour que le fantôme ne saute pas. */
  dx: number;
  dy: number;
}

interface Options<T> {
  onDrop: (item: T, x: number, y: number) => void;
  /** Appui sans glisser : sert d'alternative au glisser-déposer. */
  onTap?: (item: T) => void;
}

/** Glisser-déposer au doigt ou à la souris, avec un fantôme qui suit le pointeur. */
export function useDrag<T>(options: Options<T>) {
  const [drag, setDrag] = useState<DragState<T> | null>(null);
  const opts = useRef(options);
  opts.current = options;

  const start = useCallback((item: T, e: ReactPointerEvent<HTMLElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const id = e.pointerId;
    const sx = e.clientX;
    const sy = e.clientY;
    let moved = false;

    const move = (ev: PointerEvent) => {
      if (ev.pointerId !== id) return;
      if (!moved && Math.hypot(ev.clientX - sx, ev.clientY - sy) < 8) return;
      moved = true;
      ev.preventDefault();
      setDrag({ item, x: ev.clientX, y: ev.clientY, dx: sx - rect.left, dy: sy - rect.top });
    };
    const end = (ev: PointerEvent) => {
      if (ev.pointerId !== id) return;
      cleanup();
      setDrag(null);
      if (ev.type === 'pointercancel') return;
      if (moved) opts.current.onDrop(item, ev.clientX, ev.clientY);
      else opts.current.onTap?.(item);
    };
    const cleanup = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
    };
    window.addEventListener('pointermove', move, { passive: false });
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
  }, []);

  return { drag, start };
}

export function Ghost<T>({ drag, className, children }: { drag: DragState<T> | null; className?: string; children: ReactNode }) {
  if (!drag) return null;
  return (
    <div className={`ghost ${className ?? ''}`} style={{ left: drag.x - drag.dx, top: drag.y - drag.dy }} aria-hidden="true">
      {children}
    </div>
  );
}

/** Le point (x, y) est-il dans l'élément ? */
export function inside(el: Element | null, x: number, y: number, margin = 0) {
  if (!el) return false;
  const r = el.getBoundingClientRect();
  return x >= r.left - margin && x <= r.right + margin && y >= r.top - margin && y <= r.bottom + margin;
}
