/**
 * Quantités manipulées par l'enfant : combien d'éléments dans chaque colonne
 * (index 0 = unités, 1 = dizaines, 2 = centaines).
 */
export type Counts = number[];

/** Au-delà, la colonne déborde de l'écran : on bloque l'ajout. */
export const MAX_PER_COL = 19;

export const valueOf = (c: Counts) => c.reduce((acc, k, r) => acc + k * 10 ** r, 0);
export const isTidy = (c: Counts) => c.every((k) => k <= 9);

/** Nombre de colonnes pour afficher un nombre (deux au minimum). */
export const colsFor = (n: number) => Math.max(2, String(Math.max(0, n)).length);

/** Écriture rangée d'un nombre : 47 → [7, 4]. */
export function countsFor(n: number, cols: number): Counts {
  return Array.from({ length: cols }, (_, r) => Math.floor(n / 10 ** r) % 10);
}

export const canAdd = (c: Counts, r: number) => c[r] < MAX_PER_COL;
export const canRemove = (c: Counts, r: number) => c[r] > 0;
export const canGroup = (c: Counts, r: number) => r + 1 < c.length && c[r] >= 10 && c[r + 1] < MAX_PER_COL;
export const canBreak = (c: Counts, r: number) => r > 0 && c[r] > 0 && c[r - 1] + 10 <= MAX_PER_COL;

function set(c: Counts, changes: Record<number, number>): Counts {
  return c.map((k, r) => k + (changes[r] ?? 0));
}

export const add = (c: Counts, r: number) => (canAdd(c, r) ? set(c, { [r]: 1 }) : c);
export const remove = (c: Counts, r: number) => (canRemove(c, r) ? set(c, { [r]: -1 }) : c);
export const group = (c: Counts, r: number) => (canGroup(c, r) ? set(c, { [r]: -10, [r + 1]: 1 }) : c);
export const breakOne = (c: Counts, r: number) => (canBreak(c, r) ? set(c, { [r]: -1, [r - 1]: 10 }) : c);

/** Noms des éléments de chaque modèle, au singulier et au pluriel. */
export interface Names {
  one: string[];
  many: string[];
  /** « un fagot », « un billet de 10 € »… */
  article: string[];
  groupVerb: string[];
  breakVerb: string[];
  /** Consigne très courte quand une colonne a 10 éléments ou plus. */
  groupShort: string[];
}

export const STICK_NAMES: Names = {
  one: ['bâtonnet', 'fagot', 'paquet'],
  many: ['bâtonnets', 'fagots', 'paquets'],
  article: ['un bâtonnet', 'un fagot', 'un gros paquet'],
  groupVerb: ['Faire un fagot', 'Faire un paquet'],
  breakVerb: ['', 'Défaire le fagot', 'Défaire le paquet'],
  groupShort: ['Fais un fagot !', 'Fais un paquet !'],
};

export const MONEY_NAMES: Names = {
  one: ['pièce de 1 €', 'billet de 10 €', 'billet de 100 €'],
  many: ['pièces de 1 €', 'billets de 10 €', 'billets de 100 €'],
  article: ['une pièce de 1 €', 'un billet de 10 €', 'un billet de 100 €'],
  groupVerb: ['Échanger contre 10 €', 'Échanger contre 100 €'],
  breakVerb: ['', 'Faire la monnaie', 'Faire la monnaie'],
  groupShort: ['Va à la banque !', 'Va à la banque !'],
};

export const BEAD_NAMES: Names = {
  one: ['perle verte', 'perle bleue', 'perle violette'],
  many: ['perles vertes', 'perles bleues', 'perles violettes'],
  article: ['une perle verte', 'une perle bleue', 'une perle violette'],
  groupVerb: ['Échanger 10 perles', 'Échanger 10 perles'],
  breakVerb: ['', 'Casser en 10', 'Casser en 10'],
  groupShort: ['Échange 10 perles !', 'Échange 10 perles !'],
};

const RANK = ['unités', 'dizaines', 'centaines'];
const RANK_ONE = ['unité', 'dizaine', 'centaine'];

/** « 4 dizaines et 7 unités » */
export function decompose(n: number, cols = colsFor(n)): string {
  const parts = countsFor(n, cols)
    .map((k, r) => (k ? `${k} ${k > 1 ? RANK[r] : RANK_ONE[r]}` : ''))
    .reverse()
    .filter(Boolean);
  if (!parts.length) return '0';
  return parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(', ')} et ${parts[parts.length - 1]}`;
}

export interface Verdict {
  ok: boolean;
  /** Le total est juste mais une colonne a 10 éléments ou plus. */
  untidy?: number;
  /** Phrase complète, lue par la voix. */
  text: string;
  /** Trois ou quatre mots affichés à l'écran. */
  short: string;
}

/**
 * Vérifie une construction faite avec des éléments à regrouper.
 * `reveal` : on peut dire le nombre visé (construire un nombre) ou non (réponse à un calcul).
 */
export function judgeCounts(c: Counts, target: number, names: Names, reveal: boolean): Verdict {
  const v = valueOf(c);
  if (v === target) {
    if (isTidy(c)) return { ok: true, short: 'Bravo !', text: `Bravo ! ${target}, c'est ${decompose(target, c.length)}.` };
    const r = c.findIndex((k) => k >= 10);
    return {
      untidy: r,
      ok: false,
      short: names.groupShort[r],
      text: `Presque ! Il y a ${c[r]} ${names.many[r]} : avec 10 ${names.many[r]}, on fait ${names.article[r + 1]}.`,
    };
  }
  if (reveal) {
    return v < target
      ? { ok: false, short: 'Il en manque', text: `Pas encore : ça fait ${v}. On veut ${target}, il en manque.` }
      : { ok: false, short: "C'est trop", text: `Un peu trop : ça fait ${v}. On veut ${target}.` };
  }
  return { ok: false, short: `Ça fait ${v}`, text: `Ça fait ${v}. Vérifie ce que tu as ajouté.` };
}
