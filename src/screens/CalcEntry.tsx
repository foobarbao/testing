import { useEffect, useRef, useState } from 'react';
import { Back } from '../components/Icons';
import Keypad from '../components/Keypad';
import { useSay } from '../lib/speech';

interface Props {
  onBack: () => void;
  onStart: (a: number, b: number) => void;
}

/** L'enfant (ou le parent) recopie une addition des devoirs. */
export default function CalcEntry({ onBack, onStart }: Props) {
  const say = useSay();
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const [field, setField] = useState<'a' | 'b'>('a');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    say('Recopie le calcul de tes devoirs.');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const typeDigit = (d: string) => {
    setMsg('');
    const set = field === 'a' ? setA : setB;
    set((v) => (v.length < 3 ? (v === '0' ? d : v + d) : v));
  };
  const plus = () => {
    if (a) setField('b');
  };
  const erase = () => {
    setMsg('');
    if (field === 'b' && !b) return setField('a');
    (field === 'a' ? setA : setB)((v) => v.slice(0, -1));
  };
  const go = () => {
    const x = Number(a);
    const y = Number(b);
    let text = '';
    if (!a || !b) text = 'Écris les deux nombres du calcul.';
    else if (x === 0 || y === 0) text = 'Les deux nombres doivent être plus grands que 0.';
    else if (x + y > 999) text = 'Pour l’instant, le résultat doit rester plus petit que 1000.';
    if (text) {
      setMsg(text);
      say(text);
      return;
    }
    onStart(x, y);
  };

  const keys = useRef({ typeDigit, plus, erase, go });
  keys.current = { typeDigit, plus, erase, go };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = keys.current;
      if (/^[0-9]$/.test(e.key)) k.typeDigit(e.key);
      else if (e.key === '+') k.plus();
      else if (e.key === 'Backspace') k.erase();
      else if (e.key === 'Enter') k.go();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <main className="screen">
      <header className="bar">
        <button className="icon-btn" onClick={onBack} aria-label="Retour">
          <Back />
        </button>
        <h1 className="bar-title">Mon calcul</h1>
      </header>
      <p className="screen-lead">Tape ton calcul</p>

      <div className="calc entry" aria-live="polite">
        <button className={`entry-box ${field === 'a' ? 'on' : ''}`} onClick={() => setField('a')} aria-label="Premier nombre">
          {a || ' '}
        </button>
        <span>+</span>
        <button className={`entry-box ${field === 'b' ? 'on' : ''}`} onClick={() => setField('b')} aria-label="Second nombre">
          {b || ' '}
        </button>
      </div>
      <p className="feedback soft">{msg}</p>

      <Keypad onDigit={typeDigit} />
      <div className="row-3">
        <button className="btn" onClick={erase}>
          Effacer
        </button>
        <button className="btn plus-key" onClick={plus} disabled={!a || field === 'b'}>
          +
        </button>
        <button className="btn primary" onClick={go}>
          C'est parti !
        </button>
      </div>
    </main>
  );
}
