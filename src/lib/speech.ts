import { createContext, useContext } from 'react';

/** Voix de synthèse française (Web Speech API). */
export const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window;

let voices: SpeechSynthesisVoice[] = [];
let unlocked = false;

function refreshVoices() {
  try {
    voices = speechSynthesis.getVoices();
  } catch {
    voices = [];
  }
}

if (canSpeak) {
  refreshVoices();
  // Chrome et Android chargent la liste des voix après coup.
  speechSynthesis.addEventListener?.('voiceschanged', refreshVoices);
}

/** Voix préférées, de la plus naturelle à la plus basique. */
const PREFERRED = ['Amélie', 'Audrey', 'Thomas', 'Google français', 'Marie', 'Aurélie', 'Denise', 'Henri'];

function frenchVoice(): SpeechSynthesisVoice | null {
  if (!voices.length) refreshVoices();
  const fr = voices.filter((v) => v.lang.replace('_', '-').toLowerCase().startsWith('fr'));
  if (!fr.length) return null;
  for (const name of PREFERRED) {
    const v = fr.find((x) => x.name.includes(name));
    if (v) return v;
  }
  return fr.find((v) => v.lang === 'fr-FR' && v.localService) ?? fr.find((v) => v.lang === 'fr-FR') ?? fr[0];
}

/** Rend un texte de l'appli agréable à écouter : « 47 + 28 = 75 » devient « 47 plus 28 égale 75 ». */
export function toSpeech(text: string): string {
  return text
    .replace(/\s*\+\s*/g, ' plus ')
    .replace(/\s*=\s*/g, ' égale ')
    .replace(/\s*×\s*/g, ' fois ')
    .replace(/…/g, '. ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function speak(text: string) {
  if (!canSpeak) return;
  try {
    const u = new SpeechSynthesisUtterance(toSpeech(text));
    u.lang = 'fr-FR';
    u.rate = 0.9;
    u.pitch = 1.1;
    const v = frenchVoice();
    if (v) u.voice = v;
    speechSynthesis.cancel();
    // Safari ignore parfois une phrase lancée juste après cancel().
    setTimeout(() => speechSynthesis.speak(u), 30);
  } catch {
    /* pas de voix disponible */
  }
}

export function stopSpeaking() {
  try {
    speechSynthesis.cancel();
  } catch {
    /* rien */
  }
}

/**
 * Sur iPhone et iPad, la voix ne parle qu'après un premier geste de l'enfant.
 * On prononce une phrase vide au premier appui pour la débloquer.
 */
export function unlockSpeechOnFirstTouch() {
  if (!canSpeak || unlocked) return;
  const unlock = () => {
    unlocked = true;
    try {
      const u = new SpeechSynthesisUtterance(' ');
      u.volume = 0;
      speechSynthesis.speak(u);
    } catch {
      /* rien */
    }
    window.removeEventListener('pointerdown', unlock, true);
  };
  window.addEventListener('pointerdown', unlock, true);
}

/** Lit un texte si la voix est activée dans les réglages. */
export const SayContext = createContext<(text: string) => void>(() => {});
export const useSay = () => useContext(SayContext);
