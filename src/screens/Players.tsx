import { useEffect, useState } from 'react';
import Avatar from '../components/Avatar';
import Handoff from '../components/Handoff';
import { Back } from '../components/Icons';
import Photobooth from '../components/Photobooth';
import { PROFILE_COLORS, useProfiles, type Profile } from '../lib/profiles';
import { useSay } from '../lib/speech';

interface Props {
  onBack: () => void;
  /** Joueur choisi (ou créé). */
  onDone: () => void;
  onEdit: (id: string) => void;
}

/** « Qui joue ? » : choisir son profil, ou en créer un avec son prénom, sa couleur et sa photo. */
export default function Players({ onBack, onDone, onEdit }: Props) {
  const { state, actions } = useProfiles();
  const say = useSay();
  const [step, setStep] = useState<'list' | 'name' | 'photo'>(state.profiles.length ? 'list' : 'name');
  const [name, setName] = useState('');
  const [color, setColor] = useState(PROFILE_COLORS[state.profiles.length % PROFILE_COLORS.length]);
  const [handoff, setHandoff] = useState<Profile | null>(null);

  useEffect(() => {
    if (step === 'list') say('Qui joue ? Touche ta photo.');
    if (step === 'name') say('Écris ton prénom.');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  if (handoff) {
    return (
      <Handoff
        profile={handoff}
        onReady={() => {
          actions.select(handoff.id);
          onDone();
        }}
        onCancel={() => setHandoff(null)}
      />
    );
  }

  const create = (photo?: string) => {
    const p = actions.add(name, color, photo);
    say(`Bienvenue ${p.name} !`);
    onDone();
  };

  if (step === 'photo') {
    return (
      <main className="screen">
        <header className="bar">
          <button className="icon-btn" onClick={() => setStep('name')} aria-label="Retour">
            <Back />
          </button>
          <h1 className="bar-title">Ta photo</h1>
        </header>
        <Photobooth onPhoto={(photo) => create(photo)} onCancel={() => create()} />
      </main>
    );
  }

  if (step === 'name') {
    return (
      <main className="screen">
        <header className="bar">
          <button className="icon-btn" onClick={() => (state.profiles.length ? setStep('list') : onBack())} aria-label="Retour">
            <Back />
          </button>
          <h1 className="bar-title">Nouveau joueur</h1>
        </header>
        <div className="new-player">
          <Avatar profile={{ id: 'new', name: name || '?', color, created: 0 }} size={120} />
          <input
            id="player-name"
            className="name-input"
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 16))}
            placeholder="Ton prénom"
            autoComplete="off"
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && name.trim() && setStep('photo')}
          />
          <div className="color-row" role="radiogroup" aria-label="Ta couleur">
            {PROFILE_COLORS.map((c) => (
              <button
                key={c}
                role="radio"
                aria-checked={c === color}
                className={`color-dot ${c === color ? 'on' : ''}`}
                style={{ background: c }}
                onClick={() => setColor(c)}
                aria-label="Couleur"
              />
            ))}
          </div>
          <button className="btn primary big" disabled={!name.trim()} onClick={() => setStep('photo')}>
            Suivant
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="screen">
      <header className="bar">
        <button className="icon-btn" onClick={onBack} aria-label="Retour">
          <Back />
        </button>
        <h1 className="bar-title">Qui joue ?</h1>
      </header>
      <div className="player-grid">
        {state.profiles.map((p) => (
          <div key={p.id} className={`player-card ${state.current === p.id ? 'on' : ''}`}>
            <button
              className="player-pick"
              onClick={() => {
                // Un autre enfant prend la main : on lui fait passer le téléphone.
                if (state.current && state.current !== p.id) return setHandoff(p);
                actions.select(p.id);
                say(`C'est parti ${p.name} !`);
                onDone();
              }}
            >
              <Avatar profile={p} size={92} ring={state.current === p.id ? p.color : undefined} />
              <b>{p.name}</b>
            </button>
            <button className="player-edit" onClick={() => onEdit(p.id)} aria-label={`Profil de ${p.name}`}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M5 19l1.5-5L16 4.5l3.5 3.5L10 17.5z" />
              </svg>
            </button>
          </div>
        ))}
        <button
          className="player-card add"
          onClick={() => {
            setName('');
            setColor(PROFILE_COLORS[state.profiles.length % PROFILE_COLORS.length]);
            setStep('name');
          }}
        >
          <span className="avatar add-avatar" style={{ width: 92, height: 92 }}>
            +
          </span>
          <b>Ajouter</b>
        </button>
      </div>
    </main>
  );
}
