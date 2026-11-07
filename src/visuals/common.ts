import type { Lesson, Step } from '../engine/types';

/** Le geste attendu de l'enfant pour passer à l'étape suivante. */
export interface Gesture {
  next: Step;
  /** Montrer la main qui indique le geste. */
  hint: boolean;
  onDone: () => void;
  onWrong: () => void;
}

export interface VisualProps {
  lesson: Lesson;
  step: number;
  /** Durée d'une animation, en millisecondes (dépend du réglage de vitesse). */
  dur: number;
  /** Présent quand c'est à l'enfant d'agir sur le visuel. */
  gesture?: Gesture;
}

export const RANK_LABEL = ['Unités', 'Dizaines', 'Centaines'];
export const RANK_CLASS = ['u', 'd', 'c'];

/** Hauteur réservée en haut de chaque visuel en colonnes pour les titres. */
export const HEAD = 30;

/** Colonne active à mettre en surbrillance, ou -1. */
export function activeCol(s: Step): number {
  return s.kind === 'pose' || s.kind === 'done' ? -1 : s.col;
}

/** Position horizontale d'une colonne : les centaines à gauche, les unités à droite. */
export function colLeft(c: number, n: number, width: number) {
  return (n - 1 - c) * (width / n);
}

/** Nombre affiché dans la pastille d'une colonne, ou null. */
export function colCount(s: Step, c: number): number | null {
  const cs = s.cols[c];
  if (cs.phase === 'merged' || cs.phase === 'grouping') return cs.total;
  if (cs.phase === 'done') return cs.result;
  return null;
}

/** Index de l'étape où la colonne `c` envoie sa retenue, ou -1. */
export function carryStepIndex(lesson: Lesson, c: number) {
  return lesson.steps.findIndex((s) => s.kind === 'carry' && s.col === c);
}
