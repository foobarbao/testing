import type { ComponentType } from 'react';
import type { VisualId } from '../lib/storage';
import Abacus from './Abacus';
import type { VisualProps } from './common';
import type { Step } from '../engine/types';
import { tapsNeeded } from './taps';
import Counter from './Counter';
import Money from './Money';
import Posee from './Posee';
import Ruler from './Ruler';
import Sticks from './Sticks';

export interface VisualInfo {
  id: VisualId;
  name: string;
  Comp: ComponentType<VisualProps>;
}

export const VISUALS: VisualInfo[] = [
  { id: 'sticks', name: 'Bâtonnets', Comp: Sticks },
  { id: 'posee', name: 'Posée', Comp: Posee },
  { id: 'ruler', name: 'Règle', Comp: Ruler },
  { id: 'counter', name: 'Compteur', Comp: Counter },
  { id: 'abacus', name: 'Boulier', Comp: Abacus },
  { id: 'money', name: 'Monnaie', Comp: Money },
];

/**
 * Faut-il un geste de l'enfant pour atteindre l'étape `next` avec ce visuel ?
 * Sinon, l'étape s'enchaîne toute seule (par exemple la retenue sur la règle,
 * déjà vue pendant les bonds).
 */
export function needsGesture(id: VisualId, next: Step) {
  if (next.kind === 'done') return false;
  if (id === 'ruler' || id === 'counter') return tapsNeeded(next) > 0;
  return true;
}

export const visualById = (id: VisualId) => VISUALS.find((v) => v.id === id) ?? VISUALS[0];
