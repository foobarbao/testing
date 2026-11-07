import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Back, Frog, Gauge, Note, Replay, Speaker, Star } from '../components/Icons';
import { LEVELS, STARS_PER_LEVEL, makeExercise } from '../engine/levels';
import { RANK_TONE, buildLesson, digitsOf } from '../engine/steps';
import type { Exercise as Ex } from '../engine/types';
import { useSound } from '../lib/sound';
import { canSpeak, speak, stopSpeaking } from '../lib/speech';
import type { Prefs, VisualId } from '../lib/storage';
import { VISUALS, visualById } from '../visuals';
import { toggleVisual } from './Picker';

interface Props {
  level: number;
  prefs: Prefs;
  update: (p: Partial<Prefs> | ((p: Prefs) => Partial<Prefs>)) => void;
  onBack: () => void;
}

type Mode = 'answer' | 'guided';
type Feedback = { text: string; tone: '' | 'good' | 'soft' };

const SPEEDS = [0.5, 1, 1.5];
const ASK: Feedback = { text: "Tape ta réponse, ou demande de l'aide.", tone: '' };

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
  const digits = digitsOf(value);
  return (
    <span className="num">
      {digits
        .map((d, c) => (
          <span key={c} className={`t-${RANK_TONE[c]}`}>
            {d}
          </span>
        ))
        .reverse()}
    </span>
  );
}

export default function Exercise({ level, prefs, update, onBack }: Props) {
  const play = useSound();
  const [ex, setEx] = useState<Ex>(() => calcFromUrl(level) ?? makeExercise(level));
  const lesson = useMemo(() => buildLesson(ex), [ex]);
  const [step, setStep] = useState(0);
  const [mode, setMode] = useState<Mode>('answer');
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState<Feedback>(ASK);
  const [solved, setSolved] = useState(false);
  const [shake, setShake] = useState(0);
  const [burst, setBurst] = useState(0);
  const dur = 600 / prefs.speed;
  const info = LEVELS.find((l) => l.id === level);
  const stars = Math.min(STARS_PER_LEVEL, prefs.stars[level] ?? 0);
  const s = lesson.steps[step];
  const last = lesson.steps.length - 1;

  const say = useCallback((text: string) => prefs.voice && speak(text), [prefs.voice]);

  // Sons et voix à chaque nouvelle étape du mode guidé.
  const prevStep = useRef(step);
  useEffect(() => {
    if (prevStep.current === step) return;
    const forward = step > prevStep.current;
    prevStep.current = step;
    if (mode !== 'guided') return;
    if (forward) {
      if (s.kind === 'group') play('pop');
      else if (s.kind === 'carry') play('whoosh');
      else if (s.kind === 'write' || s.kind === 'add') play('pop');
      else if (s.kind === 'done') play('fanfare');
    }
    say(s.say);
  }, [step, mode, s, play, say]);

  useEffect(() => () => stopSpeaking(), []);

  const newExercise = () => {
    setEx((prev) => makeExercise(level, prev));
    setStep(0);
    prevStep.current = 0;
    setMode('answer');
    setAnswer('');
    setFeedback(ASK);
    setSolved(false);
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
      const fb: Feedback = fromEnd
        ? { text: 'À toi ! Tape le résultat.', tone: '' }
        : ASK;
      setFeedback(fb);
      if (fromEnd) say(fb.text);
    }
  };

  const check = () => {
    if (!answer || solved) return;
    if (Number(answer) === lesson.result) {
      setSolved(true);
      setStep(last);
      prevStep.current = last;
      const fb: Feedback = { text: `Bravo ! ${ex.a} + ${ex.b} = ${lesson.result}`, tone: 'good' };
      setFeedback(fb);
      update((p) => ({ stars: { ...p.stars, [level]: Math.min(STARS_PER_LEVEL, (p.stars[level] ?? 0) + 1) } }));
      setBurst((b) => b + 1);
      play('fanfare');
      say(`Bravo ! ${ex.a} plus ${ex.b} égale ${lesson.result}.`);
    } else {
      const fb: Feedback = { text: 'Presque ! Regardons ensemble ce qui se passe.', tone: 'soft' };
      setFeedback(fb);
      setShake((n) => n + 1);
      play('soft');
      say(fb.text);
    }
  };

  const type = (d: string) => {
    if (solved) return;
    setAnswer((a) => (a.length < 3 ? a + d : a));
    if (feedback.tone === 'soft') setFeedback(ASK);
  };
  const erase = () => {
    if (solved) return;
    setAnswer((a) => a.slice(0, -1));
  };

  // Clavier physique (ordinateur, tablette avec clavier).
  const keyRef = useRef({ type, erase, check, mode });
  keyRef.current = { type, erase, check, mode };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = keyRef.current;
      if (k.mode !== 'answer') return;
      if (/^[0-9]$/.test(e.key)) k.type(e.key);
      else if (e.key === 'Backspace') k.erase();
      else if (e.key === 'Enter') k.check();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const setVisuals = (v: VisualId[]) => update({ visuals: v });
  const shown = prefs.visuals.map(visualById);
  const speedIdx = Math.max(0, SPEEDS.indexOf(prefs.speed));

  return (
    <main className="screen exercise">
      <header className="bar">
        <button className="icon-btn" onClick={onBack} aria-label="Retour aux niveaux">
          <Back />
        </button>
        <div className="bar-level">
          <b>{info?.title}</b>
          <span>{info?.hint}</span>
        </div>
        <span className="stars small" aria-label={`${stars} étoiles sur ${STARS_PER_LEVEL}`}>
          {Array.from({ length: STARS_PER_LEVEL }, (_, i) => (
            <Star key={i} filled={i < stars} />
          ))}
        </span>
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

      <div className="calc" aria-label={`${ex.a} plus ${ex.b}`}>
        <Num value={ex.a} />
        <span>+</span>
        <Num value={ex.b} />
        <span>=</span>
        <span key={shake} className={`answer ${answer ? 'filled' : ''} ${solved ? 'good' : ''} ${shake ? 'shake' : ''}`}>
          {answer || '?'}
        </span>
      </div>

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

      {mode === 'answer' ? (
        <div className="answer-zone">
          <p className={`feedback ${feedback.tone}`} aria-live="polite">
            {feedback.text}
          </p>
          {solved ? (
            <div className="row-2">
              <button className="btn" onClick={startGuide}>
                <Replay /> Revoir
              </button>
              <button className="btn primary" onClick={newExercise}>
                Exercice suivant
              </button>
            </div>
          ) : (
            <>
              <div className="keypad">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].map((d) => (
                  <button key={d} className="key" onClick={() => type(d)}>
                    {d}
                  </button>
                ))}
              </div>
              <div className="row-3">
                <button className="btn" onClick={erase}>
                  Effacer
                </button>
                <button className="btn primary" onClick={check} disabled={!answer}>
                  Valider
                </button>
                <button className={`btn show ${feedback.tone === 'soft' ? 'pulse' : ''}`} onClick={startGuide}>
                  Montre-moi
                </button>
              </div>
            </>
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
            <button className="btn" onClick={() => setStep((n) => Math.max(0, n - 1))} disabled={step === 0}>
              <Back /> Précédent
            </button>
            <button
              className="btn primary"
              onClick={() => (step === last ? backToAnswer(true) : setStep((n) => n + 1))}
            >
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

function Burst() {
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
