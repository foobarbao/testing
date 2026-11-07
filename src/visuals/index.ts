import type { ComponentType } from 'react';
import type { VisualId } from '../lib/storage';
import Abacus from './Abacus';
import type { VisualProps } from './common';
import Gears from './Gears';
import Money from './Money';
import Posee from './Posee';
import Ruler from './Ruler';
import Sticks from './Sticks';

export interface VisualInfo {
  id: VisualId;
  name: string;
  hint: string;
  Comp: ComponentType<VisualProps>;
}

export const VISUALS: VisualInfo[] = [
  { id: 'sticks', name: 'Bâtonnets', hint: '10 bâtonnets font un fagot', Comp: Sticks },
  { id: 'posee', name: 'Addition posée', hint: 'Le calcul en colonnes', Comp: Posee },
  { id: 'ruler', name: 'Règle', hint: 'La grenouille avance par bonds', Comp: Ruler },
  { id: 'gears', name: 'Roues', hint: 'Un compteur à engrenages', Comp: Gears },
  { id: 'abacus', name: 'Boulier', hint: '10 perles pour 1 perle', Comp: Abacus },
  { id: 'money', name: 'Monnaie', hint: '10 pièces pour 1 billet', Comp: Money },
];

export const visualById = (id: VisualId) => VISUALS.find((v) => v.id === id) ?? VISUALS[0];
