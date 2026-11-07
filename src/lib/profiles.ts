import { createContext, useCallback, useContext, useState } from 'react';
import type { TenLevel } from '../engine/tens';

/** Profils des joueurs et scores des concours, gardés sur l'appareil (localStorage). */

export type ContestMode = 'chrono' | 'race';

export interface Profile {
  id: string;
  name: string;
  /** Photo en JPEG (data URL), petite : 192 × 192. */
  photo?: string;
  color: string;
  created: number;
}

export interface ContestScore {
  id: string;
  profileId: string;
  mode: ContestMode;
  level: TenLevel;
  /** 60 (secondes) pour le chrono, nombre de paires à trouver pour la course. */
  goal: number;
  pairs: number;
  ms: number;
  misses: number;
  date: number;
}

export interface ProfilesState {
  profiles: Profile[];
  current: string | null;
  scores: ContestScore[];
}

export const PROFILE_COLORS = ['#2B74D9', '#23995A', '#EE7A12', '#8A4FD8', '#E0444B', '#0FA3A3', '#D9A21B', '#C2378A'];
export const CHRONO_SECONDS = 60;
export const RACE_GOALS = [10, 20, 40];

const KEY = 'retenue:profiles';
const EMPTY: ProfilesState = { profiles: [], current: null, scores: [] };

function load(): ProfilesState {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...EMPTY, ...JSON.parse(raw) } : EMPTY;
  } catch {
    return EMPTY;
  }
}

function save(state: ProfilesState): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

// ---------- règles des scores ----------

/** Le score `a` est-il meilleur que `b` ? Chrono : plus de paires. Course : moins de temps. */
export function better(a: ContestScore, b: ContestScore | undefined): boolean {
  if (!b) return true;
  if (a.mode === 'chrono') return a.pairs > b.pairs || (a.pairs === b.pairs && a.misses < b.misses);
  return a.ms < b.ms || (a.ms === b.ms && a.misses < b.misses);
}

const sameEvent = (s: ContestScore, mode: ContestMode, level: TenLevel, goal: number) =>
  s.mode === mode && s.level === level && s.goal === goal;

export function bestOf(scores: ContestScore[], profileId: string, mode: ContestMode, level: TenLevel, goal: number) {
  let best: ContestScore | undefined;
  for (const s of scores) if (s.profileId === profileId && sameEvent(s, mode, level, goal) && better(s, best)) best = s;
  return best;
}

/** Meilleur score de chaque joueur pour une épreuve, du premier au dernier. */
export function leaderboard(state: ProfilesState, mode: ContestMode, level: TenLevel, goal: number) {
  return state.profiles
    .map((p) => ({ profile: p, best: bestOf(state.scores, p.id, mode, level, goal) }))
    .filter((r): r is { profile: Profile; best: ContestScore } => !!r.best)
    .sort((x, y) => (better(x.best, y.best) ? -1 : better(y.best, x.best) ? 1 : 0));
}

export type Medal = 'bronze' | 'argent' | 'or' | 'diamant';
export const MEDAL_LABEL: Record<Medal, string> = { bronze: 'Bronze', argent: 'Argent', or: 'Or', diamant: 'Diamant' };

/** Médaille d'un concours. Chrono : paires en 60 s. Course : secondes par paire. */
export function medalFor(s: Pick<ContestScore, 'mode' | 'pairs' | 'ms' | 'goal'>): Medal | null {
  if (s.mode === 'chrono') {
    if (s.pairs >= 25) return 'diamant';
    if (s.pairs >= 18) return 'or';
    if (s.pairs >= 12) return 'argent';
    if (s.pairs >= 6) return 'bronze';
    return null;
  }
  if (s.pairs < s.goal) return null;
  const perPair = s.ms / 1000 / s.goal;
  if (perPair <= 2.5) return 'diamant';
  if (perPair <= 3.5) return 'or';
  if (perPair <= 5) return 'argent';
  if (perPair <= 8) return 'bronze';
  return null;
}

export interface Trophy {
  id: string;
  name: string;
  hint: string;
}

export const TROPHIES: Trophy[] = [
  { id: 'first', name: 'Premier concours', hint: 'Jouer un concours' },
  { id: 'p10', name: '10 en 60 s', hint: '10 paires en 60 secondes' },
  { id: 'p20', name: '20 en 60 s', hint: '20 paires en 60 secondes' },
  { id: 'p30', name: '30 en 60 s', hint: '30 paires en 60 secondes' },
  { id: 'perfect', name: 'Sans faute', hint: '10 paires ou plus sans erreur' },
  { id: 'flash', name: 'Éclair', hint: '10 paires en moins de 30 secondes' },
  { id: 'gold', name: "Médaille d'or", hint: "Gagner une médaille d'or" },
  { id: 'hundred', name: 'Amoureux de 100', hint: 'Un concours au niveau 100' },
  { id: 'marathon', name: 'Marathon', hint: 'Jouer 10 concours' },
];

/** Trophées gagnés par un joueur, d'après tous ses scores. */
export function trophiesOf(scores: ContestScore[], profileId: string): Set<string> {
  const mine = scores.filter((s) => s.profileId === profileId);
  const got = new Set<string>();
  if (mine.length) got.add('first');
  if (mine.length >= 10) got.add('marathon');
  for (const s of mine) {
    if (s.mode === 'chrono' && s.pairs >= 10) got.add('p10');
    if (s.mode === 'chrono' && s.pairs >= 20) got.add('p20');
    if (s.mode === 'chrono' && s.pairs >= 30) got.add('p30');
    if (s.pairs >= 10 && s.misses === 0) got.add('perfect');
    if (s.mode === 'race' && s.goal >= 10 && s.pairs >= s.goal && s.ms / s.goal <= 3000) got.add('flash');
    if (medalFor(s) === 'or' || medalFor(s) === 'diamant') got.add('gold');
    if (s.level === 'decade') got.add('hundred');
  }
  return got;
}

/** Ce qu'apporte un nouveau score : record personnel, première place, nouveaux trophées. */
export function outcome(state: ProfilesState, s: ContestScore) {
  const before = bestOf(state.scores, s.profileId, s.mode, s.level, s.goal);
  const leader = leaderboard(state, s.mode, s.level, s.goal)[0];
  const had = trophiesOf(state.scores, s.profileId);
  const now = trophiesOf([...state.scores, s], s.profileId);
  const completed = s.mode === 'chrono' || s.pairs >= s.goal;
  return {
    record: completed && !!before && better(s, before),
    first: !before && completed,
    champion: completed && (!leader || better(s, leader.best)),
    newTrophies: TROPHIES.filter((t) => now.has(t.id) && !had.has(t.id)),
  };
}

// ---------- état partagé dans l'appli ----------

export function useProfilesStore() {
  const [state, setState] = useState<ProfilesState>(load);
  const [saveError, setSaveError] = useState(false);

  const commit = useCallback((fn: (s: ProfilesState) => ProfilesState) => {
    setState((prev) => {
      const next = fn(prev);
      setSaveError(!save(next));
      return next;
    });
  }, []);

  const actions = {
    add: (name: string, color: string, photo?: string) => {
      const p: Profile = { id: uid(), name: name.trim() || 'Joueur', color, photo, created: Date.now() };
      commit((s) => ({ ...s, profiles: [...s.profiles, p], current: p.id }));
      return p;
    },
    update: (id: string, patch: Partial<Omit<Profile, 'id'>>) =>
      commit((s) => ({ ...s, profiles: s.profiles.map((p) => (p.id === id ? { ...p, ...patch } : p)) })),
    remove: (id: string) =>
      commit((s) => ({
        profiles: s.profiles.filter((p) => p.id !== id),
        scores: s.scores.filter((x) => x.profileId !== id),
        current: s.current === id ? null : s.current,
      })),
    select: (id: string) => commit((s) => ({ ...s, current: id })),
    addScore: (score: Omit<ContestScore, 'id' | 'date'>) => {
      const full: ContestScore = { ...score, id: uid(), date: Date.now() };
      commit((s) => ({ ...s, scores: [...s.scores, full] }));
      return full;
    },
  };

  return { state, actions, saveError };
}

export type ProfilesStore = ReturnType<typeof useProfilesStore>;
export const ProfilesContext = createContext<ProfilesStore | null>(null);

export function useProfiles(): ProfilesStore {
  const ctx = useContext(ProfilesContext);
  if (!ctx) throw new Error('ProfilesContext manquant');
  return ctx;
}

export const currentProfile = (state: ProfilesState) => state.profiles.find((p) => p.id === state.current) ?? null;

/** « 42,3 s » */
export const formatTime = (ms: number) => `${(ms / 1000).toFixed(1).replace('.', ',')} s`;
