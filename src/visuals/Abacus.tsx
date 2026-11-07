import { useWidth } from '../lib/hooks';
import { Columns, Pieces, columnRects } from './Board';
import { GestureLayer } from './Gesture';
import { HEAD, colLeft, type VisualProps } from './common';
import type { Placed } from './pieces';
import type { Lesson } from '../engine/types';

const BEAD_H = 11;
const SLOTS = 19;

function layoutBeads(lesson: Lesson, stepIdx: number, width: number) {
  const { n } = lesson;
  const s = lesson.steps[stepIdx];
  const colW = width / n;
  const beadW = Math.min(46, colW * 0.55);
  const rodTop = HEAD + 6;
  const rodH = SLOTS * BEAD_H + 10;
  const bottom = rodTop + rodH - 4;
  const items: Placed[] = [];
  const rods: { x: number; top: number; h: number }[] = [];
  const tray: { x: number; y: number; w: number }[] = [];

  for (let c = 0; c < n; c++) {
    const cs = s.cols[c];
    const cx = colLeft(c, n, width) + colW / 2;
    rods.push({ x: cx, top: rodTop, h: rodH });
    const x = cx - beadW / 2;
    const stacked = (i: number) => ({ x, y: bottom - (i + 1) * BEAD_H });
    const waiting = (j: number) => ({ x, y: rodTop + 2 + j * BEAD_H });
    const put = (key: string, pos: { x: number; y: number }, cls: string) =>
      items.push({ key, rank: c, x: pos.x, y: pos.y, w: beadW, h: BEAD_H - 1, cls });

    const aKeys = Array.from({ length: cs.a }, (_, i) => `${c}a${i}`);
    const bKeys = Array.from({ length: cs.b }, (_, i) => `${c}b${i}`);
    const kKey = `${c}k`;
    // Sur la tige : le premier nombre en bas, puis le second, puis la retenue.
    const onRod = [...aKeys, ...bKeys, ...(cs.carryIn ? [kKey] : [])];
    const clsOf = (k: string) => (k === kKey ? 'bead carry' : k.includes('b') ? 'bead b' : 'bead');
    const arriving = s.kind === 'carry' && s.col === c - 1;

    switch (cs.phase) {
      case 'pose': {
        aKeys.forEach((k, i) => put(k, stacked(i), clsOf(k)));
        // Les perles à ajouter attendent en haut de la tige.
        const wait = [...(cs.carryIn ? [kKey] : []), ...bKeys];
        wait.forEach((k, j) => put(k, waiting(j), `${clsOf(k)} waiting${k === kKey && arriving ? ' arrive' : ''}`));
        break;
      }
      case 'merged':
        onRod.forEach((k, i) => put(k, stacked(i), clsOf(k)));
        break;
      case 'grouping':
        onRod.forEach((k, i) => put(k, stacked(i), `${clsOf(k)}${i < 10 ? ' grouped' : ''}`));
        tray.push({ x: x - 6, y: bottom - 10 * BEAD_H - 3, w: beadW + 12 });
        break;
      case 'done':
        if (!cs.carriedOut) {
          onRod.forEach((k, i) => put(k, stacked(i), clsOf(k)));
          break;
        }
        onRod.slice(10).forEach((k, i) => put(k, stacked(i), clsOf(k)));
        if (s.kind === 'carry' && s.col === c) {
          onRod.slice(0, 10).forEach((k, i) => put(k, stacked(i), `${clsOf(k)} vanish`));
        }
        break;
    }
  }
  return { items, rods, tray, height: rodTop + rodH + 10 };
}

/** Boulier : 10 perles sur une tige s'échangent contre 1 perle sur la tige de gauche. */
export default function Abacus({ lesson, step, gesture }: VisualProps) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const layout = width ? layoutBeads(lesson, step, width) : null;
  return (
    <div ref={ref} className="vis abacus">
      {layout && (
        <Columns lesson={lesson} step={step} width={width} height={layout.height}>
          <div className="abacus-frame" style={{ top: layout.rods[0].top - 6, height: layout.rods[0].h + 12 }} />
          {layout.rods.map((r, i) => (
            <div key={i} className="rod" style={{ left: r.x - 2, top: r.top, height: r.h }} />
          ))}
          {layout.tray.map((t, i) => (
            <div key={`t${i}`} className="ten-mark" style={{ left: t.x, top: t.y, width: t.w }} />
          ))}
          <Pieces items={layout.items} />
          {gesture && <GestureLayer rects={columnRects(lesson.n, width)} height={layout.height} gesture={gesture} />}
        </Columns>
      )}
    </div>
  );
}
