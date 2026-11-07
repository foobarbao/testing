/** Opération travaillée. La soustraction est prévue mais pas encore construite. */
export type Op = 'add' | 'sub';

export interface Exercise {
  op: Op;
  a: number;
  b: number;
  level: number;
}

/** Rang d'une colonne : 0 = unités, 1 = dizaines, 2 = centaines. */
export type Rank = 0 | 1 | 2;

/** Couleur d'un morceau de texte : unités, dizaines, centaines, retenue. */
export type Tone = 'u' | 'd' | 'c' | 'r';

export interface Seg {
  t: string;
  tone?: Tone;
}

/**
 * Où en est une colonne :
 * - pose : les deux nombres sont posés, séparés ;
 * - merged : on a tout réuni dans la colonne ;
 * - grouping : 10 éléments sont mis de côté pour former 1 du rang suivant ;
 * - done : le chiffre du résultat est écrit.
 */
export type Phase = 'pose' | 'merged' | 'grouping' | 'done';

export interface ColState {
  rank: Rank;
  /** Chiffre du premier nombre dans cette colonne (0 s'il n'existe pas). */
  a: number;
  /** Chiffre du second nombre dans cette colonne (0 s'il n'existe pas). */
  b: number;
  hasA: boolean;
  hasB: boolean;
  /** Une retenue est arrivée depuis la colonne de droite. */
  carryIn: boolean;
  /** a + b + retenue. */
  total: number;
  phase: Phase;
  /** Chiffre écrit dans le résultat, une fois connu. */
  result: number | null;
  /** Cette colonne a envoyé une retenue vers la gauche. */
  carriedOut: boolean;
}

export type StepKind = 'pose' | 'add' | 'group' | 'carry' | 'write' | 'done';

export interface Step {
  kind: StepKind;
  /** Colonne concernée, -1 pour la pose et la fin. */
  col: number;
  cols: ColState[];
  /** Phrase lue et affichée par la mascotte. */
  say: string;
  /** Mot clé à mettre en avant dans la phrase (question du moment clé). */
  ask?: string;
  /** Petite note à côté de l'addition posée. */
  note: Seg[];
  /** Valeur atteinte en avançant nombre par nombre (règle, compteur). */
  value: number;
  /** Pas utilisé pour atteindre cette valeur : 1, 10 ou 100. */
  unit: number;
  /**
   * Étape « group » : le complément à 10. Avec 7 + 8, on a déjà 7 ;
   * il en faut 3 (base 7, comp 3) pour faire 10, et il en reste 5.
   */
  comp?: { base: number; comp: number; rest: number };
}

export interface Lesson {
  id: string;
  ex: Exercise;
  result: number;
  /** Nombre de colonnes à afficher. */
  n: number;
  steps: Step[];
}
