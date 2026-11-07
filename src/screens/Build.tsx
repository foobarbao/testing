import { useState } from 'react';
import { Back, Speaker, Star } from '../components/Icons';
import Keypad from '../components/Keypad';
import { RANK_TONE, digitsOf } from '../engine/steps';
import { useSound } from '../lib/sound';
import { canSpeak, speak, useSay } from '../lib/speech';
import type { BuildModel, Prefs } from '../lib/storage';
import BuildPanel from '../play/BuildPanel';
import { colsFor } from '../play/model';
import { Burst } from './Exercise';

type Range = '20' | '100' | '1000' | 'mine';

const RANGES: { id: Range; label: string }[] = [
  { id: '20', label: "Jusqu'à 20" },
  { id: '100', label: "Jusqu'à 100" },
  { id: '1000', label: "Jusqu'à 1000" },
  { id: 'mine', label: 'Mon nombre' },
];

const STARS = 5;
const between = (lo: number, hi: number) => lo + Math.floor(Math.random() * (hi - lo + 1));

function pick(range: Range, previous?: number): number {
  for (let i = 0; i < 50; i++) {
    const t = range === '20' ? between(11, 19) : range === '100' ? between(21, 99) : between(101, 999);
    if (t !== previous) return t;
  }
  return 47;
}

interface Props {
  prefs: Prefs;
  update: (p: Partial<Prefs> | ((p: Prefs) => Partial<Prefs>)) => void;
  onBack: () => void;
}

/** L'enfant transforme un nombre en dizaines et unités avec un modèle. */
export default function Build({ prefs, update, onBack }: Props) {
  const play = useSound();
  const say = useSay();
  const [range, setRange] = useState<Range>('20');
  const [target, setTarget] = useState(() => pick('20'));
  const [entry, setEntry] = useState('');
  const [entering, setEntering] = useState(false);
  const [solved, setSolved] = useState(false);
  const [round, setRound] = useState(0);
  const [burst, setBurst] = useState(0);
  const model = prefs.buildModel;
  const dur = 600 / prefs.speed;
  const stars = Math.min(STARS, prefs.buildStars[range] ?? 0);

  const n = range === '1000' ? 3 : range === 'mine' ? colsFor(target) : 2;
  const counting = model === 'sticks' || model === 'money' || model === 'abacus';
  // Jusqu'à 20 : on part d'un tas d'unités à ranger. Sinon, on part de rien.
  const loose = range === '20' && counting;
  const start = Array.from({ length: n }, (_, r) => (loose && r === 0 ? target : 0));

  const newRound = (t: number) => {
    setTarget(t);
    setSolved(false);
    setRound((r) => r + 1);
  };

  const chooseRange = (r: Range) => {
    setRange(r);
    if (r === 'mine') {
      setEntering(true);
      setEntry('');
      say('Écris ton nombre.');
    } else {
      setEntering(false);
      newRound(pick(r, target));
    }
  };

  const confirmEntry = () => {
    const t = Number(entry);
    if (!entry || t < 1 || t > 999) {
      say('Écris un nombre entre 1 et 999.');
      return;
    }
    setEntering(false);
    newRound(t);
  };

  const prompt = (m: BuildModel) => {
    if (loose) {
      return {
        sticks: `Voici ${target} bâtonnets. Range-les : fais un fagot avec 10 bâtonnets !`,
        money: `Voici ${target} pièces de 1 €. Va à la banque pour les échanger !`,
        abacus: `Il y a ${target} perles vertes. Échange 10 perles vertes contre 1 perle bleue !`,
      }[m as 'sticks' | 'money' | 'abacus'];
    }
    return {
      sticks: `Construis ${target} avec des fagots et des bâtonnets.`,
      money: `Fais ${target} € avec des billets et des pièces.`,
      abacus: `Mets des perles pour montrer ${target}.`,
      ruler: `Fais avancer la grenouille jusqu'à ${target} avec des petits et des grands bonds.`,
      gears: `Tourne les roues pour que le compteur affiche ${target}.`,
    }[m];
  };

  const onSolved = () => {
    setSolved(true);
    update((p) => ({ buildStars: { ...p.buildStars, [range]: Math.min(STARS, (p.buildStars[range] ?? 0) + 1) } }));
    setBurst((b) => b + 1);
    play('fanfare');
  };

  return (
    <main className="screen">
      <header className="bar">
        <button className="icon-btn" onClick={onBack} aria-label="Retour">
          <Back />
        </button>
        <h1 className="bar-title">Construis le nombre</h1>
        <span className="stars small" aria-label={`${stars} étoiles sur ${STARS}`}>
          {Array.from({ length: STARS }, (_, i) => (
            <Star key={i} filled={i < stars} />
          ))}
        </span>
      </header>

      <div className="answer-tabs" role="tablist" aria-label="Taille des nombres">
        {RANGES.map((r) => (
          <button key={r.id} role="tab" aria-selected={range === r.id} className="answer-tab" onClick={() => chooseRange(r.id)}>
            {r.label}
          </button>
        ))}
      </div>

      {entering ? (
        <div className="answer-zone">
          <div className="calc entry">
            <span className="entry-box on">{entry || ' '}</span>
          </div>
          <Keypad onDigit={(d) => setEntry((v) => (v.length < 3 ? (v === '0' ? d : v + d) : v))} />
          <div className="row-2">
            <button className="btn" onClick={() => setEntry((v) => v.slice(0, -1))}>
              Effacer
            </button>
            <button className="btn primary" onClick={confirmEntry}>
              C'est parti !
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="calc-row">
            <div className="calc target" aria-label={`Le nombre ${target}`}>
              {digitsOf(target)
                .map((d, c) => (
                  <span key={c} className={`t-${RANK_TONE[c]}`}>
                    {d}
                  </span>
                ))
                .reverse()}
            </div>
            {canSpeak && (
              <button className="icon-btn listen" onClick={() => speak(prompt(model))} aria-label="Écouter la consigne">
                <Speaker />
              </button>
            )}
          </div>

          <BuildPanel
            key={`${range}-${n}`}
            n={n}
            start={start}
            target={target}
            reveal
            model={model}
            onModel={(m) => update({ buildModel: m })}
            prompt={prompt}
            resetKey={`${round}-${target}`}
            dur={dur}
            solved={solved}
            onSolved={onSolved}
          />

          {solved && (
            <button className="btn primary big" onClick={() => (range === 'mine' ? chooseRange('mine') : newRound(pick(range, target)))}>
              {range === 'mine' ? 'Un autre nombre' : 'Nombre suivant'}
            </button>
          )}
        </>
      )}
      {burst > 0 && <Burst key={burst} />}
    </main>
  );
}
