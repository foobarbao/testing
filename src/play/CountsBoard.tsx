import { useRef, type PointerEvent as ReactPointerEvent } from 'react';
import { Ghost, inside, useDrag } from '../lib/drag';
import { useWidth } from '../lib/hooks';
import { ColumnsFrame, Extras } from '../visuals/Board';
import { MONEY_CONFIG, MONEY_LABEL } from '../visuals/Money';
import { STICKS_CONFIG } from '../visuals/Sticks';
import type { Placed } from '../visuals/pieces';
import { RANK_LABEL } from '../visuals/common';
import { layoutFreeBeads, layoutFreePieces, type Anim, type Ids } from './layout';
import { canAdd, canBreak, canGroup, canRemove, type Counts, type Names } from './model';

export type CountsKind = 'sticks' | 'money' | 'abacus';

interface DragItem {
  from: 'board' | 'supply';
  rank: number;
}

interface Props {
  kind: CountsKind;
  ids: Ids;
  anim: Anim | null;
  fresh: Set<string>;
  names: Names;
  /** Colonne à signaler (trop d'éléments), ou -1. */
  hintCol: number;
  /** Réserve visible : on peut ajouter et retirer des éléments. */
  supply: boolean;
  locked: boolean;
  onAdd: (r: number) => void;
  onRemove: (r: number) => void;
  onGroup: (r: number) => void;
  onBreak: (r: number) => void;
  onRefuse: (text: string) => void;
}

function pieceSize(kind: CountsKind, rank: number) {
  if (kind === 'abacus') return { width: 40, height: 12 };
  const d = (kind === 'sticks' ? STICKS_CONFIG : MONEY_CONFIG).dims[rank];
  return { width: d.w, height: d.h };
}

function PieceFace({ kind, rank }: { kind: CountsKind; rank: number }) {
  return kind === 'money' ? <span>{MONEY_LABEL[rank]}</span> : null;
}

/** Plateau en colonnes où l'enfant pose, retire, regroupe et casse des éléments. */
export default function CountsBoard(props: Props) {
  const { kind, ids, anim, fresh, names, hintCol, supply, locked } = props;
  const [ref, width] = useWidth<HTMLDivElement>();
  const boardRef = useRef<HTMLDivElement>(null);
  const n = ids.length;
  const counts: Counts = ids.map((l) => l.length);
  const busy = locked || anim !== null;

  const { drag, start } = useDrag<DragItem>({
    onTap: (item) => {
      if (!busy && item.from === 'supply') props.onAdd(item.rank);
    },
    onDrop: (item, x, y) => {
      if (busy) return;
      const board = boardRef.current;
      const onBoard = inside(board, x, y, 12);
      if (item.from === 'supply') {
        if (onBoard) props.onAdd(item.rank);
        return;
      }
      if (!onBoard) {
        if (supply) props.onRemove(item.rank);
        return;
      }
      const rect = board!.getBoundingClientRect();
      const p = Math.min(n - 1, Math.max(0, Math.floor(((x - rect.left) / rect.width) * n)));
      const to = n - 1 - p;
      const r = item.rank;
      if (to === r) return;
      if (to === r + 1) {
        if (canGroup(counts, r)) props.onGroup(r);
        else props.onRefuse(`Il faut 10 ${names.many[r]} pour faire ${names.article[r + 1]}.`);
      } else if (to === r - 1) {
        if (canBreak(counts, r)) props.onBreak(r);
        else props.onRefuse(`Il y a déjà trop de ${names.many[r - 1]} pour casser ${names.article[r]}.`);
      } else {
        props.onRefuse('Une colonne à la fois : 10 éléments font 1 élément de la colonne juste à gauche.');
      }
    },
  });

  const grab = (rank: number, from: DragItem['from']) => (e: ReactPointerEvent<HTMLElement>) => {
    if (!busy) start({ rank, from }, e);
  };

  const renderPiece = (p: Placed) => (
    <div
      key={p.key}
      className={`pc r${p.rank} ${p.cls}`}
      style={{ transform: `translate(${p.x}px, ${p.y}px)`, width: p.w, height: p.h }}
      onPointerDown={grab(p.rank, 'board')}
    >
      <PieceFace kind={kind} rank={p.rank} />
    </div>
  );

  let content = null;
  let height = 200;
  if (width) {
    if (kind === 'abacus') {
      const l = layoutFreeBeads(ids, width, anim, fresh);
      height = l.height;
      content = (
        <>
          <div className="abacus-frame" style={{ top: l.rodTop - 6, height: l.rodH + 12 }} />
          {l.rods.map((x, i) => (
            <div key={i} className="rod" style={{ left: x - 2, top: l.rodTop, height: l.rodH }} />
          ))}
          {l.marks.map((m, i) => (
            <div key={`m${i}`} className="ten-mark" style={{ left: m.x, top: m.y, width: m.w }} />
          ))}
          {l.items.map(renderPiece)}
        </>
      );
    } else {
      const cfg = kind === 'sticks' ? STICKS_CONFIG : MONEY_CONFIG;
      const l = layoutFreePieces(ids, width, cfg, anim, fresh);
      height = l.height;
      content = (
        <>
          {l.items.map(renderPiece)}
          <Extras extras={l.extras} />
        </>
      );
    }
  }

  const order = Array.from({ length: n }, (_, i) => n - 1 - i);
  const dragSize = drag ? pieceSize(kind, drag.item.rank) : null;

  return (
    <div className={`play vis ${kind}`}>
      <div ref={ref}>
        <div ref={boardRef} className={`play-board ${drag ? 'dragging' : ''}`}>
          {width > 0 && (
            <ColumnsFrame n={n} width={width} height={height} active={-1} counts={counts} hint={hintCol}>
              {content}
            </ColumnsFrame>
          )}
        </div>
      </div>

      <div className="col-tools" style={{ gridTemplateColumns: `repeat(${n}, 1fr)` }}>
        {order.map((r) => (
          <div key={r} className="col-tool">
            {supply && (
              <div className="pm">
                <button
                  className="pm-btn"
                  onClick={() => props.onRemove(r)}
                  disabled={busy || !canRemove(counts, r)}
                  aria-label={`Retirer ${names.article[r]}`}
                >
                  −
                </button>
                <button
                  className="pm-btn"
                  onClick={() => props.onAdd(r)}
                  disabled={busy || !canAdd(counts, r)}
                  aria-label={`Ajouter ${names.article[r]}`}
                >
                  +
                </button>
              </div>
            )}
            {canGroup(counts, r) && (
              <button
                className={`tool group ${hintCol === r ? 'pulse' : ''}`}
                onClick={() => props.onGroup(r)}
                disabled={busy}
              >
                ← {names.groupVerb[r]}
              </button>
            )}
            {canBreak(counts, r) && (
              <button className="tool break" onClick={() => props.onBreak(r)} disabled={busy}>
                {names.breakVerb[r]} →
              </button>
            )}
          </div>
        ))}
      </div>

      {supply && (
        <div className="supply">
          <span className="supply-label">Réserve</span>
          {order.map((r) => (
            <button
              key={r}
              className="supply-item"
              onPointerDown={grab(r, 'supply')}
              onKeyDown={(e) => {
                if ((e.key === 'Enter' || e.key === ' ') && !busy) {
                  e.preventDefault();
                  props.onAdd(r);
                }
              }}
              aria-label={`Ajouter ${names.article[r]} (${RANK_LABEL[r].toLowerCase()})`}
            >
              <span className={`pc r${r} supply-pc`} style={pieceSize(kind, r)}>
                <PieceFace kind={kind} rank={r} />
              </span>
              <span className="supply-name">{names.one[r]}</span>
            </button>
          ))}
        </div>
      )}

      <Ghost drag={drag} className={`vis ${kind}`}>
        {drag && dragSize && (
          <span className={`pc r${drag.item.rank} supply-pc`} style={dragSize}>
            <PieceFace kind={kind} rank={drag.item.rank} />
          </span>
        )}
      </Ghost>
    </div>
  );
}
