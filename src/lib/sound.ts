import { createContext, useContext } from 'react';

/** Petits sons synthétisés : aucun fichier à télécharger, fonctionne hors ligne. */
export type SoundName = 'click' | 'pop' | 'whoosh' | 'fanfare' | 'soft';

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(ac: AudioContext, freq: number, start: number, dur: number, type: OscillatorType, gain = 0.15) {
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, start);
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(gain, start + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  o.connect(g).connect(ac.destination);
  o.start(start);
  o.stop(start + dur + 0.02);
}

export function playSound(name: SoundName) {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime;
  switch (name) {
    case 'click':
      tone(ac, 1800, t, 0.04, 'square', 0.08);
      tone(ac, 900, t + 0.03, 0.05, 'square', 0.05);
      break;
    case 'pop':
      tone(ac, 520, t, 0.09, 'sine', 0.2);
      tone(ac, 880, t + 0.04, 0.08, 'sine', 0.12);
      break;
    case 'whoosh': {
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.type = 'triangle';
      o.frequency.setValueAtTime(300, t);
      o.frequency.exponentialRampToValueAtTime(1200, t + 0.3);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.12, t + 0.05);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
      o.connect(g).connect(ac.destination);
      o.start(t);
      o.stop(t + 0.4);
      break;
    }
    case 'fanfare':
      [523, 659, 784, 1047].forEach((f, i) => tone(ac, f, t + i * 0.11, 0.25, 'triangle', 0.16));
      tone(ac, 1047, t + 0.45, 0.5, 'sine', 0.12);
      break;
    case 'soft':
      tone(ac, 440, t, 0.18, 'sine', 0.1);
      tone(ac, 392, t + 0.16, 0.25, 'sine', 0.1);
      break;
  }
}

export const SoundContext = createContext<(name: SoundName) => void>(() => {});
export const useSound = () => useContext(SoundContext);
