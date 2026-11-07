import type { ColState, Exercise, Lesson, Rank, Seg, Step, Tone } from './types';

export const RANK_TONE: Tone[] = ['u', 'd', 'c'];
const PLURAL = ['unités', 'dizaines', 'centaines'];
const SINGULAR = ['unité', 'dizaine', 'centaine'];

export function digitsOf(x: number): number[] {
  const out: number[] = [];
  let v = x;
  do {
    out.push(v % 10);
    v = Math.floor(v / 10);
  } while (v > 0);
  return out;
}

export function rankWord(rank: number, count: number): string {
  return count > 1 ? PLURAL[rank] : SINGULAR[rank];
}

/** Découpe une opération en étapes animables. */
export function buildLesson(ex: Exercise): Lesson {
  if (ex.op === 'sub') {
    // Prévu : la soustraction avec emprunt réutilisera les mêmes visuels,
    // avec une étape « casser 1 dizaine en 10 unités » à la place du regroupement.
    throw new Error('La soustraction arrive bientôt');
  }
  return buildAddition(ex);
}

function buildAddition(ex: Exercise): Lesson {
  const { a, b } = ex;
  const result = a + b;
  if (result > 999) throw new Error('Résultat limité à 999');
  const da = digitsOf(a);
  const db = digitsOf(b);
  const n = digitsOf(result).length;

  let cols: ColState[] = Array.from({ length: n }, (_, c) => ({
    rank: c as Rank,
    a: da[c] ?? 0,
    b: db[c] ?? 0,
    hasA: c < da.length,
    hasB: c < db.length,
    carryIn: false,
    total: 0,
    phase: 'pose',
    result: null,
    carriedOut: false,
  }));

  const steps: Step[] = [];
  let value = a;
  const push = (s: Omit<Step, 'cols' | 'value'> & { value?: number }) =>
    steps.push({ ...s, value: s.value ?? value, cols: cols.map((c) => ({ ...c })) });

  push({ kind: 'pose', col: -1, unit: 1, say: `Voici le calcul : ${a} + ${b}. On le fait ensemble ?`, note: [] });

  for (let c = 0; c < n; c++) {
    const col = cols[c];
    const tone = RANK_TONE[c];
    const total = col.a + col.b + (col.carryIn ? 1 : 0);
    const unit = 10 ** c;
    value += col.b * unit;

    // Termes de la colonne, retenue en premier comme à l'école.
    const terms: Seg[] = [];
    if (col.carryIn) terms.push({ t: '1', tone: 'r' });
    if (col.hasA) terms.push({ t: String(col.a), tone });
    if (col.hasB) terms.push({ t: String(col.b), tone });
    const spoken = terms.map((t) => (t.tone === 'r' ? '1 de retenue' : t.t));

    cols[c] = { ...col, phase: 'merged', total };
    let say: string;
    if (terms.length === 1 && col.carryIn) {
      say = `Chez les ${PLURAL[c]}, il n'y a que la retenue : 1 ${SINGULAR[c]}.`;
    } else {
      const intro = c === 0 ? 'On commence toujours par les unités' : `Maintenant, les ${PLURAL[c]}`;
      say = `${intro} : ${spoken.join(' + ')} = ${total}.`;
    }
    const sumNote: Seg[] = [];
    terms.forEach((t, i) => {
      if (i) sumNote.push({ t: ' + ' });
      sumNote.push(t);
    });
    if (terms.length > 1) sumNote.push({ t: ' = ' }, { t: String(total), tone });
    push({ kind: 'add', col: c, unit, say, note: sumNote });

    if (total >= 10) {
      cols[c] = { ...cols[c], phase: 'grouping' };
      // Complément à 10 : ce qu'on avait déjà (retenue + premier nombre) et ce qu'il faut ajouter pour faire 10.
      const base = (col.carryIn ? 1 : 0) + col.a;
      const comp = 10 - base;
      const rest = total - 10;
      const withComp = comp > 0 && comp <= col.b;
      push({
        kind: 'group',
        col: c,
        unit,
        comp: withComp ? { base, comp, rest } : undefined,
        say: withComp
          ? `${base} et ${comp} font 10 : ça fait 1 ${SINGULAR[c + 1]} ! Il reste ${rest} ${rankWord(c, rest)}.`
          : `Voilà 10 ${PLURAL[c]} ensemble : ça fait 1 ${SINGULAR[c + 1]} !`,
        note: withComp
          ? [
              { t: String(base), tone },
              { t: ' + ' },
              { t: String(comp), tone: 'r' },
              { t: ' = 10' },
              { t: ', reste ' },
              { t: String(rest), tone },
            ]
          : [
              { t: String(total), tone },
              { t: ' = ' },
              { t: `1 ${SINGULAR[c + 1]}`, tone: 'r' },
              { t: ' et ' },
              { t: `${rest} ${rankWord(c, rest)}`, tone },
            ],
      });
      cols[c] = { ...cols[c], phase: 'done', result: total - 10, carriedOut: true };
      cols[c + 1] = { ...cols[c + 1], carryIn: true };
      push({
        kind: 'carry',
        col: c,
        unit,
        say: `10 ${PLURAL[c]} deviennent 1 ${SINGULAR[c + 1]} ! J'écris ${total - 10} et je retiens 1.`,
        note: [
          { t: "J'écris " },
          { t: String(total - 10), tone },
          { t: ', je retiens ' },
          { t: '1', tone: 'r' },
        ],
      });
    } else {
      cols[c] = { ...cols[c], phase: 'done', result: total };
      push({
        kind: 'write',
        col: c,
        unit,
        say: `${total} ${rankWord(c, total)} : j'écris ${total} chez les ${PLURAL[c]}.`,
        note: [{ t: "J'écris " }, { t: String(total), tone }],
      });
    }
  }

  const resultNote: Seg[] = digitsOf(result)
    .map((d, c) => ({ t: String(d), tone: RANK_TONE[c] }))
    .reverse();
  push({
    kind: 'done',
    col: -1,
    unit: 1,
    say: `${a} + ${b} = ${result}. Bravo !`,
    note: [{ t: '= ' }, ...resultNote],
  });

  return { id: `${ex.op}-${a}-${b}-${Math.random().toString(36).slice(2, 7)}`, ex, result, n, steps };
}
