import { useEffect, useMemo, useRef, useState } from 'react';
import { Back, Frog, Gauge, Note, Replay, Speaker, Star } from '../components/Icons';
import Keypad from '../components/Keypad';
import { forgotCarry, wroteWholeSum } from '../engine/choices';
import { LEVELS, STARS_PER_LEVEL, makeExercise } from '../engine/levels';
import { RANK_TONE, buildLesson, digitsOf } from '../engine/steps';
import type { Exercise as Ex } from '../engine/types';
import { useSound } from '../lib/sound';
import { canSpeak, speak, stopSpeaking, useSay } from '../lib/speech';
import type { AnswerMode, BuildModel, Prefs, VisualId } from '../lib/storage';
import BuildPanel from '../play/BuildPanel';
import ChoiceAnswer from '../play/ChoiceAnswer';
import PoseeAnswer from '../play/PoseeAnswer';
import { countsFor } from '../play/model';
import { VISUALS, visualById } from '../visuals';
import { toggleVisual } from './Picker';

interface Props {
  /** 1 à 4, ou 0 pour un calcul tapé par l'enfant. */
  level: number;
  /** Calcul imposé (calcul des devoirs). */
  fixed?: Ex;
  prefs: Prefs;
  update: (p: Partial<Prefs> | ((p: Prefs) => Partial<Prefs>)) => void;
  onBack: () => void;
  /** Pour un calcul des devoirs : en taper un autre. */
  onAnotherCalc?: () => void;
}

type Mode = 'answer' | 'guided';
type Feedback = { text: string; tone: '' | 'good' | 'soft' };

const SPEEDS = [0.5, 1, 1.5];
const RANK_WORDS = ['unités', 'dizaines', 'centaines'];

export const ANSWER_MODES: { id: AnswerMode; label: string }[] = [
  { id: 'keypad', label: 'Clavier' },
  { id: 'posee', label: 'Je pose' },
  { id: 'manip', label: 'Je manipule' },
  { id: 'choice', label: 'Je choisis' },
];

const ASK: Record<AnswerMode, string> = {
  keypad: "Tape ta réponse, ou demande de l'aide.",
  posee: 'Écris le résultat dans les cases.',
  manip: '',
  choice: 'Quelle est la bonne réponse ?',
};

/** Lien direct vers un calcul : ?niveau=3&calcul=47+28 */
function calcFromUrl(level: number): Ex | null {
  try {
    const m = /^(\d{1,3})\s*[+ ]\s*(\d{1,3})$/.exec(new URLSearchParams(location.search).get('calcul') ?? '');
    if (!m) return null;
    const [a, b] = [Number(m[1]), Number(m[2])];
    return a > 0 && b > 0 && a + b <= 999 ? { op: 'add', a, b, level } : null;
  } catch {
    return null;
  }
}

function Num({ value }: { value: number }) {
  return (
    <span className="num">
      {digitsOf(value)
        .map((d, c) => (
          <span key={c} className={`t-${RANK_TONE[c]}`}>
            {d}
          </span>
        ))
        .reverse()}
    </span>
  );
}

const manipPrompt = (a: number, b: number) => (m: BuildModel) =>
  ({
    sticks: `Ajoute ${b} : fais glisser des fagots et des bâtonnets depuis la réserve, puis range-les.`,
    money: `Tu as ${a} €. Ajoute ${b} € avec la réserve, puis va à la banque si besoin.`,
    abacus: `Ajoute ${b} avec des perles, puis échange 10 perles contre 1 si besoin.`,
    ruler: `La grenouille est sur ${a}. Fais des bonds pour ajouter ${b}.`,
    gears: `Le compteur affiche ${a}. Tourne les roues pour ajouter ${b}.`,
  })[m];

export default function Exercise({ level, fixed, prefs, update, onBack, onAnotherCalc }: Props) {
  const play = useSound();
  const say = useSay();
  const [ex, setEx] = useState<Ex>(() => fixed ?? calcFromUrl(level) ?? makeExercise(level));
  const lesson = useMemo(() => buildLesson(ex), [ex]);
  const [step, setStep] = useState(0);
  const [mode, setMode] = useState<Mode>('answer');
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState<Feedback>({ text: ASK[prefs.answerMode], tone: '' });
  const [solved, setSolved] = useState(false);
  const [shake, setShake] = useState(0);
  const [burst, setBurst] = useState(0);
  const [round, setRound] = useState(0);
  const dur = 600 / prefs.speed;
  const custom = level === 0;
  const info = LEVELS.find((l) => l.id === level);
  const stars = Math.min(STARS_PER_LEVEL, prefs.stars[level] ?? 0);
  const s = lesson.steps[step];
  const last = lesson.steps.length - 1;
  const answerMode = prefs.answerMode;
  const calcText = `${ex.a} + ${ex.b}`;

  // On lit le calcul à chaque nouvel exercice.
  useEffect(() => {
    say(`Combien font ${calcText} ?`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ex]);

  // Sons et voix à chaque nouvelle étape du mode guidé.
  const prevStep = useRef(step);
  useEffect(() => {
    if (prevStep.current === step) return;
    const forward = step > prevStep.current;
    prevStep.current = step;
    if (mode !== 'guided') return;
    if (forward) {
      if (s.kind === 'carry') play('whoosh');
      else if (s.kind === 'done') play('fanfare');
      else play('pop');
    }
    say(s.say);
  }, [step, mode, s, play, say]);

  useEffect(() => () => stopSpeaking(), []);

  const reset = () => {
    setStep(0);
    prevStep.current = 0;
    setMode('answer');
    setAnswer('');
    setFeedback({ text: ASK[answerMode], tone: '' });
    setSolved(false);
    setRound((r) => r + 1);
  };

  const next = () => {
    if (custom) return onAnotherCalc?.();
    setEx((prev) => makeExercise(level, prev));
    reset();
  };

  const startGuide = () => {
    setMode('guided');
    setStep(0);
    prevStep.current = 0;
    say(lesson.steps[0].say);
  };

  const backToAnswer = (fromEnd: boolean) => {
    setMode('answer');
    if (!solved) {
      const text = fromEnd ? 'À toi ! Donne le résultat.' : ASK[answerMode];
      setFeedback({ text, tone: '' });
      if (fromEnd) say(text);
    }
  };

  const succeed = () => {
    setSolved(true);
    setStep(last);
    prevStep.current = last;
    setFeedback({ text: `Bravo ! ${ex.a} + ${ex.b} = ${lesson.result}`, tone: 'good' });
    if (!custom) {
      update((p) => ({ stars: { ...p.stars, [level]: Math.min(STARS_PER_LEVEL, (p.stars[level] ?? 0) + 1) } }));
    }
    setBurst((b) => b + 1);
    play('fanfare');
    say(`Bravo ! ${ex.a} + ${ex.b} = ${lesson.result}.`);
  };

  /** Indice adapté à l'erreur : retenue oubliée, somme écrite en entier… */
  const hintFor = (value: number) => {
    const g = lesson.steps.findIndex((k) => k.kind === 'group');
    if (g > 0 && value === forgotCarry(ex.a, ex.b)) {
      const add = lesson.steps[g - 1];
      return `Tu as oublié la retenue ? Chez les ${RANK_WORDS[add.col]} : ${add.note.map((x) => x.t).join('')}.`;
    }
    if (g > 0 && value === wroteWholeSum(ex.a, ex.b)) {
      return "Dans une colonne, on n'écrit qu'un seul chiffre. Le 1 part en retenue !";
    }
    return 'Presque ! Regardons ensemble ce qui se passe.';
  };

  const onAnswer = (value: number): boolean => {
    if (solved) return true;
    if (value === lesson.result) {
      succeed();
      return true;
    }
    const text = hintFor(value);
    setFeedback({ text, tone: 'soft' });
    setShake((n) => n + 1);
    play('soft');
    say(text);
    return false;
  };

  const type = (d: string) => {
    if (solved) return;
    setAnswer((a) => (a.length < 3 ? a + d : a));
    if (feedback.tone === 'soft') setFeedback({ text: ASK.keypad, tone: '' });
  };
  const erase = () => !solved && setAnswer((a) => a.slice(0, -1));

  // Clavier physique (ordinateur, tablette avec clavier).
  const keyRef = useRef({ type, erase, submit: () => {}, active: true });
  keyRef.current = {
    type,
    erase,
    submit: () => {
      if (answer) onAnswer(Number(answer));
    },
    active: mode === 'answer' && answerMode === 'keypad',
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = keyRef.current;
      if (!k.active) return;
      if (/^[0-9]$/.test(e.key)) k.type(e.key);
      else if (e.key === 'Backspace') k.erase();
      else if (e.key === 'Enter') k.submit();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const setAnswerMode = (m: AnswerMode) => {
    update({ answerMode: m });
    if (!solved) setFeedback({ text: ASK[m], tone: '' });
  };

  const setVisuals = (v: VisualId[]) => update({ visuals: v });
  const speedIdx = Math.max(0, SPEEDS.indexOf(prefs.speed));

  // En mode « Je manipule », c'est l'enfant qui anime : on cache les visuels.
  // En mode « Je pose », l'addition posée est déjà à remplir : on ne la montre pas deux fois.
  const showPanels = mode === 'guided' || solved || answerMode !== 'manip';
  const shown = prefs.visuals
    .filter((v) => mode === 'guided' || solved || answerMode !== 'posee' || v !== 'posee')
    .map(visualById);

  return (
    <main className="screen exercise">
      <header className="bar">
        <button className="icon-btn" onClick={onBack} aria-label="Retour">
          <Back />
        </button>
        <div className="bar-level">
          <b>{custom ? 'Mon calcul' : info?.title}</b>
          <span>{custom ? 'Recopié des devoirs' : info?.hint}</span>
        </div>
        {!custom && (
          <span className="stars small" aria-label={`${stars} étoiles sur ${STARS_PER_LEVEL}`}>
            {Array.from({ length: STARS_PER_LEVEL }, (_, i) => (
              <Star key={i} filled={i < stars} />
            ))}
          </span>
        )}
        <div className="bar-tools">
          <button
            className="icon-btn speed"
            onClick={() => update({ speed: SPEEDS[(speedIdx + 1) % SPEEDS.length] })}
            aria-label="Vitesse des animations"
          >
            <Gauge />
            <span>{String(prefs.speed).replace('.', ',')}×</span>
          </button>
          <button
            className="icon-btn"
            onClick={() => update({ sound: !prefs.sound })}
            aria-pressed={prefs.sound}
            aria-label={prefs.sound ? 'Couper les sons' : 'Activer les sons'}
          >
            <Note off={!prefs.sound} />
          </button>
          {canSpeak && (
            <button
              className="icon-btn"
              onClick={() => {
                if (prefs.voice) stopSpeaking();
                else speak('La voix est activée.');
                update({ voice: !prefs.voice });
              }}
              aria-pressed={prefs.voice}
              aria-label={prefs.voice ? 'Couper la voix' : 'Activer la voix'}
            >
              <Speaker off={!prefs.voice} />
            </button>
          )}
        </div>
      </header>

      <div className="calc-row">
        <div className="calc" aria-label={`${ex.a} plus ${ex.b}`}>
          <Num value={ex.a} />
          <span>+</span>
          <Num value={ex.b} />
          <span>=</span>
          <span
            key={shake}
            className={`answer ${answer || solved ? 'filled' : ''} ${solved ? 'good' : ''} ${shake ? 'shake' : ''}`}
          >
            {solved ? lesson.result : answerMode === 'keypad' && answer ? answer : '?'}
          </span>
        </div>
        {canSpeak && (
          <button className="icon-btn listen" onClick={() => speak(`Combien font ${calcText} ?`)} aria-label="Écouter le calcul">
            <Speaker />
          </button>
        )}
      </div>

      {showPanels && (
        <>
          <div className="chips" role="group" aria-label="Visuels affichés">
            {VISUALS.map((v) => (
              <button
                key={v.id}
                className="chip"
                aria-pressed={prefs.visuals.includes(v.id)}
                onClick={() => setVisuals(toggleVisual(prefs.visuals, v.id))}
              >
                <span className="chip-dot" />
                {v.name}
              </button>
            ))}
          </div>
          {shown.length > 0 && (
            <div className={`panels ${shown.length === 2 ? 'two' : ''}`}>
              {shown.map(({ id, name, Comp }) => (
                <section key={id} className="panel">
                  <h2 className="panel-title">
                    <span>{name}</span>
                    {shown.length === 2 && <span className="sync">même étape</span>}
                  </h2>
                  <Comp lesson={lesson} step={step} dur={dur} />
                </section>
              ))}
            </div>
          )}
        </>
      )}

      {mode === 'answer' ? (
        <div className="answer-zone">
          {!solved && (
            <div className="answer-tabs" role="tablist" aria-label="Comment répondre">
              {ANSWER_MODES.map((m) => (
                <button
                  key={m.id}
                  role="tab"
                  aria-selected={answerMode === m.id}
                  className="answer-tab"
                  onClick={() => setAnswerMode(m.id)}
                >
                  {m.label}
                </button>
              ))}
            </div>
          )}

          {answerMode === 'manip' && !solved && (
            <BuildPanel
              n={lesson.n}
              start={countsFor(ex.a, lesson.n)}
              target={lesson.result}
              reveal={false}
              model={prefs.buildModel}
              onModel={(m) => update({ buildModel: m })}
              prompt={manipPrompt(ex.a, ex.b)}
              resetKey={`${lesson.id}-${round}`}
              dur={dur}
              solved={solved}
              onSolved={succeed}
            />
          )}
          {answerMode === 'posee' && !solved && (
            <PoseeAnswer
              key={`${lesson.id}-${round}`}
              lesson={lesson}
              solved={solved}
              onAnswer={onAnswer}
              onIncomplete={() => {
                const text = 'Remplis toutes les cases du résultat.';
                setFeedback({ text, tone: 'soft' });
                say(text);
              }}
            />
          )}
          {answerMode === 'choice' && !solved && (
            <ChoiceAnswer key={`${lesson.id}-${round}`} a={ex.a} b={ex.b} solved={solved} onAnswer={onAnswer} />
          )}

          {(answerMode !== 'manip' || solved) && (
            <p className={`feedback ${feedback.tone}`} aria-live="polite">
              {feedback.text}
            </p>
          )}

          {solved ? (
            <div className="row-2">
              <button className="btn" onClick={startGuide}>
                <Replay /> Revoir
              </button>
              <button className="btn primary" onClick={next}>
                {custom ? 'Un autre calcul' : 'Exercice suivant'}
              </button>
            </div>
          ) : answerMode === 'keypad' ? (
            <>
              <Keypad onDigit={type} />
              <div className="row-3">
                <button className="btn" onClick={erase}>
                  Effacer
                </button>
                <button className="btn primary" onClick={() => answer && onAnswer(Number(answer))} disabled={!answer}>
                  Valider
                </button>
                <button className={`btn show ${feedback.tone === 'soft' ? 'pulse' : ''}`} onClick={startGuide}>
                  Montre-moi
                </button>
              </div>
            </>
          ) : (
            <button className={`btn show ${feedback.tone === 'soft' ? 'pulse' : ''}`} onClick={startGuide}>
              Montre-moi
            </button>
          )}
        </div>
      ) : (
        <div className="guided-zone">
          <div className="guide">
            <Frog className="mascot" />
            <p aria-live="polite">
              {s.ask ? (
                <>
                  {s.say.replace(s.ask, '')}
                  <span className="ask">{s.ask}</span>
                </>
              ) : (
                s.say
              )}
            </p>
            {canSpeak && (
              <button className="icon-btn" onClick={() => speak(s.say)} aria-label="Lire à voix haute">
                <Speaker />
              </button>
            )}
          </div>
          <div className="dots" aria-label={`Étape ${step + 1} sur ${last + 1}`}>
            {lesson.steps.map((_, i) => (
              <i key={i} className={i === step ? 'on' : i < step ? 'past' : ''} />
            ))}
          </div>
          <div className="row-3 guided">
            <button className="btn" onClick={() => setStep((k) => Math.max(0, k - 1))} disabled={step === 0}>
              <Back /> Précédent
            </button>
            <button className="btn primary" onClick={() => (step === last ? backToAnswer(true) : setStep((k) => k + 1))}>
              {step === last ? (solved ? 'Terminé' : 'À toi !') : s.kind === 'group' ? 'On regroupe !' : 'Suivant'}
            </button>
            <button className="btn" onClick={() => setStep(0)}>
              <Replay /> Rejouer
            </button>
          </div>
          <button className="btn slim" onClick={() => backToAnswer(false)}>
            Je réponds
          </button>
        </div>
      )}

      {burst > 0 && <Burst key={burst} />}
    </main>
  );
}

export function Burst() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 28 }, (_, i) => ({
        left: Math.random() * 96,
        delay: Math.random() * 0.5,
        size: 14 + Math.random() * 16,
        color: ['var(--star)', 'var(--units)', 'var(--tens)', 'var(--carry)', 'var(--hundreds)'][i % 5],
      })),
    [],
  );
  return (
    <div className="burst" aria-hidden="true">
      {pieces.map((p, i) => (
        <svg
          key={i}
          viewBox="0 0 24 24"
          style={{ left: `${p.left}%`, width: p.size, height: p.size, animationDelay: `${p.delay}s` }}
        >
          <path d="M12 2.5l2.9 6 6.6.8-4.9 4.6 1.3 6.6L12 17.2l-5.9 3.3 1.3-6.6L2.5 9.3l6.6-.8z" fill={p.color} />
        </svg>
      ))}
    </div>
  );
}
