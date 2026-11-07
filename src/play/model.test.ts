import { describe, expect, it } from 'vitest';
import { choicesFor, forgotCarry, wroteWholeSum } from '../engine/choices';
import {
  STICK_NAMES,
  breakOne,
  canBreak,
  canGroup,
  countsFor,
  decompose,
  group,
  judgeCounts,
  valueOf,
} from './model';

describe('manipulation', () => {
  it('regrouper 10 unités donne 1 dizaine sans changer la valeur', () => {
    const c = [15, 6];
    expect(canGroup(c, 0)).toBe(true);
    const g = group(c, 0);
    expect(g).toEqual([5, 7]);
    expect(valueOf(g)).toBe(valueOf(c));
  });

  it('casser 1 dizaine donne 10 unités', () => {
    expect(breakOne([3, 2], 1)).toEqual([13, 1]);
    expect(canBreak([10, 2], 1)).toBe(false); // 20 unités : trop pour l'écran
    expect(canBreak([3, 0], 1)).toBe(false);
  });

  it('écrit et décompose un nombre', () => {
    expect(countsFor(47, 2)).toEqual([7, 4]);
    expect(countsFor(305, 3)).toEqual([5, 0, 3]);
    expect(decompose(47)).toBe('4 dizaines et 7 unités');
    expect(decompose(305)).toBe('3 centaines et 5 unités');
    expect(decompose(11)).toBe('1 dizaine et 1 unité');
  });

  it('juge une construction', () => {
    expect(judgeCounts([7, 4], 47, STICK_NAMES, true).ok).toBe(true);
    const untidy = judgeCounts([17, 3], 47, STICK_NAMES, true);
    expect(untidy).toMatchObject({ ok: false, untidy: 0 });
    expect(untidy.text).toContain('17 bâtonnets');
    expect(judgeCounts([5, 4], 47, STICK_NAMES, true).text).toContain('il en manque');
    expect(judgeCounts([5, 6], 75, STICK_NAMES, false).text).not.toContain('75');
  });
});

describe('réponses au choix', () => {
  it('propose la bonne réponse et deux erreurs courantes', () => {
    expect(forgotCarry(47, 28)).toBe(65);
    expect(wroteWholeSum(47, 28)).toBe(615);
    const c = choicesFor(47, 28);
    expect(c).toHaveLength(3);
    expect(c).toContain(75);
    expect(c).toContain(65);
    expect(new Set(c).size).toBe(3);
  });

  it('fonctionne pour tous les niveaux', () => {
    for (const [a, b] of [[7, 5], [38, 6], [286, 147], [9, 9], [99, 1]]) {
      const c = choicesFor(a, b);
      expect(c).toContain(a + b);
      expect(new Set(c).size).toBe(3);
      expect(c.every((x) => x > 0)).toBe(true);
    }
  });
});
