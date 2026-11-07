import { HEAD, colLeft } from '../visuals/common';
import type { Extra, PiecesConfig, Placed } from '../visuals/pieces';
import { MAX_PER_COL } from './model';

/** Identifiants des éléments posés dans chaque colonne (0 = unités). */
export type Ids = string[][];

/**
 * Animation en cours :
 * - group : les 10 premiers éléments de la colonne r se serrent (étape 1)
 *   puis partent dans la colonne de gauche (étape 2) ;
 * - break : le dernier élément de la colonne r part à droite (étape 1 et 2) pour devenir 10.
 */
export interface Anim {
  kind: 'group' | 'break';
  r: number;
  stage: 1 | 2;
}

const ceil = (a: number, b: number) => Math.max(1, Math.ceil(a / b));

export function layoutFreePieces(ids: Ids, width: number, cfg: PiecesConfig, anim: Anim | null, fresh: Set<string>) {
  const n = ids.length;
  const colW = width / n;
  const inner = colW - 12;
  const per = cfg.dims.map((d) => Math.max(1, Math.floor((inner - d.w) / d.pitch) + 1));
  let lines = 2;
  for (let c = 0; c < n; c++) lines = Math.max(lines, ceil(MAX_PER_COL, per[c]));
  const height = HEAD + (1 + lines) * cfg.lineH + 6;
  const lineY = (line: number, h: number) => HEAD + line * cfg.lineH + (cfg.lineH - h) / 2;
  const groupW = (c: number) => 9 * cfg.squeeze[c].pitch + cfg.squeeze[c].w;
  const centerX = (c: number, w: number) => colLeft(c, n, width) + colW / 2 - w / 2;

  const items: Placed[] = [];
  const extras: Extra[] = [];
  /** Place du i-ème élément d'une colonne. */
  const slot = (c: number, i: number) => {
    const d = cfg.dims[c];
    return { x: colLeft(c, n, width) + 6 + (i % per[c]) * d.pitch, y: lineY(1 + Math.floor(i / per[c]), d.h) };
  };

  for (let c = 0; c < n; c++) {
    const d = cfg.dims[c];
    let list = ids[c];
    const cls = (id: string) => (fresh.has(id) ? 'pop' : '');

    if (anim?.kind === 'group' && anim.r === c) {
      const sq = cfg.squeeze[c];
      const target = anim.stage === 1 ? c : c + 1;
      const nd = cfg.dims[target];
      // Étape 1 : on serre les 10 en haut de la colonne. Étape 2 : ils filent à la place du nouvel élément.
      const dest = slot(c + 1, ids[c + 1].length);
      const gx = anim.stage === 1 ? centerX(c, groupW(c)) : dest.x;
      const y = anim.stage === 1 ? lineY(0, cfg.style === 'bundle' ? nd.h : d.h) : dest.y;
      list.slice(0, 10).forEach((id, j) =>
        items.push({
          key: id,
          rank: c,
          x: gx + j * sq.pitch,
          y,
          w: sq.w,
          h: cfg.style === 'bundle' ? nd.h : d.h,
          cls: anim.stage === 1 ? 'grouped' : cfg.style === 'bundle' ? `carried as${c + 1}` : 'exchanged',
        }),
      );
      if (cfg.style === 'bundle') {
        extras.push({ key: `band${c}`, kind: 'band', x: gx - 3, y: y + nd.h / 2 - 3, w: groupW(c) + 6, rank: c });
      } else if (anim.stage === 1) {
        extras.push({ key: `bank${c}`, kind: 'bank', x: gx - 6, y: HEAD + cfg.lineH / 2, w: 0, label: 'À la banque !', side: 'left', rank: c });
      }
      list = list.slice(10);
    }
    if (anim?.kind === 'break' && anim.r === c) {
      const id = list[list.length - 1];
      const dest = slot(c - 1, ids[c - 1].length);
      const pos = anim.stage === 1 ? { x: centerX(c, d.w), y: lineY(0, d.h) } : dest;
      items.push({ key: id, rank: c, x: pos.x, y: pos.y, w: d.w, h: d.h, cls: anim.stage === 2 ? 'exchanged' : '' });
      list = list.slice(0, -1);
    }
    list.forEach((id, i) => items.push({ key: id, rank: c, ...slot(c, i), w: d.w, h: d.h, cls: cls(id) }));
  }
  return { items, extras, height, colW };
}

const BEAD_H = 11;

export function layoutFreeBeads(ids: Ids, width: number, anim: Anim | null, fresh: Set<string>) {
  const n = ids.length;
  const colW = width / n;
  const beadW = Math.min(46, colW * 0.55);
  const rodTop = HEAD + 6;
  const rodH = MAX_PER_COL * BEAD_H + 10;
  const bottom = rodTop + rodH - 4;
  const items: Placed[] = [];
  const rods: number[] = [];
  const marks: { x: number; y: number; w: number }[] = [];

  for (let c = 0; c < n; c++) {
    const cx = colLeft(c, n, width) + colW / 2;
    rods.push(cx);
    const x = cx - beadW / 2;
    const list = ids[c];
    list.forEach((id, i) => {
      let cls = `bead${fresh.has(id) ? ' pop' : ''}`;
      if (anim?.kind === 'group' && anim.r === c && i < 10) cls += anim.stage === 1 ? ' grouped' : ' vanish';
      if (anim?.kind === 'break' && anim.r === c && i === list.length - 1) cls += anim.stage === 1 ? ' grouped' : ' vanish';
      items.push({ key: id, rank: c, x, y: bottom - (i + 1) * BEAD_H, w: beadW, h: BEAD_H - 1, cls });
    });
    if (anim?.kind === 'group' && anim.r === c && anim.stage === 1) {
      marks.push({ x: x - 6, y: bottom - 10 * BEAD_H - 3, w: beadW + 12 });
    }
  }
  return { items, rods, marks, rodTop, rodH, height: rodTop + rodH + 10, colW };
}
