import { useRef, useState } from 'react';
import type { Step } from '../engine/types';
import type { Gesture } from './common';

/** Nombre d'appuis attendus pour une étape « add » : le chiffre du second nombre dans la colonne. */
export const tapsNeeded = (next: Step) => (next.kind === 'add' ? next.cols[next.col].b : 0);

/**
 * Compte les appuis de l'enfant pendant une étape (un bond de grenouille, un cran du compteur).
 * Le compteur repart de zéro à chaque nouvelle étape.
 */
export function useTaps(step: number, gesture: Gesture | undefined, delay: number) {
  const [t, setT] = useState({ step: -1, n: 0 });
  const done = useRef(-1);
  const taps = t.step === step ? t.n : 0;
  const need = gesture ? tapsNeeded(gesture.next) : 0;

  const tap = () => {
    if (!gesture || need === 0 || taps >= need) return false;
    const n = taps + 1;
    setT({ step, n });
    if (n >= need && done.current !== step) {
      done.current = step;
      const finish = gesture.onDone;
      window.setTimeout(finish, delay);
    }
    return true;
  };

  return { taps, need, tap };
}
