import { useCallback, useEffect, useState } from 'react';
import type { Exercise as Ex } from './engine/types';
import Build from './screens/Build';
import CalcEntry from './screens/CalcEntry';
import Exercise from './screens/Exercise';
import Home from './screens/Home';
import Levels from './screens/Levels';
import Picker from './screens/Picker';
import Ten from './screens/Ten';
import Contest from './screens/Contest';
import Players from './screens/Players';
import ProfilePage from './screens/Profile';
import { ProfilesContext, useProfilesStore } from './lib/profiles';
import type { TenLevel } from './engine/tens';
import { SoundContext, playSound, type SoundName } from './lib/sound';
import { SayContext, speak, unlockSpeechOnFirstTouch } from './lib/speech';
import { usePrefs } from './lib/storage';

type Screen =
  | { name: 'home' }
  | { name: 'levels' }
  | { name: 'picker'; level: number }
  | { name: 'exercise'; level: number; fixed?: Ex }
  | { name: 'calc' }
  | { name: 'build' }
  | { name: 'ten' }
  | { name: 'contest'; level: TenLevel }
  | { name: 'players'; back: Screen }
  | { name: 'profile'; id: string; back: Screen };

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
  const profiles = useProfilesStore();
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
      <ProfilesContext.Provider value={profiles}>
        {screen.name === 'home' && (
          <Home
            prefs={prefs}
            onAddition={() => setScreen({ name: 'levels' })}
            onMyCalc={() => setScreen({ name: 'calc' })}
            onBuild={() => setScreen({ name: 'build' })}
            onTen={() => setScreen({ name: 'ten' })}
            onPlayers={() => setScreen({ name: 'players', back: { name: 'home' } })}
          />
        )}
        {screen.name === 'levels' && (
          <Levels prefs={prefs} onBack={home} onPick={(level) => setScreen({ name: 'picker', level })} />
        )}
        {screen.name === 'picker' && (
          <Picker
            level={screen.level}
            selected={prefs.visual}
            onChange={(visual) => update({ visual })}
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
        {screen.name === 'ten' && (
          <Ten prefs={prefs} update={update} onBack={home} onContest={(level) => setScreen({ name: 'contest', level })} />
        )}
        {screen.name === 'contest' && (
          <Contest
            level={screen.level}
            onBack={() => setScreen({ name: 'ten' })}
            onPlayers={() => setScreen({ name: 'players', back: screen })}
            onProfile={(id) => setScreen({ name: 'profile', id, back: screen })}
          />
        )}
        {screen.name === 'players' && (
          <Players
            onBack={() => setScreen(screen.back)}
            onDone={() => setScreen(screen.back)}
            onEdit={(id) => setScreen({ name: 'profile', id, back: screen })}
          />
        )}
        {screen.name === 'profile' && <ProfilePage id={screen.id} onBack={() => setScreen(screen.back)} />}
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
      </ProfilesContext.Provider>
      </SayContext.Provider>
    </SoundContext.Provider>
  );
}
