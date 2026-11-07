/** Compléments à 10 : données des jeux « Fais 10 ! ». */

export type TenLevel = 'ten' | 'decade';

export interface TenRound {
  /** Nombre de départ : 7, ou 47 au niveau « dizaine ». */
  start: number;
  /** 10, ou la dizaine suivante (50). */
  target: number;
  /** Ce qu'il faut ajouter : le complément. */
  need: number;
}

type Rand = () => number;
const between = (rand: Rand, lo: number, hi: number) => lo + Math.floor(rand() * (hi - lo + 1));

export function makeRound(level: TenLevel, previous?: TenRound, rand: Rand = Math.random): TenRound {
  for (let i = 0; i < 50; i++) {
    const units = between(rand, 1, 9);
    const tens = level === 'decade' ? between(rand, 1, 8) : 0;
    const start = tens * 10 + units;
    const round = { start, target: (tens + 1) * 10, need: 10 - units };
    if (!previous || previous.need !== round.need) return round;
  }
  return { start: 7, target: 10, need: 3 };
}

/** Trois réponses : le complément et deux voisins, dans le désordre. */
export function bubbles(need: number, rand: Rand = Math.random): number[] {
  const near = [need - 1, need + 1, need - 2, need + 2, 10 - need].filter((x) => x >= 1 && x <= 9 && x !== need);
  const out = [need];
  for (const x of near) {
    if (!out.includes(x)) out.push(x);
    if (out.length === 3) break;
  }
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export interface Card {
  id: string;
  value: number;
}

/**
 * Plateau des « amoureux de 10 » : 4 paires qui font 10 (ou 100 au niveau « dizaine »).
 * Chaque paire est différente des autres.
 */
export function pairsBoard(level: TenLevel, rand: Rand = Math.random): Card[] {
  const pool = [1, 2, 3, 4, 5];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const scale = level === 'decade' ? 10 : 1;
  const cards: Card[] = [];
  pool.slice(0, 4).forEach((a, k) => {
    cards.push({ id: `${k}a`, value: a * scale }, { id: `${k}b`, value: (10 - a) * scale });
  });
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}

export const pairTarget = (level: TenLevel) => (level === 'decade' ? 100 : 10);

/** Étoiles de fin de partie selon le nombre de réussites du premier coup. */
export function starsFor(score: number, total: number) {
  const r = score / total;
  return r >= 0.9 ? 3 : r >= 0.6 ? 2 : 1;
}
