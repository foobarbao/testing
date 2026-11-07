import { useEffect } from 'react';
import type { Profile } from '../lib/profiles';
import { canSpeak, speak, useSay } from '../lib/speech';
import { Speaker } from './Icons';
import Avatar from './Avatar';

interface Props {
  profile: Profile;
  onReady: () => void;
  onCancel?: () => void;
}

/**
 * « Passe le téléphone à Tom » : pour des enfants qui lisent encore peu,
 * tout passe par la grande photo, la voix et un seul gros bouton.
 */
export default function Handoff({ profile, onReady, onCancel }: Props) {
  const say = useSay();
  const sentence = `Passe le téléphone à ${profile.name} ! ${profile.name}, touche ta photo.`;
  useEffect(() => {
    say(sentence);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.id]);

  return (
    <main className="screen handoff" style={{ ['--me' as string]: profile.color }}>
      <div className="handoff-pass" aria-hidden="true">
        <svg viewBox="0 0 160 70" className="pass-art">
          <path d="M8 52c10-2 18-8 26-8h14" className="arm" />
          <path d="M152 52c-10-2-18-8-26-8h-14" className="arm" />
          <g className="pass-phone">
            <rect x="66" y="10" width="28" height="48" rx="6" className="phone" />
            <rect x="70" y="16" width="20" height="32" rx="2" className="phone-screen" />
          </g>
        </svg>
      </div>
      <p className="handoff-say">
        Passe le téléphone à
        {canSpeak && (
          <button className="icon-btn listen" onClick={() => speak(sentence)} aria-label="Écouter">
            <Speaker />
          </button>
        )}
      </p>
      <button className="handoff-photo" onClick={onReady} aria-label={`C'est moi, ${profile.name}`}>
        <Avatar profile={profile} size={190} ring={profile.color} />
      </button>
      <b className="handoff-name">{profile.name}</b>
      <button className="btn primary big handoff-go" onClick={onReady}>
        <Avatar profile={profile} size={40} />
        C'est moi !
      </button>
      {onCancel && (
        <button className="btn slim plain" onClick={onCancel}>
          Retour
        </button>
      )}
    </main>
  );
}
