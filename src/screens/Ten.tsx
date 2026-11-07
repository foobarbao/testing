import { useEffect, useMemo, useRef, useState } from 'react';
import { Back, Replay, Speaker, Star } from '../components/Icons';
import { bubbles, makeRound, pairTarget, pairsBoard, starsFor, type Card, type TenLevel, type TenRound } from '../engine/tens';
import { useSound } from '../lib/sound';
import { canSpeak, speak, useSay } from '../lib/speech';
import type { Prefs } from '../lib/storage';
import FrogRuler from '../ten/FrogRuler';
import TenFrame from '../ten/TenFrame';
import { Burst } from './Exercise';

type Game = 'box' | 'frog' | 'pairs';

const GAMES: { id: Game; name: string }[] = [
  { id: 'box', name: 'Boîte de 10' },
  { id: 'frog', name: 'Grenouille' },
  { id: 'pairs', name: 'Amoureux de 10' },
];

const ROUNDS = 10;
const BOARDS = 3;

interface Props {
  prefs: Prefs;
  update: (p: Partial<Prefs> | ((p: Prefs) => Partial<Prefs>)) => void;
  onBack: () => void;
}

function GameIcon({ id }: { id: Game }) {
  if (id === 'box') {
    return (
      <svg viewBox="0 0 64 30" className="game-icon" aria-hidden="true">
        {Array.from({ length: 10 }, (_, i) => (
          <circle key={i} cx={8 + (i % 5) * 12} cy={i < 5 ? 8 : 22} r={4.5} fill={i < 7 ? 'var(--units)' : 'var(--carry)'} />
        ))}
      </svg>
    );
  }
  if (id === 'frog') {
    return (
      <svg viewBox="0 0 64 30" className="game-icon" aria-hidden="true">
        <rect x="2" y="24" width="60" height="2.5" fill="var(--ink)" />
        {[0, 1, 2].map((i) => (
          <path key={i} d={`M${34 + i * 9} 23 Q${38.5 + i * 9} 10 ${43 + i * 9} 23`} fill="none" stroke="var(--carry)" strokeWidth="2.2" />
        ))}
        <circle cx="26" cy="17" r="6" fill="var(--units)" />
        <rect x="60" y="12" width="3" height="12" fill="var(--carry)" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 64 30" className="game-icon" aria-hidden="true">
      <circle cx="18" cy="15" r="12" fill="var(--tens)" />
      <circle cx="46" cy="15" r="12" fill="var(--carry)" />
      <text x="18" y="20" textAnchor="middle" fontSize="13" fontWeight="700" fill="#fff">3</text>
      <text x="46" y="20" textAnchor="middle" fontSize="13" fontWeight="700" fill="#fff">7</text>
    </svg>
  );
}

/** Le jeu des compléments à 10. */
export default function Ten({ prefs, update, onBack }: Props) {
  const [game, setGame] = useState<Game | null>(null);
  const [level, setLevel] = useState<TenLevel>('ten');
  const [run, setRun] = useState(0);

  const best = (g: Game) => prefs.tenBest?.[`${g}-${level}`] ?? 0;

  if (!game) {
    return (
      <main className="screen">
        <header className="bar">
          <button className="icon-btn" onClick={onBack} aria-label="Retour">
            <Back />
          </button>
          <h1 className="bar-title">Fais 10 !</h1>
        </header>
        <div className="answer-tabs" role="tablist" aria-label="Niveau">
          <button role="tab" className="answer-tab big-tab" aria-selected={level === 'ten'} onClick={() => setLevel('ten')}>
            7 + ? = 10
          </button>
          <button role="tab" className="answer-tab big-tab" aria-selected={level === 'decade'} onClick={() => setLevel('decade')}>
            47 + ? = 50
          </button>
        </div>
        <div className="game-list">
          {GAMES.map((g) => (
            <button key={g.id} className={`game-card g-${g.id}`} onClick={() => setGame(g.id)}>
              <GameIcon id={g.id} />
              <b>{g.name}</b>
              <span className="stars" aria-label={`Record : ${best(g.id)} étoiles`}>
                {[0, 1, 2].map((i) => (
                  <Star key={i} filled={i < best(g.id)} />
                ))}
              </span>
            </button>
          ))}
        </div>
      </main>
    );
  }

  return (
    <TenGame
      key={`${game}-${level}-${run}`}
      game={game}
      level={level}
      prefs={prefs}
      onBack={() => setGame(null)}
      onReplay={() => setRun((r) => r + 1)}
      onEnd={(stars) =>
        update((p) => {
          const key = `${game}-${level}`;
          const prev = p.tenBest?.[key] ?? 0;
          return { tenBest: { ...p.tenBest, [key]: Math.max(prev, stars) } };
        })
      }
    />
  );
}

interface GameProps {
  game: Game;
  level: TenLevel;
  prefs: Prefs;
  onBack: () => void;
  onReplay: () => void;
  onEnd: (stars: number) => void;
}

function TenGame({ game, level, prefs, onBack, onReplay, onEnd }: GameProps) {
  const play = useSound();
  const say = useSay();
  const total = game === 'pairs' ? BOARDS * 4 : ROUNDS;
  const [done, setDone] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [burst, setBurst] = useState(0);
  const [over, setOver] = useState(false);
  const ended = useRef(false);
  const dur = 600 / prefs.speed;

  const win = (firstTry: boolean) => {
    if (firstTry) setScore((s) => s + 1);
    setStreak((s) => (firstTry ? s + 1 : 0));
    setDone((d) => d + 1);
  };

  useEffect(() => {
    if (done >= total && !ended.current) {
      ended.current = true;
      const id = window.setTimeout(() => {
        setOver(true);
        setBurst((b) => b + 1);
        play('fanfare');
        onEnd(starsFor(score, total));
        say(`Bravo ! Tu as trouvé ${score} sur ${total} du premier coup.`);
      }, dur * 2.5);
      return () => window.clearTimeout(id);
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  const stars = starsFor(score, total);

  return (
    <main className="screen ten-game">
      <header className="bar">
        <button className="icon-btn" onClick={onBack} aria-label="Retour aux jeux">
          <Back />
        </button>
        <div className="progress" aria-label={`${done} sur ${total}`}>
          {Array.from({ length: total }, (_, i) => (
            <i key={i} className={i < done ? 'on' : ''} />
          ))}
        </div>
        <span className={`streak ${streak >= 2 ? 'on' : ''}`} aria-label={`${streak} de suite`}>
          <Star filled />×{streak}
        </span>
      </header>

      {over ? (
        <div className="ten-end">
          <div className="end-stars">
            {[0, 1, 2].map((i) => (
              <Star key={i} filled={i < stars} />
            ))}
          </div>
          <p className="end-score">
            {score} / {total}
          </p>
          <div className="row-2">
            <button className="btn" onClick={onBack}>
              Autre jeu
            </button>
            <button className="btn primary" onClick={onReplay}>
              <Replay /> Rejouer
            </button>
          </div>
        </div>
      ) : game === 'pairs' ? (
        <PairsGame level={level} dur={dur} onPair={win} onWrong={() => setStreak(0)} />
      ) : (
        <ComplementRound key={done} game={game} level={level} dur={dur} onWin={win} onWrong={() => setStreak(0)} />
      )}
      {burst > 0 && <Burst key={burst} />}
    </main>
  );
}

/** Une manche « 7 + ? = 10 » : bulles à choisir, ou boîte / règle pour chercher en comptant. */
function ComplementRound({
  game,
  level,
  dur,
  onWin,
  onWrong,
}: {
  game: 'box' | 'frog';
  level: TenLevel;
  dur: number;
  onWin: (firstTry: boolean) => void;
  onWrong: () => void;
}) {
  const play = useSound();
  const say = useSay();
  const [round] = useState<TenRound>(() => makeRound(level, lastRound.current));
  const options = useMemo(() => bubbles(round.need), [round]);
  const [added, setAdded] = useState(0);
  const [wrong, setWrong] = useState<number[]>([]);
  const [won, setWon] = useState(false);
  const question = `${round.start} plus combien font ${round.target} ?`;

  useEffect(() => {
    lastRound.current = round;
    say(question);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const finish = () => {
    setWon(true);
    play('fanfare');
    say(`${round.start} et ${round.need} font ${round.target} !`);
    // On complète la boîte ou les bonds pour bien voir le complément, puis manche suivante.
    let k = added;
    const fill = window.setInterval(() => {
      k += 1;
      if (k > round.need) {
        window.clearInterval(fill);
        window.setTimeout(() => onWin(wrong.length === 0), dur * 1.5);
        return;
      }
      setAdded(k);
    }, dur * 0.35);
  };

  const pick = (v: number) => {
    if (won) return;
    if (v === round.need) return finish();
    setWrong((w) => [...w, v]);
    play('soft');
    onWrong();
    say(game === 'box' ? 'Essaie encore ! Remplis la boîte pour compter.' : 'Essaie encore ! Fais sauter la grenouille pour compter.');
  };

  const add = () => {
    if (won || added >= round.need) return;
    const k = added + 1;
    setAdded(k);
    play('pop');
    if (k === round.need) {
      setWon(true);
      play('fanfare');
      say(`${round.start} et ${round.need} font ${round.target} !`);
      // Trouvé en comptant : la manche compte, sans bonus « premier coup » si une bulle était fausse.
      window.setTimeout(() => onWin(wrong.length === 0), dur * 2.2);
    }
  };

  const units = round.start % 10;
  const tens = Math.floor(round.start / 10);

  return (
    <div className="ten-round">
      <div className="calc-row">
        <div className="calc ten-eq" aria-label={question}>
          <span>{round.start}</span>
          <span>+</span>
          <span className={`answer comp ${won ? 'filled good' : ''}`}>{won ? round.need : '?'}</span>
          <span>=</span>
          <span className="t-d">{round.target}</span>
        </div>
        {canSpeak && (
          <button className="icon-btn listen" onClick={() => speak(question)} aria-label="Écouter">
            <Speaker />
          </button>
        )}
      </div>

      <section className="panel">
        {game === 'box' ? (
          <TenFrame start={units} tens={tens} added={added} locked={won} onAdd={add} onRemove={() => setAdded((a) => Math.max(0, a - 1))} />
        ) : (
          <FrogRuler base={round.target - 10} start={round.start} hops={added} target={round.target} locked={won} onHop={add} />
        )}
      </section>

      <div className="choices">
        {options.map((v) => (
          <button
            key={v}
            className={`choice ${wrong.includes(v) ? 'wrong' : ''} ${won && v === round.need ? 'right' : ''}`}
            disabled={won || wrong.includes(v)}
            onClick={() => pick(v)}
          >
            {v}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Mémorise la dernière manche pour ne pas reposer le même complément. */
const lastRound: { current: TenRound | undefined } = { current: undefined };

/** Les amoureux de 10 : toucher deux bulles qui font 10 ensemble. */
function PairsGame({
  level,
  dur,
  onPair,
  onWrong,
}: {
  level: TenLevel;
  dur: number;
  onPair: (firstTry: boolean) => void;
  onWrong: () => void;
}) {
  const play = useSound();
  const say = useSay();
  const target = pairTarget(level);
  const [board, setBoard] = useState<Card[]>(() => pairsBoard(level));
  const [gone, setGone] = useState<string[]>([]);
  const [sel, setSel] = useState<string | null>(null);
  const [miss, setMiss] = useState<string[]>([]);
  const [flash, setFlash] = useState<{ text: string; id: number } | null>(null);
  const [boards, setBoards] = useState(1);
  const missedOnce = useRef(new Set<number>());

  useEffect(() => {
    say(`Touche deux bulles qui font ${target} ensemble.`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tap = (card: Card) => {
    if (gone.includes(card.id) || miss.length) return;
    if (!sel) return setSel(card.id);
    if (sel === card.id) return setSel(null);
    const first = board.find((c) => c.id === sel)!;
    if (first.value + card.value === target) {
      const firstTry = !missedOnce.current.has(first.value) && !missedOnce.current.has(card.value);
      setGone((g) => [...g, first.id, card.id]);
      setSel(null);
      setFlash({ text: `${first.value} + ${card.value} = ${target}`, id: Date.now() });
      play('pop');
      say(`${first.value} et ${card.value} font ${target} !`);
      onPair(firstTry);
      if (gone.length + 2 === board.length && boards < BOARDS) {
        window.setTimeout(() => {
          setBoard(pairsBoard(level));
          setGone([]);
          setBoards((b) => b + 1);
          missedOnce.current.clear();
        }, dur * 2);
      }
    } else {
      missedOnce.current.add(first.value).add(card.value);
      setMiss([first.id, card.id]);
      play('soft');
      onWrong();
      say(`${first.value} et ${card.value}, ça fait ${first.value + card.value}. Pas ${target} !`);
      window.setTimeout(() => {
        setMiss([]);
        setSel(null);
      }, dur * 1.5);
    }
  };

  return (
    <div className="pairs">
      <p className="build-prompt">Deux bulles qui font {target}</p>
      <div className="pair-grid">
        {board.map((c) => {
          const units = level === 'decade' ? c.value / 10 : c.value;
          return (
            <button
              key={`${boards}-${c.id}`}
              className={`pair ${sel === c.id ? 'sel' : ''} ${gone.includes(c.id) ? 'gone' : ''} ${miss.includes(c.id) ? 'miss' : ''}`}
              onClick={() => tap(c)}
              disabled={gone.includes(c.id)}
            >
              <b>{c.value}</b>
              <span className="pair-dots" aria-hidden="true">
                {Array.from({ length: 10 }, (_, i) => (
                  <i key={i} className={i < units ? 'on' : ''} />
                ))}
              </span>
            </button>
          );
        })}
      </div>
      <p className="pair-flash" aria-live="polite">
        {flash && <span key={flash.id}>{flash.text}</span>}
      </p>
    </div>
  );
}
