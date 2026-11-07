import { useCallback, useEffect, useRef, useState } from 'react';
import { useWidth } from '../lib/hooks';
import { useSound } from '../lib/sound';
import { useSay } from '../lib/speech';
import type { BuildModel } from '../lib/storage';
import { GearsScene } from '../visuals/Gears';
import { RulerScene, type Hop } from '../visuals/Ruler';
import CountsBoard from './CountsBoard';
import type { Anim, Ids } from './layout';
import {
  BEAD_NAMES,
  MONEY_NAMES,
  STICK_NAMES,
  canAdd,
  canBreak,
  canGroup,
  canRemove,
  decompose,
  judgeCounts,
  valueOf,
  type Counts,
  type Names,
} from './model';

export const MODELS: { id: BuildModel; name: string }[] = [
  { id: 'sticks', name: 'Bâtonnets' },
  { id: 'money', name: 'Monnaie' },
  { id: 'abacus', name: 'Boulier' },
  { id: 'ruler', name: 'Règle' },
  { id: 'gears', name: 'Roues' },
];

const NAMES: Record<string, Names> = { sticks: STICK_NAMES, money: MONEY_NAMES, abacus: BEAD_NAMES };

interface Props {
  /** Nombre de colonnes. */
  n: number;
  /** Ce qui est posé au départ (pour la règle et les roues : sa valeur). */
  start: Counts;
  target: number;
  /** Peut-on dire le nombre visé dans les indices ? */
  reveal: boolean;
  model: BuildModel;
  onModel: (m: BuildModel) => void;
  prompt: (m: BuildModel) => string;
  /** Change quand on passe à un autre nombre ou calcul. */
  resetKey: string;
  dur: number;
  solved: boolean;
  onSolved: () => void;
}

type Feedback = { text: string; tone: '' | 'good' | 'soft' };

export default function BuildPanel(props: Props) {
  const { n, start, target, reveal, model, dur, solved } = props;
  const play = useSound();
  const say = useSay();
  const nextId = useRef(0);
  const timers = useRef<number[]>([]);
  const startValue = valueOf(start);

  const makeIds = useCallback(
    (c: Counts): Ids => c.map((k) => Array.from({ length: k }, () => `p${nextId.current++}`)),
    [],
  );

  const [ids, setIds] = useState<Ids>(() => makeIds(start));
  const [anim, setAnim] = useState<Anim | null>(null);
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const [hintCol, setHintCol] = useState(-1);
  const [fb, setFb] = useState<Feedback>({ text: '', tone: '' });
  const [hops, setHops] = useState<Hop[]>([]);
  const [gv, setGv] = useState(startValue);
  const [flash, setFlash] = useState<{ id: number; rank: number } | null>(null);

  const clearTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };
  const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms));

  // Nouveau nombre ou nouveau modèle : on repart de la situation de départ.
  const startKey = start.join(',');
  useEffect(() => {
    clearTimers();
    setIds(makeIds(start));
    setAnim(null);
    setFresh(new Set());
    setHintCol(-1);
    setFb({ text: '', tone: '' });
    setHops([]);
    setGv(startValue);
    say(props.prompt(model));
    return clearTimers;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.resetKey, model, startKey]);

  const counts: Counts = ids.map((l) => l.length);
  const names = NAMES[model] ?? STICK_NAMES;
  const locked = solved;

  const soft = (text: string) => {
    setFb({ text, tone: 'soft' });
    say(text);
  };
  const touched = () => {
    if (fb.tone) setFb({ text: '', tone: '' });
  };

  // ---------- éléments à regrouper ----------
  const onAdd = (r: number) => {
    if (!canAdd(counts, r)) return soft(`Cette colonne est pleine : regroupe d'abord 10 ${names.many[r]}.`);
    const id = `p${nextId.current++}`;
    setIds((prev) => prev.map((l, c) => (c === r ? [...l, id] : l)));
    setFresh(new Set([id]));
    play('pop');
    touched();
  };
  const onRemove = (r: number) => {
    if (!canRemove(counts, r)) return;
    setIds((prev) => prev.map((l, c) => (c === r ? l.slice(0, -1) : l)));
    touched();
  };
  const onGroup = (r: number) => {
    if (anim || !canGroup(counts, r)) return;
    touched();
    setHintCol(-1);
    setAnim({ kind: 'group', r, stage: 1 });
    play('pop');
    later(() => {
      setAnim({ kind: 'group', r, stage: 2 });
      play('whoosh');
    }, dur * 1.1);
    later(() => {
      const id = `p${nextId.current++}`;
      setIds((prev) => prev.map((l, c) => (c === r ? l.slice(10) : c === r + 1 ? [...l, id] : l)));
      // Le fagot est déjà à sa place (les 10 bâtonnets serrés) : pas besoin de le faire apparaître.
      setFresh(model === 'sticks' ? new Set() : new Set([id]));
      setAnim(null);
    }, dur * 2.2);
    say(`10 ${names.many[r]} donnent ${names.article[r + 1]} !`);
  };
  const onBreak = (r: number) => {
    if (anim || !canBreak(counts, r)) return;
    touched();
    setAnim({ kind: 'break', r, stage: 1 });
    later(() => {
      setAnim({ kind: 'break', r, stage: 2 });
      play('whoosh');
    }, dur * 0.6);
    later(() => {
      const added = Array.from({ length: 10 }, () => `p${nextId.current++}`);
      setIds((prev) => prev.map((l, c) => (c === r ? l.slice(0, -1) : c === r - 1 ? [...l, ...added] : l)));
      setFresh(new Set(added));
      setAnim(null);
    }, dur * 1.6);
    say(`${names.article[r]}, c'est 10 ${names.many[r - 1]}.`);
  };

  // ---------- règle ----------
  const frog = startValue + hops.reduce((acc, h) => acc + (h.to - h.from), 0);
  const hop = (rank: number) => {
    const size = 10 ** rank;
    if (frog + size > 999) return soft('La règle s’arrête à 999.');
    const next = frog + size;
    if (Math.floor(next / (size * 10)) > Math.floor(frog / (size * 10))) {
      setFlash({ id: Date.now(), rank: rank + 1 });
      play('click');
    } else play('pop');
    setHops((h) => [...h, { from: frog, to: next, rank }]);
    touched();
  };
  const undoHop = () => {
    setHops((h) => h.slice(0, -1));
    touched();
  };
  const lastRank = hops.length ? hops[hops.length - 1].rank : 0;
  const hopCount = (rank: number) => hops.filter((h) => h.rank === rank).length;

  // ---------- roues ----------
  const turn = (rank: number, dir: 1 | -1) => {
    const next = gv + dir * 10 ** rank;
    if (next < 0 || next > 999) return;
    // Retenue ou emprunt quand le chiffre de cette roue passe de 9 à 0 (ou de 0 à 9).
    const digit = Math.floor(gv / 10 ** rank) % 10;
    if ((dir === 1 && digit === 9) || (dir === -1 && digit === 0)) {
      if (rank + 1 < n) {
        setFlash({ id: Date.now(), rank: rank + 1 });
        play('click');
      }
    } else play('pop');
    setGv(next);
    touched();
  };

  // ---------- vérification ----------
  const check = () => {
    if (solved || anim) return;
    let ok = false;
    let text = '';
    if (model === 'ruler' || model === 'gears') {
      const v = model === 'ruler' ? frog : gv;
      const where = model === 'ruler' ? 'La grenouille est sur' : 'Le compteur affiche';
      if (v === target) {
        ok = true;
        text = `Bravo ! ${target}, c'est ${decompose(target, n)}.`;
      } else if (!reveal) text = `${where} ${v}. Vérifie ce que tu as ajouté.`;
      else if (v < target) text = `${where} ${v}. On veut ${target} : continue !`;
      else text = `${where} ${v} : c'est trop. On veut ${target}.`;
    } else {
      const verdict = judgeCounts(counts, target, names, reveal);
      ok = verdict.ok;
      text = verdict.text;
      setHintCol(verdict.untidy ?? -1);
    }
    if (ok) {
      setFb({ text, tone: 'good' });
      props.onSolved();
      say(text);
    } else {
      soft(text);
      play('soft');
    }
  };

  const [sceneRef, width] = useWidth<HTMLDivElement>();

  return (
    <div className="build-panel">
      <div className="chips" role="group" aria-label="Modèle">
        {MODELS.map((m) => (
          <button key={m.id} className="chip" aria-pressed={model === m.id} onClick={() => props.onModel(m.id)}>
            <span className="chip-dot" />
            {m.name}
          </button>
        ))}
      </div>
      <p className="build-prompt">{props.prompt(model)}</p>

      <section className="panel">
        {model === 'ruler' ? (
          <div ref={sceneRef} className="vis ruler">
            {width > 0 && (
              <RulerScene
                width={width}
                v={frog}
                hops={hops}
                start={startValue}
                zoomUnit={10 ** lastRank}
                dur={dur}
                flash={flash}
              />
            )}
          </div>
        ) : model === 'gears' ? (
          <div ref={sceneRef} className="vis gears">
            {width > 0 && (
              <GearsScene
                width={width}
                v={gv}
                n={n}
                dur={dur}
                active={-1}
                clic={flash}
                controls={(r) => (
                  <div className="pm">
                    <button className="pm-btn" onClick={() => turn(r, -1)} disabled={locked} aria-label="Reculer d'un cran">
                      ▼
                    </button>
                    <button className="pm-btn" onClick={() => turn(r, 1)} disabled={locked} aria-label="Avancer d'un cran">
                      ▲
                    </button>
                  </div>
                )}
              />
            )}
          </div>
        ) : (
          <CountsBoard
            kind={model}
            ids={ids}
            anim={anim}
            fresh={fresh}
            names={names}
            hintCol={hintCol}
            supply
            locked={locked}
            onAdd={onAdd}
            onRemove={onRemove}
            onGroup={onGroup}
            onBreak={onBreak}
            onRefuse={soft}
          />
        )}
        {model === 'ruler' && (
          <>
            <div className="hop-tools">
              {Array.from({ length: n }, (_, r) => (
                <button key={r} className={`btn hop-btn r${r}`} onClick={() => hop(r)} disabled={locked}>
                  +{10 ** r}
                  <small>{['petit bond', 'grand bond', 'très grand bond'][r]}</small>
                </button>
              ))}
              <button className="btn" onClick={undoHop} disabled={locked || !hops.length}>
                Annuler
              </button>
            </div>
            <p className="hop-count">
              {Array.from({ length: n }, (_, r) => `${['Petits bonds', 'Grands bonds', 'Très grands bonds'][r]} : ${hopCount(r)}`).join(' · ')}
            </p>
          </>
        )}
      </section>

      <p className={`feedback ${fb.tone}`} aria-live="polite">
        {fb.text}
      </p>
      {!solved && (
        <button className="btn primary" onClick={check} disabled={anim !== null}>
          J'ai fini !
        </button>
      )}
    </div>
  );
}
