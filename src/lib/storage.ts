import { useCallback, useState } from 'react';

export type VisualId = 'sticks' | 'posee' | 'ruler' | 'gears' | 'abacus' | 'money';

/** Façon de donner la réponse à un calcul. */
export type AnswerMode = 'keypad' | 'posee' | 'manip' | 'choice';

/** Modèle utilisé pour construire un nombre ou manipuler la réponse. */
export type BuildModel = 'sticks' | 'money' | 'abacus' | 'ruler' | 'gears';

export interface Prefs {
  ver: number;
  speed: number;
  sound: boolean;
  voice: boolean;
  visuals: VisualId[];
  answerMode: AnswerMode;
  buildModel: BuildModel;
  /** Étoiles gagnées par niveau, pour l'addition. */
  stars: Record<number, number>;
  /** Étoiles de « Construis le nombre », par difficulté. */
  buildStars: Record<string, number>;
}

const KEY = 'retenue:v1';
const VERSION = 2;

export const DEFAULT_PREFS: Prefs = {
  ver: VERSION,
  speed: 1,
  sound: true,
  voice: true,
  visuals: ['sticks', 'posee'],
  answerMode: 'keypad',
  buildModel: 'sticks',
  stars: {},
  buildStars: {},
};

function load(): Prefs {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_PREFS;
    const saved = JSON.parse(raw);
    const prefs: Prefs = { ...DEFAULT_PREFS, ...saved };
    // Version 2 : la voix est activée par défaut, y compris pour les réglages déjà enregistrés.
    if (!saved.ver || saved.ver < 2) prefs.voice = true;
    prefs.ver = VERSION;
    return prefs;
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
