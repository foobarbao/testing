import { describe, expect, it } from 'vitest';
import { contestBoard } from '../engine/tens';
import { better, leaderboard, medalFor, outcome, trophiesOf, type ContestScore, type ProfilesState } from './profiles';

const score = (p: Partial<ContestScore>): ContestScore => ({
  id: Math.random().toString(36),
  profileId: 'lea',
  mode: 'chrono',
  level: 'ten',
  goal: 60,
  pairs: 10,
  ms: 60000,
  misses: 2,
  date: 0,
  ...p,
});

const state = (scores: ContestScore[]): ProfilesState => ({
  profiles: [
    { id: 'lea', name: 'Léa', color: '#000', created: 0 },
    { id: 'tom', name: 'Tom', color: '#000', created: 0 },
  ],
  current: 'lea',
  scores,
});

describe('concours', () => {
  it('compare les scores selon l’épreuve', () => {
    expect(better(score({ pairs: 12 }), score({ pairs: 10 }))).toBe(true);
    expect(better(score({ pairs: 10, misses: 0 }), score({ pairs: 10, misses: 3 }))).toBe(true);
    expect(better(score({ mode: 'race', goal: 10, ms: 30000 }), score({ mode: 'race', goal: 10, ms: 40000 }))).toBe(true);
  });

  it('classe les joueurs sur leur meilleur score', () => {
    const s = state([score({ pairs: 9 }), score({ pairs: 14 }), score({ profileId: 'tom', pairs: 12 })]);
    const board = leaderboard(s, 'chrono', 'ten', 60);
    expect(board.map((r) => [r.profile.name, r.best.pairs])).toEqual([
      ['Léa', 14],
      ['Tom', 12],
    ]);
    expect(leaderboard(s, 'race', 'ten', 10)).toEqual([]);
  });

  it('donne des médailles', () => {
    expect(medalFor({ mode: 'chrono', pairs: 5, ms: 60000, goal: 60 })).toBeNull();
    expect(medalFor({ mode: 'chrono', pairs: 12, ms: 60000, goal: 60 })).toBe('argent');
    expect(medalFor({ mode: 'race', pairs: 10, ms: 30000, goal: 10 })).toBe('or');
    expect(medalFor({ mode: 'race', pairs: 7, ms: 9000, goal: 10 })).toBeNull();
  });

  it('repère record, première place et nouveaux trophées', () => {
    const s = state([score({ pairs: 9 }), score({ profileId: 'tom', pairs: 15 })]);
    const o = outcome(s, score({ pairs: 16, misses: 0 }));
    expect(o.record).toBe(true);
    expect(o.champion).toBe(true);
    expect(o.newTrophies.map((t) => t.id)).toEqual(['p10', 'perfect']);
    expect(trophiesOf(s.scores, 'lea').has('first')).toBe(true);
  });

  it('crée un écran de 20 paires toutes réalisables', () => {
    for (const level of ['ten', 'decade'] as const) {
      const cards = contestBoard(level, 20, 3);
      expect(cards).toHaveLength(40);
      expect(new Set(cards.map((c) => c.id)).size).toBe(40);
      const target = level === 'ten' ? 10 : 100;
      const counts = new Map<number, number>();
      cards.forEach((c) => counts.set(c.value, (counts.get(c.value) ?? 0) + 1));
      for (const [v, n] of counts) {
        if (v * 2 === target) expect(n % 2).toBe(0);
        else expect(counts.get(target - v)).toBe(n);
      }
    }
  });
});
