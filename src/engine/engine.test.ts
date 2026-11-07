import { describe, expect, it } from 'vitest';
import { buildLesson, digitsOf } from './steps';
import { carries, makeExercise } from './levels';

const kinds = (a: number, b: number) => buildLesson({ op: 'add', a, b, level: 0 }).steps.map((s) => `${s.kind}${s.col >= 0 ? s.col : ''}`);

describe('buildLesson', () => {
  it('47 + 28 : une retenue des unités vers les dizaines', () => {
    expect(kinds(47, 28)).toEqual(['pose', 'add0', 'group0', 'carry0', 'add1', 'write1', 'done']);
    const l = buildLesson({ op: 'add', a: 47, b: 28, level: 3 });
    const last = l.steps[l.steps.length - 1];
    expect(last.cols.map((c) => c.result)).toEqual([5, 7]);
    expect(l.steps[4].cols[1]).toMatchObject({ carryIn: true, total: 7 });
    expect(l.steps[4].say).toBe('Maintenant, les dizaines : 1 de retenue + 4 + 2 = 7.');
  });

  it('7 + 5 : la colonne des dizaines ne contient que la retenue', () => {
    const l = buildLesson({ op: 'add', a: 7, b: 5, level: 1 });
    expect(l.n).toBe(2);
    expect(l.steps.map((s) => s.kind)).toEqual(['pose', 'add', 'group', 'carry', 'add', 'write', 'done']);
    expect(l.steps[4].say).toContain("il n'y a que la retenue");
    expect(l.steps[6].cols.map((c) => c.result)).toEqual([2, 1]);
  });

  it('286 + 147 : deux retenues', () => {
    expect(kinds(286, 147)).toEqual(['pose', 'add0', 'group0', 'carry0', 'add1', 'group1', 'carry1', 'add2', 'write2', 'done']);
    const l = buildLesson({ op: 'add', a: 286, b: 147, level: 4 });
    expect(l.steps[6].say).toBe("10 dizaines deviennent 1 centaine ! J'écris 3 et je retiens 1.");
  });

  it('la valeur progresse colonne par colonne jusqu’au résultat', () => {
    const l = buildLesson({ op: 'add', a: 286, b: 147, level: 4 });
    expect(l.steps.map((s) => s.value)).toEqual([286, 293, 293, 293, 333, 333, 333, 433, 433, 433]);
  });

  it('chaque résultat écrit correspond au calcul', () => {
    for (let a = 1; a < 500; a += 7) {
      for (let b = 1; b < 499; b += 13) {
        const l = buildLesson({ op: 'add', a, b, level: 0 });
        const last = l.steps[l.steps.length - 1];
        const written = last.cols.reduce((acc, c, i) => acc + (c.result ?? 0) * 10 ** i, 0);
        expect(written).toBe(a + b);
        expect(last.value).toBe(a + b);
      }
    }
  });

  it('refuse la soustraction pour l’instant', () => {
    expect(() => buildLesson({ op: 'sub', a: 42, b: 17, level: 1 })).toThrow();
  });
});

describe('makeExercise', () => {
  it('respecte les règles de chaque niveau', () => {
    for (let i = 0; i < 300; i++) {
      const e1 = makeExercise(1);
      expect(e1.a + e1.b).toBeGreaterThanOrEqual(10);
      expect(Math.max(e1.a, e1.b)).toBeLessThan(10);

      const e2 = makeExercise(2);
      expect(digitsOf(e2.a)).toHaveLength(2);
      expect(digitsOf(e2.b)).toHaveLength(1);
      expect(carries(e2.a, e2.b)).toBe(1);

      const e3 = makeExercise(3);
      expect(digitsOf(e3.a)).toHaveLength(2);
      expect(digitsOf(e3.b)).toHaveLength(2);
      expect(e3.a + e3.b).toBeLessThan(100);
      expect(carries(e3.a, e3.b)).toBe(1);

      const e4 = makeExercise(4);
      expect(digitsOf(e4.a)).toHaveLength(3);
      expect(e4.a + e4.b).toBeLessThanOrEqual(999);
      expect(carries(e4.a, e4.b)).toBeGreaterThanOrEqual(1);
    }
  });

  it('ne repose pas le même calcul deux fois de suite', () => {
    let prev = makeExercise(1);
    for (let i = 0; i < 100; i++) {
      const next = makeExercise(1, prev);
      expect(next.a === prev.a && next.b === prev.b).toBe(false);
      prev = next;
    }
  });
});
