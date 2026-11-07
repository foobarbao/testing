import type { Lesson } from '../engine/types';
import { HEAD, colLeft } from './common';

export interface Dim {
  w: number;
  h: number;
  /** Écart entre deux éléments posés côte à côte. */
  pitch: number;
}

export interface PiecesConfig {
  lineH: number;
  /** Taille d'un élément, par rang (unités, dizaines, centaines). */
  dims: Dim[];
  /** Taille et écart d'un élément quand on en serre 10 ensemble, par rang. */
  squeeze: { w: number; pitch: number }[];
  /**
   * bundle : les 10 éléments se serrent et deviennent 1 du rang suivant (fagot).
   * exchange : les 10 éléments partent à la banque et sont échangés (pièces).
   */
  style: 'bundle' | 'exchange';
}

export interface Placed {
  key: string;
  rank: number;
  x: number;
  y: number;
  w: number;
  h: number;
  cls: string;
}

export interface Extra {
  key: string;
  kind: 'band' | 'bank';
  x: number;
  y: number;
  w: number;
  label?: string;
  /** Côté où s'affiche l'étiquette de la banque par rapport à x. */
  side?: 'left' | 'right';
  rank: number;
}

export interface Layout {
  items: Placed[];
  extras: Extra[];
  height: number;
}

const ceil = (a: number, b: number) => Math.max(1, Math.ceil(a / b));

export function layoutPieces(lesson: Lesson, stepIdx: number, width: number, cfg: PiecesConfig): Layout {
  const { n } = lesson;
  const s = lesson.steps[stepIdx];
  const colW = width / n;
  const inner = colW - 12;
  const per = cfg.dims.map((d) => Math.max(1, Math.floor((inner - d.w) / d.pitch) + 1));
  const final = lesson.steps[lesson.steps.length - 1].cols;

  let linesA = 1;
  let linesB = 1;
  let linesM = 1;
  final.forEach((cs, c) => {
    linesA = Math.max(linesA, ceil(cs.a, per[c]));
    linesB = Math.max(linesB, ceil(cs.b, per[c]));
    linesM = Math.max(linesM, ceil(cs.total, per[c]));
  });
  const lines = 1 + Math.max(linesA + linesB, linesM);
  const height = HEAD + lines * cfg.lineH + 6;

  const items: Placed[] = [];
  const extras: Extra[] = [];

  const lineY = (line: number, h: number) => HEAD + line * cfg.lineH + (cfg.lineH - h) / 2;
  const groupW = (c: number) => 9 * cfg.squeeze[c].pitch + cfg.squeeze[c].w;
  const groupX = (c: number, rankOfPieces: number) =>
    colLeft(c, n, width) + colW / 2 - groupW(rankOfPieces) / 2;

  for (let c = 0; c < n; c++) {
    const cs = s.cols[c];
    const d = cfg.dims[c];
    const x0 = colLeft(c, n, width) + 6;
    const slot = (i: number, line0: number) => ({
      x: x0 + (i % per[c]) * d.pitch,
      y: lineY(line0 + Math.floor(i / per[c]), d.h),
    });
    const put = (key: string, pos: { x: number; y: number }, cls = '', w = d.w) =>
      items.push({ key, rank: c, x: pos.x, y: pos.y, w, h: d.h, cls });

    const aKeys = Array.from({ length: cs.a }, (_, i) => `${c}a${i}`);
    const bKeys = Array.from({ length: cs.b }, (_, i) => `${c}b${i}`);
    const kKey = `${c}k`;
    const merged = [...(cs.carryIn ? [kKey] : []), ...aKeys, ...bKeys];
    const clsOf = (key: string) => (key === kKey ? 'carry' : '');

    // La retenue qui arrive pendant l'étape « carry » de la colonne de droite.
    const arriving = s.kind === 'carry' && s.col === c - 1;

    switch (cs.phase) {
      case 'pose': {
        aKeys.forEach((k, i) => put(k, slot(i, 1)));
        bKeys.forEach((k, i) => put(k, slot(i, 1 + linesA)));
        if (cs.carryIn && !(arriving && cfg.style === 'bundle')) {
          const pos = { x: colLeft(c, n, width) + colW / 2 - d.w / 2, y: lineY(0, d.h) };
          put(kKey, pos, arriving ? 'carry arrive' : 'carry');
        }
        break;
      }
      case 'merged':
        merged.forEach((k, i) => put(k, slot(i, 1), clsOf(k)));
        break;
      case 'grouping': {
        const sq = cfg.squeeze[c];
        const gx = groupX(c, c);
        // Complément à 10 : les éléments du second nombre qui complètent la dizaine.
        const comp = s.kind === 'group' && s.col === c && s.comp ? s.comp.comp : 0;
        const isComp = (k: string) => k.startsWith(`${c}b`) && Number(k.slice(`${c}b`.length)) < comp;
        merged.slice(0, 10).forEach((k, j) =>
          put(k, { x: gx + j * sq.pitch, y: lineY(0, d.h) }, `${clsOf(k)} grouped${isComp(k) ? ' comp' : ''}`, sq.w),
        );
        merged.slice(10).forEach((k, i) => put(k, slot(i, 1), clsOf(k)));
        extras.push(
          cfg.style === 'bundle'
            ? { key: `${c}band`, kind: 'band', x: gx - 3, y: lineY(0, d.h) + d.h / 2 - 3, w: groupW(c) + 6, rank: c }
            : { key: `${c}bank`, kind: 'bank', x: gx - 6, y: HEAD + cfg.lineH / 2, w: 0, label: 'À la banque !', side: 'left', rank: c },
        );
        break;
      }
      case 'done': {
        if (!cs.carriedOut) {
          merged.forEach((k, i) => put(k, slot(i, 1), clsOf(k)));
          break;
        }
        merged.slice(10).forEach((k, i) => put(k, slot(i, 1), clsOf(k)));
        if (s.kind === 'carry' && s.col === c) {
          const sq = cfg.squeeze[c];
          const nd = cfg.dims[c + 1];
          const gx = groupX(c + 1, c);
          const y = lineY(0, d.h) + (d.h - nd.h) / 2;
          merged.slice(0, 10).forEach((k, j) =>
            items.push({
              key: k,
              rank: c,
              x: gx + j * sq.pitch,
              y: cfg.style === 'bundle' ? lineY(0, nd.h) : y,
              w: sq.w,
              h: cfg.style === 'bundle' ? nd.h : d.h,
              cls: `${clsOf(k)} ${cfg.style === 'bundle' ? `carried as${c + 1}` : 'exchanged'}`,
            }),
          );
          if (cfg.style === 'bundle') {
            extras.push({ key: `${c}band`, kind: 'band', x: gx - 2, y: lineY(0, nd.h) + nd.h / 2 - 3, w: groupW(c) + 4, rank: c });
          } else {
            const label = `10 × ${[1, 10, 100][c]} € = ${[10, 100, 1000][c]} €`;
            extras.push({ key: `${c}bank`, kind: 'bank', x: gx + groupW(c) + 6, y: HEAD + cfg.lineH / 2, w: 0, label, rank: c });
          }
        }
        break;
      }
    }
  }
  return { items, extras, height };
}
