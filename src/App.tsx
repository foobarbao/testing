import { useCallback, useEffect, useState } from 'react';
import type { Exercise as Ex } from './engine/types';
import Build from './screens/Build';
import CalcEntry from './screens/CalcEntry';
import Exercise from './screens/Exercise';
import Home from './screens/Home';
import Levels from './screens/Levels';
import Picker from './screens/Picker';
import { SoundContext, playSound, type SoundName } from './lib/sound';
import { SayContext, speak, unlockSpeechOnFirstTouch } from './lib/speech';
import { usePrefs } from './lib/storage';

type Screen =
  | { name: 'home' }
  | { name: 'levels' }
  | { name: 'picker'; level: number }
  | { name: 'exercise'; level: number; fixed?: Ex }
  | { name: 'calc' }
  | { name: 'build' };

function initialScreen(): Screen {
  try {
    const level = Number(new URLSearchParams(location.search).get('niveau'));
    if (level >= 1 && level <= 4) return { name: 'exercise', level };
  } catch {
    /* rien */
  }
  return { name: 'home' };
}

export default function App() {
  const [prefs, update] = usePrefs();
  const [screen, setScreen] = useState<Screen>(initialScreen);

  useEffect(() => {
    unlockSpeechOnFirstTouch();
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty('--dur', `${Math.round(600 / prefs.speed)}ms`);
  }, [prefs.speed]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [screen]);

  const play = useCallback((name: SoundName) => prefs.sound && playSound(name), [prefs.sound]);
  const say = useCallback((text: string) => prefs.voice && speak(text), [prefs.voice]);
  const home = () => setScreen({ name: 'home' });

  return (
    <SoundContext.Provider value={play}>
      <SayContext.Provider value={say}>
        {screen.name === 'home' && (
          <Home
            prefs={prefs}
            onAddition={() => setScreen({ name: 'levels' })}
            onMyCalc={() => setScreen({ name: 'calc' })}
            onBuild={() => setScreen({ name: 'build' })}
          />
        )}
        {screen.name === 'levels' && (
          <Levels prefs={prefs} onBack={home} onPick={(level) => setScreen({ name: 'picker', level })} />
        )}
        {screen.name === 'picker' && (
          <Picker
            level={screen.level}
            selected={prefs.visuals}
            onChange={(visuals) => update({ visuals })}
            onBack={() => setScreen({ name: 'levels' })}
            onStart={() => setScreen({ name: 'exercise', level: screen.level })}
          />
        )}
        {screen.name === 'calc' && (
          <CalcEntry
            onBack={home}
            onStart={(a, b) => setScreen({ name: 'exercise', level: 0, fixed: { op: 'add', a, b, level: 0 } })}
          />
        )}
        {screen.name === 'build' && <Build prefs={prefs} update={update} onBack={home} />}
        {screen.name === 'exercise' && (
          <Exercise
            key={screen.fixed ? `${screen.fixed.a}+${screen.fixed.b}` : screen.level}
            level={screen.level}
            fixed={screen.fixed}
            prefs={prefs}
            update={update}
            onBack={() => setScreen(screen.fixed ? { name: 'calc' } : { name: 'levels' })}
            onAnotherCalc={() => setScreen({ name: 'calc' })}
          />
        )}
      </SayContext.Provider>
    </SoundContext.Provider>
  );
}
