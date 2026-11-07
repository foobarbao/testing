import { digitsOf } from './steps';

/** Résultat quand on oublie la retenue : 47 + 28 → 65. */
export function forgotCarry(a: number, b: number): number {
  const da = digitsOf(a);
  const db = digitsOf(b);
  const n = Math.max(da.length, db.length);
  let out = 0;
  for (let c = 0; c < n; c++) out += (((da[c] ?? 0) + (db[c] ?? 0)) % 10) * 10 ** c;
  return out;
}

/** Résultat quand on écrit la somme d'une colonne en entier : 47 + 28 → 615. */
export function wroteWholeSum(a: number, b: number): number {
  const da = digitsOf(a);
  const db = digitsOf(b);
  const n = Math.max(da.length, db.length);
  let s = '';
  for (let c = n - 1; c >= 0; c--) s += String((da[c] ?? 0) + (db[c] ?? 0));
  return Number(s);
}

/** Trois réponses : la bonne et deux erreurs courantes, dans le désordre. */
export function choicesFor(a: number, b: number, rand: () => number = Math.random): number[] {
  const r = a + b;
  const pool = [forgotCarry(a, b), r + 10, r - 10, wroteWholeSum(a, b), r + 1, r - 1];
  const wrong: number[] = [];
  for (const x of pool) {
    if (x > 0 && x !== r && !wrong.includes(x) && x < 2000) wrong.push(x);
    if (wrong.length === 2) break;
  }
  const all = [r, ...wrong];
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }
  return all;
}
