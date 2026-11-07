import type { Exercise, Op } from './types';

export interface LevelInfo {
  id: number;
  title: string;
  hint: string;
  example: string;
}

export const LEVELS: LevelInfo[] = [
  { id: 1, title: 'Niveau 1', hint: 'Unités + unités', example: '7 + 5' },
  { id: 2, title: 'Niveau 2', hint: 'Dizaines + unités', example: '38 + 6' },
  { id: 3, title: 'Niveau 3', hint: 'Dizaines + dizaines', example: '47 + 28' },
  { id: 4, title: 'Niveau 4', hint: 'Avec des centaines', example: '286 + 147' },
];

/** Nombre d'exercices réussis pour remplir un niveau. */
export const STARS_PER_LEVEL = 5;

type Rand = () => number;
const between = (rand: Rand, lo: number, hi: number) => lo + Math.floor(rand() * (hi - lo + 1));

function carries(a: number, b: number): number {
  let n = 0;
  let carry = 0;
  for (let x = a, y = b; x > 0 || y > 0; x = Math.floor(x / 10), y = Math.floor(y / 10)) {
    carry = (x % 10) + (y % 10) + carry >= 10 ? 1 : 0;
    n += carry;
  }
  return n;
}

function candidate(level: number, rand: Rand): [number, number] | null {
  switch (level) {
    case 1: {
      const a = between(rand, 2, 9);
      const b = between(rand, 2, 9);
      return a + b >= 10 ? [a, b] : null;
    }
    case 2: {
      const a = between(rand, 11, 89);
      const b = between(rand, 2, 9);
      return (a % 10) + b >= 10 && a + b <= 99 ? [a, b] : null;
    }
    case 3: {
      const a = between(rand, 11, 79);
      const b = between(rand, 11, 79);
      return (a % 10) + (b % 10) >= 10 && a + b <= 99 && a % 10 !== 0 && b % 10 !== 0 ? [a, b] : null;
    }
    default: {
      const a = between(rand, 101, 799);
      const b = rand() < 0.75 ? between(rand, 101, 599) : between(rand, 11, 99);
      const n = carries(a, b);
      // Une ou deux retenues, et une fois sur deux on vise deux retenues.
      if (a + b > 999 || n === 0) return null;
      if (rand() < 0.5 && n < 2) return null;
      return [a, b];
    }
  }
}

export function makeExercise(level: number, previous?: Exercise, rand: Rand = Math.random, op: Op = 'add'): Exercise {
  for (let i = 0; i < 2000; i++) {
    const pair = candidate(level, rand);
    if (!pair) continue;
    const [a, b] = rand() < 0.5 && level === 1 ? [pair[1], pair[0]] : pair;
    if (previous && previous.a === a && previous.b === b) continue;
    return { op, a, b, level };
  }
  // Valeurs sûres si le hasard ne tombe jamais juste.
  const fallback: Record<number, [number, number]> = { 1: [7, 5], 2: [38, 6], 3: [47, 28], 4: [286, 147] };
  const [a, b] = fallback[level] ?? fallback[1];
  return { op, a, b, level };
}

export { carries };
