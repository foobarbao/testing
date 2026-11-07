import { useCallback, useEffect, useState } from 'react';
import Exercise from './screens/Exercise';
import Home from './screens/Home';
import Levels from './screens/Levels';
import Picker from './screens/Picker';
import { SoundContext, playSound, type SoundName } from './lib/sound';
import { usePrefs } from './lib/storage';

type Screen = { name: 'home' } | { name: 'levels' } | { name: 'picker'; level: number } | { name: 'exercise'; level: number };

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
    document.documentElement.style.setProperty('--dur', `${Math.round(600 / prefs.speed)}ms`);
  }, [prefs.speed]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [screen.name]);

  const play = useCallback((name: SoundName) => prefs.sound && playSound(name), [prefs.sound]);

  return (
    <SoundContext.Provider value={play}>
      {screen.name === 'home' && <Home prefs={prefs} onAddition={() => setScreen({ name: 'levels' })} />}
      {screen.name === 'levels' && (
        <Levels
          prefs={prefs}
          onBack={() => setScreen({ name: 'home' })}
          onPick={(level) => setScreen({ name: 'picker', level })}
        />
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
      {screen.name === 'exercise' && (
        <Exercise
          key={screen.level}
          level={screen.level}
          prefs={prefs}
          update={update}
          onBack={() => setScreen({ name: 'levels' })}
        />
      )}
    </SoundContext.Provider>
  );
}
