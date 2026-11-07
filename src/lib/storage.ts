import { useCallback, useState } from 'react';

export type VisualId = 'sticks' | 'posee' | 'ruler' | 'gears' | 'abacus' | 'money';

export interface Prefs {
  speed: number;
  sound: boolean;
  voice: boolean;
  visuals: VisualId[];
  /** Étoiles gagnées par niveau, pour l'addition. */
  stars: Record<number, number>;
}

const KEY = 'retenue:v1';

export const DEFAULT_PREFS: Prefs = {
  speed: 1,
  sound: true,
  voice: false,
  visuals: ['sticks', 'posee'],
  stars: {},
};

function load(): Prefs {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_PREFS;
    return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function usePrefs() {
  const [prefs, setPrefs] = useState<Prefs>(load);
  const update = useCallback((patch: Partial<Prefs> | ((p: Prefs) => Partial<Prefs>)) => {
    setPrefs((prev) => {
      const next = { ...prev, ...(typeof patch === 'function' ? patch(prev) : patch) };
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* stockage indisponible : on garde en mémoire */
      }
      return next;
    });
  }, []);
  return [prefs, update] as const;
}
