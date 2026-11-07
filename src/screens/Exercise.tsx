import { useEffect, useMemo, useRef, useState } from 'react';
import { Back, Frog, Gauge, Note, Replay, Speaker, Star, VisualIcon } from '../components/Icons';
import Keypad from '../components/Keypad';
import { forgotCarry, wroteWholeSum } from '../engine/choices';
import { LEVELS, STARS_PER_LEVEL, makeExercise } from '../engine/levels';
import { RANK_TONE, buildLesson, digitsOf } from '../engine/steps';
import type { Exercise as Ex, Step } from '../engine/types';
import { useSound } from '../lib/sound';
import { canSpeak, speak, stopSpeaking, useSay } from '../lib/speech';
import type { AnswerMode, BuildModel, Prefs, VisualId } from '../lib/storage';
import BuildPanel, { type Prompt } from '../play/BuildPanel';
import ChoiceAnswer from '../play/ChoiceAnswer';
import PoseeAnswer from '../play/PoseeAnswer';
import { countsFor } from '../play/model';
import { VISUALS, needsGesture, visualById } from '../visuals';
import type { Gesture } from '../visuals/common';

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
const PLURAL = ['unités', 'dizaines', 'centaines'];
const HINT_AFTER_MS = 7000;

export const ANSWER_MODES: { id: AnswerMode; label: string }[] = [
  { id: 'keypad', label: 'Clavier' },
  { id: 'posee', label: 'Je pose' },
  { id: 'manip', label: 'Je manipule' },
  { id: 'choice', label: 'Je choisis' },
];

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

const THING: Record<string, { group: string; carry: string; groupVoice: string; carryVoice: (to: string) => string }> = {
  sticks: {
    group: 'Fais un fagot !',
    carry: 'Glisse le fagot',
    groupVoice: 'Tape sur les bâtonnets pour faire un fagot de 10.',
    carryVoice: (to) => `Fais glisser le fagot chez les ${to}.`,
  },
  money: {
    group: 'À la banque !',
    carry: 'Glisse les pièces',
    groupVoice: 'Tape sur les pièces : 10 pièces vont à la banque.',
    carryVoice: (to) => `Fais glisser les pièces chez les ${to} pour les échanger.`,
  },
  abacus: {
    group: 'Prends 10 perles',
    carry: 'Glisse les perles',
    groupVoice: 'Tape sur les perles pour en prendre 10.',
    carryVoice: (to) => `Fais glisser les perles vers les ${to}.`,
  },
  posee: {
    group: 'Paquet de 10 !',
    carry: 'Glisse la retenue',
    groupVoice: 'Tape sur la colonne pour faire un paquet de 10.',
    carryVoice: (to) => `Fais glisser la retenue en haut des ${to}.`,
  },
};

/** Ce que l'enfant doit faire pour atteindre `next` : quelques mots à l'écran, une phrase pour la voix. */
function instruction(visual: VisualId, next: Step): Prompt {
  const c = next.col;
  const cs = next.cols[c];
  if (visual === 'ruler' || visual === 'counter') {
    const b = cs?.b ?? 0;
    if (visual === 'ruler') {
      const kind = (b > 1 ? ['petits bonds', 'grands bonds', 'très grands bonds'] : ['petit bond', 'grand bond', 'très grand bond'])[c];
      return { text: `${b} ${kind}`, voice: `Tape ${b} fois sur la règle pour faire ${b} ${kind}.` };
    }
    return { text: `Tape ${b} fois`, voice: `Tape ${b} fois sur le chiffre des ${PLURAL[c]}.` };
  }
  const t = THING[visual];
  switch (next.kind) {
    case 'add':
      return { text: `Tape les ${PLURAL[c]}`, voice: `Tape sur les ${PLURAL[c]}.` };
    case 'group':
      return { text: t.group, voice: t.groupVoice };
    case 'carry':
      return { text: `${t.carry} ←`, voice: t.carryVoice(PLURAL[c + 1]) };
    case 'write':
      return { text: 'Écris le chiffre', voice: `Tape pour écrire le chiffre des ${PLURAL[c]}.` };
    default:
      return { text: '', voice: '' };
  }
}

const manipPrompt = (a: number, b: number) => (m: BuildModel): Prompt =>
  ({
    sticks: { text: `Ajoute ${b}`, voice: `Ajoute ${b} : fais glisser des fagots et des bâtonnets, puis range-les.` },
    money: { text: `Ajoute ${b} €`, voice: `Tu as ${a} euros. Ajoute ${b} euros, puis va à la banque si besoin.` },
    abacus: { text: `Ajoute ${b}`, voice: `Ajoute ${b} avec des perles, puis échange 10 perles contre 1 si besoin.` },
    ruler: { text: `Ajoute ${b}`, voice: `La grenouille est sur ${a}. Fais des bonds pour ajouter ${b}.` },
    counter: { text: `Ajoute ${b}`, voice: `Le compteur affiche ${a}. Tape sur les chiffres pour ajouter ${b}.` },
  })[m];

export default function Exercise({ level, fixed, prefs, update, onBack, onAnotherCalc }: Props) {
  const play = useSound();
  const say = useSay();
  const [ex, setEx] = useState<Ex>(() => fixed ?? calcFromUrl(level) ?? makeExercise(level));
  const lesson = useMemo(() => buildLesson(ex), [ex]);
  const [step, setStep] = useState(0);
  const [mode, setMode] = useState<Mode>('answer');
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState<Feedback>({ text: '', tone: '' });
  const [solved, setSolved] = useState(false);
  const [shake, setShake] = useState(0);
  const [burst, setBurst] = useState(0);
  const [round, setRound] = useState(0);
  const [hint, setHint] = useState(false);
  const dur = 600 / prefs.speed;
  const custom = level === 0;
  const info = LEVELS.find((l) => l.id === level);
  const stars = Math.min(STARS_PER_LEVEL, prefs.stars[level] ?? 0);
  const s = lesson.steps[step];
  const last = lesson.steps.length - 1;
  const answerMode = prefs.answerMode;
  const visual = prefs.visual;
  const calcText = `${ex.a} + ${ex.b}`;
  const next: Step | undefined = lesson.steps[step + 1];
  const guided = mode === 'guided';
  const waiting = guided && next !== undefined && needsGesture(visual, next);

  // On lit le calcul à chaque nouvel exercice.
  useEffect(() => {
    say(`Combien font ${calcText} ?`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ex]);

  useEffect(() => () => stopSpeaking(), []);

  // Mode guidé : les étapes sans geste (fin, retenue déjà vue sur la règle…) s'enchaînent seules.
  useEffect(() => {
    if (!guided || !next || waiting) return;
    const id = window.setTimeout(() => setStep((k) => Math.min(last, k + 1)), dur * (next.kind === 'done' ? 1.5 : 0.6));
    return () => window.clearTimeout(id);
  }, [guided, next, waiting, dur, last]);

  // Mode guidé : à chaque étape, la voix dit ce qui s'est passé puis ce qu'il faut faire.
  useEffect(() => {
    if (!guided) return;
    setHint(false);
    const quick = (visual === 'ruler' || visual === 'counter') && ['group', 'carry', 'write'].includes(s.kind);
    const todo = waiting && next ? instruction(visual, next).voice : '';
    let done = '';
    if (step === 0) done = `${calcText}.`;
    else if (!quick) {
      done =
        (visual === 'ruler' || visual === 'counter') && s.kind === 'add'
          ? `${lesson.steps[step - 1].value} + ${s.cols[s.col].b * s.unit} = ${s.value}.`
          : s.say;
    }
    if (s.kind === 'done') play('fanfare');
    const text = `${done} ${todo}`.trim();
    if (text) say(text);
    // Si l'enfant ne trouve pas, la main apparaît.
    const id = window.setTimeout(() => setHint(true), HINT_AFTER_MS);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guided, step, visual]);

  const reset = () => {
    setStep(0);
    setMode('answer');
    setAnswer('');
    setFeedback({ text: '', tone: '' });
    setSolved(false);
    setRound((r) => r + 1);
  };

  const nextExercise = () => {
    if (custom) return onAnotherCalc?.();
    setEx((prev) => makeExercise(level, prev));
    reset();
  };

  const startGuide = () => {
    setMode('guided');
    setStep(0);
    setFeedback({ text: '', tone: '' });
  };

  const backToAnswer = () => {
    setMode('answer');
    if (!solved) {
      setStep(0);
      setFeedback({ text: '', tone: '' });
    }
  };

  const gesture: Gesture | undefined =
    waiting && next
      ? {
          next,
          hint,
          onDone: () => {
            play(next.kind === 'carry' ? 'whoosh' : 'pop');
            setStep((k) => (k === step ? k + 1 : k));
          },
          onWrong: () => {
            play('soft');
            setHint(true);
            say(instruction(visual, next).voice);
          },
        }
      : undefined;

  const succeed = () => {
    setSolved(true);
    setStep(last);
    setFeedback({ text: 'Bravo !', tone: 'good' });
    if (!custom) {
      update((p) => ({ stars: { ...p.stars, [level]: Math.min(STARS_PER_LEVEL, (p.stars[level] ?? 0) + 1) } }));
    }
    setBurst((b) => b + 1);
    play('fanfare');
    say(`Bravo ! ${calcText} = ${lesson.result}.`);
  };

  /** Indice adapté à l'erreur : retenue oubliée, somme écrite en entier… */
  const hintFor = (value: number): Prompt => {
    const g = lesson.steps.findIndex((k) => k.kind === 'group');
    if (g > 0 && value === forgotCarry(ex.a, ex.b)) {
      const add = lesson.steps[g - 1];
      return {
        text: 'La retenue ?',
        voice: `Tu as oublié la retenue ? Chez les ${PLURAL[add.col]} : ${add.note.map((x) => x.t).join('')}.`,
      };
    }
    if (g > 0 && value === wroteWholeSum(ex.a, ex.b)) {
      return { text: 'Un chiffre par case', voice: "Dans une colonne, on n'écrit qu'un seul chiffre. Le 1 part en retenue !" };
    }
    return { text: 'Presque !', voice: 'Presque ! Regardons ensemble ce qui se passe.' };
  };

  const onAnswer = (value: number): boolean => {
    if (solved) return true;
    if (value === lesson.result) {
      succeed();
      return true;
    }
    const h = hintFor(value);
    setFeedback({ text: h.text, tone: 'soft' });
    setShake((n) => n + 1);
    play('soft');
    say(h.voice);
    return false;
  };

  const type = (d: string) => {
    if (solved) return;
    setAnswer((a) => (a.length < 3 ? a + d : a));
    if (feedback.tone === 'soft') setFeedback({ text: '', tone: '' });
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
    if (!solved) setFeedback({ text: '', tone: '' });
  };
  const speedIdx = Math.max(0, SPEEDS.indexOf(prefs.speed));

  // Un seul visuel à l'écran. En « Je manipule », c'est le plateau de manipulation qui le remplace ;
  // en « Je pose », on ne montre pas l'addition posée deux fois.
  const hideVisual = !guided && !solved && (answerMode === 'manip' || (answerMode === 'posee' && visual === 'posee'));
  const { Comp } = visualById(visual);
  const label = guided ? (next ? (waiting ? instruction(visual, next).text : '') : `${calcText} = ${lesson.result}`) : '';

  return (
    <main className="screen exercise">
      <header className="bar">
        <button className="icon-btn" onClick={onBack} aria-label="Retour">
          <Back />
        </button>
        <div className="bar-level">
          <b>{custom ? 'Mon calcul' : info?.title}</b>
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
            {solved ? lesson.result : answerMode === 'keypad' && answer && !guided ? answer : '?'}
          </span>
        </div>
        {canSpeak && (
          <button className="icon-btn listen" onClick={() => speak(`Combien font ${calcText} ?`)} aria-label="Écouter le calcul">
            <Speaker />
          </button>
        )}
      </div>

      {!hideVisual && (
        <>
          <div className="vis-tabs" role="tablist" aria-label="Visuel">
            {VISUALS.map((v) => (
              <button
                key={v.id}
                role="tab"
                aria-selected={visual === v.id}
                className="vis-tab"
                onClick={() => update({ visual: v.id })}
                aria-label={v.name}
                title={v.name}
              >
                <VisualIcon id={v.id} />
              </button>
            ))}
          </div>
          <section className={`panel stage ${waiting ? 'your-turn' : ''}`}>
            <Comp key={visual} lesson={lesson} step={step} dur={dur} gesture={gesture} />
          </section>
        </>
      )}

      {guided ? (
        <div className="guided-zone">
          <div className="guide">
            <Frog className="mascot" />
            <p className="guide-short" aria-live="polite">
              {label}
            </p>
            {canSpeak && (
              <button
                className="icon-btn"
                onClick={() => speak(next && waiting ? instruction(visual, next).voice : s.say)}
                aria-label="Réécouter"
              >
                <Speaker />
              </button>
            )}
          </div>
          {next ? (
            <div className="row-3 guided">
              <button className="btn" onClick={() => setHint(true)} disabled={!waiting}>
                <svg viewBox="0 0 40 48" className="btn-hand" aria-hidden="true">
                  <path d="M14 4a4 4 0 0 1 8 0v17l2-1a4 4 0 0 1 5 2l1-1a4 4 0 0 1 5 3v9c0 7-5 13-12 13h-3c-5 0-8-3-10-7L4 28a4 4 0 0 1 6-5l4 4z" />
                </svg>
                Aide
              </button>
              <button className="btn" onClick={() => setStep(0)} aria-label="Recommencer">
                <Replay />
              </button>
              <button className="btn" onClick={backToAnswer}>
                Je réponds
              </button>
            </div>
          ) : (
            <div className="row-2">
              <button className="btn" onClick={() => setStep(0)} aria-label="Recommencer">
                <Replay />
              </button>
              <button className="btn primary" onClick={solved ? nextExercise : backToAnswer}>
                {solved ? (custom ? 'Un autre calcul' : 'Suivant') : 'À toi !'}
              </button>
            </div>
          )}
        </div>
      ) : (
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
                setFeedback({ text: 'Remplis les cases', tone: 'soft' });
                say('Remplis toutes les cases du résultat.');
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
              <button className="btn primary" onClick={nextExercise}>
                {custom ? 'Un autre calcul' : 'Suivant'}
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
