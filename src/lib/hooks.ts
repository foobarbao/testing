import { useEffect, useLayoutEffect, useRef, useState } from 'react';

/** Largeur d'un élément, mise à jour quand il change de taille. */
export function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(el.clientWidth);
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

/**
 * Fait avancer une valeur vers sa cible par bonds de `unit`, un bond par `tickMs`.
 * En arrière (Précédent, Rejouer), on saute directement à la cible.
 * `onCross(rank)` est appelé quand un bond franchit une dizaine, une centaine…
 */
export function useHops(target: number, unit: number, tickMs: number, resetKey: string, onCross?: (rank: number) => void) {
  const [v, setV] = useState(target);
  const crossRef = useRef(onCross);
  crossRef.current = onCross;

  useEffect(() => {
    setV(target);
    // Nouvel exercice : on repart de la cible sans animer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  useEffect(() => {
    if (v === target) return;
    // Une étape ne fait jamais plus de 9 bonds : au-delà, c'est un saut (bonne réponse, autre étape).
    if (target < v || (target - v) % unit !== 0 || (target - v) / unit > 9) {
      setV(target);
      return;
    }
    const id = window.setTimeout(() => {
      const next = v + unit;
      const big = unit * 10;
      if (Math.floor(next / big) > Math.floor(v / big)) {
        const rank = Math.round(Math.log10(big));
        crossRef.current?.(rank);
      }
      setV(next);
    }, tickMs);
    return () => window.clearTimeout(id);
  }, [v, target, unit, tickMs]);

  return v;
}

export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(() => {
    try {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch {
      return false;
    }
  });
  useEffect(() => {
    try {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      const on = () => setReduced(mq.matches);
      mq.addEventListener('change', on);
      return () => mq.removeEventListener('change', on);
    } catch {
      return undefined;
    }
  }, []);
  return reduced;
}
