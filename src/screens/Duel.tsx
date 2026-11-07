import { useEffect, useState } from 'react';
import Avatar from '../components/Avatar';
import Handoff from '../components/Handoff';
import { Back, Replay } from '../components/Icons';
import { Crown } from '../components/Rewards';
import type { TenLevel } from '../engine/tens';
import { DUEL_SECONDS, duelTotals, useProfiles, type Profile } from '../lib/profiles';
import { useSound } from '../lib/sound';
import { useSay } from '../lib/speech';
import { ContestGame } from './Contest';
import { Burst } from './Exercise';

interface Props {
  players: [Profile, Profile];
  rounds: number;
  level: TenLevel;
  onExit: () => void;
}

type Phase = 'countdown' | 'play' | 'between' | 'handoff' | 'end';

/**
 * Duel à deux sur un seul téléphone : chacun joue une manche de 30 secondes,
 * puis passe le téléphone. Le total des paires désigne le gagnant.
 */
export default function Duel({ players: initial, rounds, level, onExit }: Props) {
  const { actions } = useProfiles();
  const say = useSay();
  const play = useSound();
  const [players, setPlayers] = useState(initial);
  const [turn, setTurn] = useState(0);
  const [scores, setScores] = useState<[number[], number[]]>([[], []]);
  const [phase, setPhase] = useState<Phase>('countdown');
  const [match, setMatch] = useState(0);
  const turns = rounds * 2;
  const who = turn % 2;
  const me = players[who];

  const onEnd = (pairs: number) => {
    const next: [number[], number[]] = [[...scores[0]], [...scores[1]]];
    next[who].push(pairs);
    setScores(next);
    if (turn + 1 < turns) {
      setPhase('between');
      const other = players[1 - who];
      say(`${me.name} : ${pairs} paire${pairs > 1 ? 's' : ''} ! Au tour de ${other.name} !`);
      play('pop');
      return;
    }
    const { winner } = duelTotals(next);
    actions.addDuel({
      level,
      players: [players[0].id, players[1].id],
      rounds: next,
      winner: winner === null ? null : players[winner].id,
    });
    setPhase('end');
    play('fanfare');
    say(winner === null ? 'Égalité ! Bravo à tous les deux !' : `${players[winner].name} gagne ! Bravo !`);
  };

  const revanche = () => {
    // Celui qui a commencé passe en second.
    setPlayers([players[1], players[0]]);
    setScores([[], []]);
    setTurn(0);
    setMatch((m) => m + 1);
    setPhase('handoff');
  };

  if (phase === 'handoff') {
    return (
      <Handoff
        profile={me}
        onReady={() => {
          actions.select(me.id);
          setPhase('countdown');
        }}
      />
    );
  }
  if (phase === 'countdown') return <DuelCountdown key={`${match}-${turn}`} me={me} onGo={() => setPhase('play')} />;
  if (phase === 'play') {
    return (
      <ContestGame
        key={`${match}-${turn}`}
        me={me}
        mode="chrono"
        goal={DUEL_SECONDS}
        seconds={DUEL_SECONDS}
        level={level}
        onQuit={onExit}
        onEnd={(pairs) => onEnd(pairs)}
      />
    );
  }

  const { totals, winner } = duelTotals(scores);
  const ended = phase === 'end';
  const next = players[(turn + 1) % 2];

  return (
    <main className={`screen duel ${ended ? 'duel-end' : ''}`}>
      <header className="bar">
        <button className="icon-btn" onClick={onExit} aria-label="Arrêter le duel">
          <Back />
        </button>
        <div className="duel-rounds" aria-label={`Manche ${Math.floor(turn / 2) + 1} sur ${rounds}`}>
          {Array.from({ length: turns }, (_, i) => (
            <i key={i} className={`${i <= turn ? 'on' : ''} p${i % 2}`} />
          ))}
        </div>
      </header>

      <div className="duel-board">
        {players.map((p, i) => {
          const isWinner = ended && winner === i;
          const justPlayed = !ended && i === who;
          return (
            <div
              key={p.id}
              className={`duel-side ${isWinner ? 'winner' : ''} ${ended && winner !== null && !isWinner ? 'loser' : ''} ${justPlayed ? 'just' : ''}`}
              style={{ ['--me' as string]: p.color }}
            >
              {isWinner && <Crown size={64} />}
              {ended && winner === null && <Crown size={44} />}
              <Avatar profile={p} size={isWinner ? 120 : 96} ring={p.color} />
              <b className="duel-name">{p.name}</b>
              <span className="duel-total">{totals[i]}</span>
              <span className="duel-dots" aria-hidden="true">
                {Array.from({ length: rounds }, (_, r) => (
                  <i key={r} className={scores[i][r] !== undefined ? 'on' : ''} />
                ))}
              </span>
            </div>
          );
        })}
        <span className="duel-vs" aria-hidden="true">
          {ended ? (winner === null ? '=' : '') : 'VS'}
        </span>
      </div>

      {ended ? (
        <>
          <p className="duel-result">{winner === null ? 'Égalité !' : `${players[winner].name} gagne !`}</p>
          <div className="row-2">
            <button className="btn" onClick={onExit}>
              <Back /> Menu
            </button>
            <button className="btn primary" onClick={revanche}>
              <Replay /> Revanche
            </button>
          </div>
          <Burst />
        </>
      ) : (
        <button
          className="btn show big next-player"
          onClick={() => {
            setTurn((t) => t + 1);
            setPhase('handoff');
          }}
        >
          <Avatar profile={next} size={52} ring="#fff" />
          Au tour de {next.name} !
        </button>
      )}
    </main>
  );
}

function DuelCountdown({ me, onGo }: { me: Profile; onGo: () => void }) {
  const play = useSound();
  const [n, setN] = useState(3);
  useEffect(() => {
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
