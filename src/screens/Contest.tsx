import { useEffect, useRef, useState } from 'react';
import Avatar from '../components/Avatar';
import Handoff from '../components/Handoff';
import { Back, Replay } from '../components/Icons';
import { Crown, MEDAL_COLOR, MedalIcon, Podium, TrophyBadge } from '../components/Rewards';
import { contestBoard, pairTarget, type Card, type TenLevel } from '../engine/tens';
import {
  CHRONO_SECONDS,
  MEDAL_LABEL,
  RACE_GOALS,
  currentProfile,
  formatTime,
  leaderboard,
  medalFor,
  outcome,
  useProfiles,
  type ContestMode,
  type ContestScore,
  type Profile,
  type Trophy,
} from '../lib/profiles';
import { useSound } from '../lib/sound';
import { useSay } from '../lib/speech';
import { Burst } from './Exercise';

interface Props {
  level: TenLevel;
  onBack: () => void;
  onPlayers: () => void;
  onProfile: (id: string) => void;
}

type Phase = 'setup' | 'handoff' | 'countdown' | 'play' | 'end';
interface Result {
  score: ContestScore;
  record: boolean;
  champion: boolean;
  newTrophies: Trophy[];
}

/** Concours des amoureux de 10 : 60 secondes pour un maximum de paires, ou une course de N paires. */
export default function Contest({ level: startLevel, onBack, onPlayers, onProfile }: Props) {
  const { state, actions } = useProfiles();
  const me = currentProfile(state);
  const say = useSay();
  const play = useSound();
  const [mode, setMode] = useState<ContestMode>('chrono');
  const [goal, setGoal] = useState(RACE_GOALS[0]);
  const [level, setLevel] = useState<TenLevel>(startLevel);
  const [phase, setPhase] = useState<Phase>('setup');
  const [result, setResult] = useState<Result | null>(null);
  const [run, setRun] = useState(0);
  const eventGoal = mode === 'chrono' ? CHRONO_SECONDS : goal;
  const board = leaderboard(state, mode, level, eventGoal);
  // Joueur suivant dans la liste (pour « Au tour de Tom »).
  const nextPlayer =
    me && state.profiles.length > 1
      ? state.profiles[(state.profiles.findIndex((p) => p.id === me.id) + 1) % state.profiles.length]
      : null;

  useEffect(() => {
    if (phase === 'setup') say(me ? `${me.name}, touche C'est parti !` : 'Qui joue ? Touche le bouton orange.');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, me?.id]);

  const start = () => {
    if (!me) return onPlayers();
    setResult(null);
    setPhase('countdown');
    setRun((r) => r + 1);
  };

  const finish = (pairs: number, ms: number, misses: number) => {
    if (!me) return;
    const draft = { profileId: me.id, mode, level, goal: eventGoal, pairs, ms, misses };
    const out = outcome(state, { ...draft, id: 'draft', date: Date.now() });
    const score = actions.addScore(draft);
    setResult({ score, ...out });
    setPhase('end');
    play('fanfare');
    const what = mode === 'chrono' ? `${pairs} paires` : `${(ms / 1000).toFixed(1).replace('.', ',')} secondes`;
    say(`Bravo ${me.name} ! ${what} !${out.champion ? ' Tu es le champion !' : out.record ? ' Nouveau record !' : ''}`);
  };

  if (phase === 'handoff' && nextPlayer) {
    return (
      <Handoff
        profile={nextPlayer}
        onReady={() => {
          actions.select(nextPlayer.id);
          setResult(null);
          setPhase('countdown');
          setRun((r) => r + 1);
        }}
        onCancel={() => setPhase('end')}
      />
    );
  }
  if (phase === 'countdown' && me) {
    return <Countdown key={run} me={me} onGo={() => setPhase('play')} />;
  }
  if (phase === 'play' && me) {
    return (
      <ContestGame
        key={run}
        me={me}
        mode={mode}
        goal={goal}
        level={level}
        onQuit={() => setPhase('setup')}
        onEnd={finish}
      />
    );
  }
  if (phase === 'end' && me && result) {
    return (
      <Reward
        me={me}
        result={result}
        rows={leaderboard(state, mode, level, eventGoal)}
        next={nextPlayer}
        onNext={() => setPhase('handoff')}
        onReplay={start}
        onPlayers={onPlayers}
        onMenu={() => setPhase('setup')}
      />
    );
  }

  return (
    <main className="screen contest">
      <header className="bar">
        <button className="icon-btn" onClick={onBack} aria-label="Retour">
          <Back />
        </button>
        <h1 className="bar-title">Concours</h1>
      </header>

      {me ? (
        <div className="who" style={{ ['--me' as string]: me.color }}>
          <button className="who-main" onClick={() => onProfile(me.id)} aria-label={`Profil de ${me.name}`}>
            <Avatar profile={me} size={64} ring={me.color} />
            <b>{me.name}</b>
          </button>
          <button className="btn slim change-player" onClick={onPlayers} aria-label="Changer de joueur">
            {state.profiles
              .filter((p) => p.id !== me.id)
              .slice(0, 3)
              .map((p) => (
                <Avatar key={p.id} profile={p} size={30} />
              ))}
            {state.profiles.length < 2 && <span>+</span>}
          </button>
        </div>
      ) : (
        <button className="btn show big" onClick={onPlayers}>
          Qui joue ?
        </button>
      )}

      <div className="answer-tabs" role="tablist" aria-label="Épreuve">
        <button role="tab" className="answer-tab big-tab icon-tab" aria-selected={mode === 'chrono'} onClick={() => setMode('chrono')}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="13.5" r="8" />
            <path d="M12 9v5l3 2M9.5 2.5h5" />
          </svg>
          60 secondes
        </button>
        <button role="tab" className="answer-tab big-tab icon-tab" aria-selected={mode === 'race'} onClick={() => setMode('race')}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 21V3M5 4h12l-2.5 4L17 12H5" />
          </svg>
          Course
        </button>
      </div>
      {mode === 'race' && (
        <div className="goal-row" role="radiogroup" aria-label="Nombre de paires">
          {RACE_GOALS.map((g) => (
            <button key={g} role="radio" aria-checked={goal === g} className={`goal ${goal === g ? 'on' : ''}`} onClick={() => setGoal(g)}>
              {g}
              <small>paires</small>
            </button>
          ))}
        </div>
      )}
      <div className="answer-tabs" role="tablist" aria-label="Niveau">
        <button role="tab" className="answer-tab" aria-selected={level === 'ten'} onClick={() => setLevel('ten')}>
          3 + 7 = 10
        </button>
        <button role="tab" className="answer-tab" aria-selected={level === 'decade'} onClick={() => setLevel('decade')}>
          30 + 70 = 100
        </button>
      </div>

      <section className="honor">
        <h2 className="section-title">Tableau d'honneur</h2>
        {board.length ? <Podium rows={board} highlight={me?.id} /> : <p className="honor-empty">Personne encore : à toi !</p>}
      </section>

      <button className="btn primary big" onClick={start}>
        C'est parti !
      </button>
    </main>
  );
}

function Countdown({ me, onGo }: { me: Profile; onGo: () => void }) {
  const play = useSound();
  const say = useSay();
  const [n, setN] = useState(3);
  useEffect(() => {
    say(`${me.name}, prêt ? 3, 2, 1, partez !`);
    play('pop');
    let k = 3;
    const id = window.setInterval(() => {
      k -= 1;
      setN(k);
      play(k === 0 ? 'whoosh' : 'pop');
      if (k < 0) {
        window.clearInterval(id);
        onGo();
      }
    }, 800);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <main className="screen countdown" style={{ ['--me' as string]: me.color }}>
      <Avatar profile={me} size={170} ring={me.color} />
      <b className="cd-name">{me.name}</b>
      <span key={n} className="cd-num">
        {n > 0 ? n : 'Partez !'}
      </span>
    </main>
  );
}

const SCREEN_PAIRS = 20;

function ContestGame({
  me,
  mode,
  goal,
  level,
  onQuit,
  onEnd,
}: {
  me: Profile;
  mode: ContestMode;
  goal: number;
  level: TenLevel;
  onQuit: () => void;
  onEnd: (pairs: number, ms: number, misses: number) => void;
}) {
  const play = useSound();
  const target = pairTarget(level);
  const [screenNo, setScreenNo] = useState(0);
  const [cards, setCards] = useState<Card[]>(() => contestBoard(level, SCREEN_PAIRS, 0));
  const [gone, setGone] = useState<Set<string>>(new Set());
  const [sel, setSel] = useState<string | null>(null);
  const [miss, setMiss] = useState<string[]>([]);
  const [pairs, setPairs] = useState(0);
  const [misses, setMisses] = useState(0);
  const [pops, setPops] = useState<{ id: number; text: string }[]>([]);
  const [now, setNow] = useState(0);
  const [newScreen, setNewScreen] = useState(false);
  const t0 = useRef(performance.now());
  const ended = useRef(false);
  const lastTick = useRef(99);

  const total = CHRONO_SECONDS * 1000;
  const left = Math.max(0, total - now);

  const end = (p: number, ms: number, m: number) => {
    if (ended.current) return;
    ended.current = true;
    onEnd(p, Math.round(ms), m);
  };

  useEffect(() => {
    const id = window.setInterval(() => {
      const t = performance.now() - t0.current;
      setNow(t);
      if (mode === 'chrono') {
        const s = Math.ceil((total - t) / 1000);
        if (s <= 5 && s > 0 && s !== lastTick.current) {
          lastTick.current = s;
          play('click');
        }
        if (t >= total) end(pairsRef.current, total, missesRef.current);
      }
    }, 100);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pairsRef = useRef(0);
  const missesRef = useRef(0);
  pairsRef.current = pairs;
  missesRef.current = misses;

  const tap = (c: Card) => {
    if (ended.current || gone.has(c.id) || miss.length) return;
    if (!sel) return setSel(c.id);
    if (sel === c.id) return setSel(null);
    const first = cards.find((x) => x.id === sel)!;
    if (first.value + c.value === target) {
      const next = new Set(gone).add(first.id).add(c.id);
      const p = pairs + 1;
      setGone(next);
      setSel(null);
      setPairs(p);
      setPops((list) => [...list.slice(-3), { id: Date.now(), text: `${first.value} + ${c.value}` }]);
      play('pop');
      if (mode === 'race' && p >= goal) return end(p, performance.now() - t0.current, misses);
      if (next.size === cards.length) {
        // Écran terminé : un nouvel écran arrive.
        window.setTimeout(() => {
          setScreenNo((n) => n + 1);
          setCards(contestBoard(level, SCREEN_PAIRS, screenNo + 1));
          setGone(new Set());
          setNewScreen(true);
          window.setTimeout(() => setNewScreen(false), 700);
        }, 200);
      }
    } else {
      setMisses((m) => m + 1);
      setMiss([first.id, c.id]);
      play('soft');
      window.setTimeout(() => {
        setMiss([]);
        setSel(null);
      }, 350);
    }
  };

  const shown = mode === 'chrono' ? Math.ceil(left / 1000) : (now / 1000).toFixed(1).replace('.', ',');
  const urgent = mode === 'chrono' && left <= 10000;

  return (
    <main className="screen contest-game" style={{ ['--me' as string]: me.color }}>
      <header className="cg-bar">
        <button className="icon-btn" onClick={onQuit} aria-label="Arrêter">
          <Back />
        </button>
        <Avatar profile={me} size={44} ring={me.color} />
        <span className={`cg-timer ${urgent ? 'urgent' : ''}`} aria-live="off">
          {shown}
          <small>s</small>
        </span>
        <span className="cg-pairs" aria-label={`${pairs} paires`}>
          <b>{pairs}</b>
          {mode === 'race' ? <small>/ {goal}</small> : <small>paires</small>}
        </span>
      </header>
      {mode === 'chrono' && (
        <div className="cg-track" aria-hidden="true">
          <i style={{ width: `${(left / total) * 100}%` }} />
        </div>
      )}
      {mode === 'race' && (
        <div className="cg-track race" aria-hidden="true">
          <i style={{ width: `${(pairs / goal) * 100}%` }} />
        </div>
      )}

      <div className={`contest-grid ${newScreen ? 'fresh' : ''}`}>
        {cards.map((c) => (
          <button
            key={c.id}
            className={`cbub v${level === 'decade' ? c.value / 10 : c.value} ${sel === c.id ? 'sel' : ''} ${gone.has(c.id) ? 'gone' : ''} ${miss.includes(c.id) ? 'miss' : ''}`}
            onPointerDown={(e) => {
              e.preventDefault();
              tap(c);
            }}
            disabled={gone.has(c.id)}
          >
            {c.value}
          </button>
        ))}
      </div>
      <div className="cg-pops" aria-hidden="true">
        {pops.map((p) => (
          <span key={p.id}>{p.text}</span>
        ))}
      </div>
    </main>
  );
}

function Reward({
  me,
  result,
  rows,
  next,
  onNext,
  onReplay,
  onPlayers,
  onMenu,
}: {
  me: Profile;
  result: Result;
  rows: ReturnType<typeof leaderboard>;
  next: Profile | null;
  onNext: () => void;
  onReplay: () => void;
  onPlayers: () => void;
  onMenu: () => void;
}) {
  const { score } = result;
  const medal = medalFor(score);
  const ring = medal ? MEDAL_COLOR[medal].fill : me.color;
  const title = result.champion ? 'Champion !' : result.record ? 'Nouveau record !' : medal ? `Médaille ${MEDAL_LABEL[medal].toLowerCase()} !` : 'Bravo !';
  return (
    <main className="screen reward" style={{ ['--me' as string]: me.color }}>
      <div className="reward-hero">
        <div className="rays" aria-hidden="true" />
        {(result.champion || result.record) && <Crown size={86} />}
        <div className="reward-photo">
          <Avatar profile={me} size={160} ring={ring} />
          {medal && (
            <span className="reward-medal">
              <MedalIcon medal={medal} size={58} />
            </span>
          )}
        </div>
        <span className="ribbon">{title}</span>
        <b className="reward-name">{me.name}</b>
        <span className="reward-score">{score.mode === 'chrono' ? `${score.pairs} paires` : formatTime(score.ms)}</span>
        <span className="reward-sub">
          {score.misses === 0 ? 'Sans faute !' : `${score.misses} erreur${score.misses > 1 ? 's' : ''}`}
        </span>
      </div>

      {result.newTrophies.length > 0 && (
        <section className="new-trophies">
          <h2 className="section-title">Nouveau trophée !</h2>
          <div className="trophy-grid">
            {result.newTrophies.map((t) => (
              <TrophyBadge key={t.id} trophy={t} earned fresh />
            ))}
          </div>
        </section>
      )}

      <section className="honor">
        <h2 className="section-title">Tableau d'honneur</h2>
        <Podium rows={rows} highlight={me.id} />
      </section>

      {next && (
        <button className="btn show big next-player" onClick={onNext}>
          <Avatar profile={next} size={52} ring="#fff" />
          Au tour de {next.name} !
        </button>
      )}
      <div className="row-3">
        <button className="btn" onClick={onMenu} aria-label="Menu du concours">
          <Back /> Menu
        </button>
        <button className="btn" onClick={onPlayers} aria-label="Choisir un autre joueur">
          <svg viewBox="0 0 24 24" className="who-icon" aria-hidden="true">
            <circle cx="8" cy="8" r="3.5" />
            <circle cx="16.5" cy="9" r="3" />
            <path d="M2 20c0-4 3-6 6-6s6 2 6 6M13 19c.5-3 2-4.5 3.5-4.5S21 16 21.5 19" />
          </svg>
          Joueurs
        </button>
        <button className="btn primary" onClick={onReplay}>
          <Replay /> Rejouer
        </button>
      </div>
      <Burst />
    </main>
  );
}
