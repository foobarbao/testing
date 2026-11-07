/** Voix de synthèse française (Web Speech API), si le navigateur en a une. */
let voice: SpeechSynthesisVoice | null | undefined;

function frenchVoice(): SpeechSynthesisVoice | null {
  if (voice !== undefined && voice !== null) return voice;
  try {
    const all = speechSynthesis.getVoices();
    voice = all.find((v) => v.lang === 'fr-FR') ?? all.find((v) => v.lang.startsWith('fr')) ?? null;
  } catch {
    voice = null;
  }
  return voice;
}

export function speak(text: string) {
  try {
    const u = new SpeechSynthesisUtterance(text.replace(/…/g, '.'));
    u.lang = 'fr-FR';
    u.rate = 0.92;
    u.pitch = 1.1;
    const v = frenchVoice();
    if (v) u.voice = v;
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
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

export const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window;
