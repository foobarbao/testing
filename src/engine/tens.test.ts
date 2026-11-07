import { describe, expect, it } from 'vitest';
import { bubbles, makeRound, pairTarget, pairsBoard, starsFor } from './tens';

describe('compléments à 10', () => {
  it('fabrique des manches justes aux deux niveaux', () => {
    for (let i = 0; i < 300; i++) {
      const r = makeRound('ten');
      expect(r.target).toBe(10);
      expect(r.start + r.need).toBe(10);
      expect(r.need).toBeGreaterThanOrEqual(1);
      expect(r.need).toBeLessThanOrEqual(9);

      const d = makeRound('decade');
      expect(d.target % 10).toBe(0);
      expect(d.start + d.need).toBe(d.target);
      expect(d.start).toBeGreaterThan(10);
      expect(d.target).toBeLessThanOrEqual(90);
    }
  });

  it('ne propose pas deux fois de suite le même complément', () => {
    let prev = makeRound('ten');
    for (let i = 0; i < 100; i++) {
      const next = makeRound('ten', prev);
      expect(next.need).not.toBe(prev.need);
      prev = next;
    }
  });

  it('propose trois bulles différentes dont la bonne', () => {
    for (let need = 1; need <= 9; need++) {
      const b = bubbles(need);
      expect(b).toHaveLength(3);
      expect(b).toContain(need);
      expect(new Set(b).size).toBe(3);
      expect(b.every((x) => x >= 1 && x <= 9)).toBe(true);
    }
  });

  it('crée 4 paires qui font 10, ou 100 au niveau dizaine', () => {
    for (const level of ['ten', 'decade'] as const) {
      const cards = pairsBoard(level);
      expect(cards).toHaveLength(8);
      const values = cards.map((c) => c.value);
      for (const v of values) expect(values).toContain(pairTarget(level) - v);
    }
  });

  it('donne 1 à 3 étoiles', () => {
    expect(starsFor(10, 10)).toBe(3);
    expect(starsFor(7, 10)).toBe(2);
    expect(starsFor(3, 10)).toBe(1);
  });
});
