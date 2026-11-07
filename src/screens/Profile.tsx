import { useState } from 'react';
import Avatar from '../components/Avatar';
import { Back } from '../components/Icons';
import Photobooth from '../components/Photobooth';
import { TrophyBadge, MedalIcon } from '../components/Rewards';
import {
  CHRONO_SECONDS,
  MEDAL_LABEL,
  PROFILE_COLORS,
  RACE_GOALS,
  TROPHIES,
  bestOf,
  formatTime,
  medalFor,
  trophiesOf,
  useProfiles,
} from '../lib/profiles';
import type { TenLevel } from '../engine/tens';

interface Props {
  id: string;
  onBack: () => void;
}

const LEVEL_LABEL: Record<TenLevel, string> = { ten: '10', decade: '100' };

/** Page de profil : photo, records, trophées, derniers concours. */
export default function ProfilePage({ id, onBack }: Props) {
  const { state, actions, saveError } = useProfiles();
  const p = state.profiles.find((x) => x.id === id);
  const [booth, setBooth] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [level, setLevel] = useState<TenLevel>('ten');

  if (!p) {
    return (
      <main className="screen">
        <header className="bar">
          <button className="icon-btn" onClick={onBack} aria-label="Retour">
            <Back />
          </button>
        </header>
      </main>
    );
  }

  const mine = state.scores.filter((s) => s.profileId === p.id);
  const trophies = trophiesOf(state.scores, p.id);
  const events = [
    { label: '60 secondes', best: bestOf(state.scores, p.id, 'chrono', level, CHRONO_SECONDS), show: (s: { pairs: number }) => `${s.pairs} paires` },
    ...RACE_GOALS.map((g) => ({
      label: `Course de ${g}`,
      best: bestOf(state.scores, p.id, 'race', level, g),
      show: (s: { ms: number }) => formatTime(s.ms),
    })),
  ];

  if (booth) {
    return (
      <main className="screen">
        <header className="bar">
          <button className="icon-btn" onClick={() => setBooth(false)} aria-label="Retour">
            <Back />
          </button>
          <h1 className="bar-title">Nouvelle photo</h1>
        </header>
        <Photobooth
          onPhoto={(photo) => {
            actions.update(p.id, { photo });
            setBooth(false);
          }}
          onCancel={() => setBooth(false)}
        />
      </main>
    );
  }

  return (
    <main className="screen profile">
      <header className="bar">
        <button className="icon-btn" onClick={onBack} aria-label="Retour">
          <Back />
        </button>
      </header>

      <section className="profile-hero" style={{ ['--me' as string]: p.color }}>
        <button className="profile-photo" onClick={() => setBooth(true)} aria-label="Changer la photo">
          <Avatar profile={p} size={140} ring="var(--me)" />
          <span className="photo-badge" aria-hidden="true">
            <svg viewBox="0 0 48 40">
              <rect x="3" y="9" width="42" height="28" rx="6" />
              <circle cx="24" cy="23" r="8" />
            </svg>
          </span>
        </button>
        {renaming ? (
          <input
            id="rename"
            className="name-input"
            defaultValue={p.name}
            autoFocus
            maxLength={16}
            onBlur={(e) => {
              actions.update(p.id, { name: e.target.value.trim() || p.name });
              setRenaming(false);
            }}
            onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
          />
        ) : (
          <button className="profile-name" onClick={() => setRenaming(true)}>
            {p.name}
          </button>
        )}
        <div className="color-row small" role="radiogroup" aria-label="Couleur">
          {PROFILE_COLORS.map((c) => (
            <button
              key={c}
              role="radio"
              aria-checked={c === p.color}
              className={`color-dot ${c === p.color ? 'on' : ''}`}
              style={{ background: c }}
              onClick={() => actions.update(p.id, { color: c })}
              aria-label="Couleur"
            />
          ))}
        </div>
        <p className="profile-count">
          {mine.length} concours · {trophies.size} trophée{trophies.size > 1 ? 's' : ''}
        </p>
      </section>
      {saveError && <p className="feedback soft">Mémoire pleine : la dernière modification n'est pas gardée.</p>}

      <h2 className="section-title">Mes records</h2>
      <div className="answer-tabs" role="tablist" aria-label="Niveau">
        {(['ten', 'decade'] as TenLevel[]).map((l) => (
          <button key={l} role="tab" className="answer-tab" aria-selected={level === l} onClick={() => setLevel(l)}>
            Amoureux de {LEVEL_LABEL[l]}
          </button>
        ))}
      </div>
      <div className="record-grid">
        {events.map((e) => {
          const medal = e.best ? medalFor(e.best) : null;
          return (
            <div key={e.label} className={`record ${e.best ? '' : 'empty'}`}>
              <span className="record-label">{e.label}</span>
              <b className="record-value">{e.best ? e.show(e.best) : '—'}</b>
              {medal && (
                <span className="record-medal">
                  <MedalIcon medal={medal} size={28} /> {MEDAL_LABEL[medal]}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <h2 className="section-title">Mes trophées</h2>
      <div className="trophy-grid">
        {TROPHIES.map((t) => (
          <TrophyBadge key={t.id} trophy={t} earned={trophies.has(t.id)} />
        ))}
      </div>

      {mine.length > 0 && (
        <>
          <h2 className="section-title">Derniers concours</h2>
          <ul className="history">
            {mine
              .slice(-6)
              .reverse()
              .map((s) => {
                const medal = medalFor(s);
                return (
                  <li key={s.id}>
                    <span>{new Date(s.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
                    <span>{s.mode === 'chrono' ? '60 s' : `Course ${s.goal}`}</span>
                    <b>{s.mode === 'chrono' ? `${s.pairs} paires` : s.pairs >= s.goal ? formatTime(s.ms) : 'arrêtée'}</b>
                    {medal ? <MedalIcon medal={medal} size={22} /> : <span />}
                  </li>
                );
              })}
          </ul>
        </>
      )}

      {confirm ? (
        <div className="confirm">
          <p>Supprimer {p.name} et ses scores ?</p>
          <div className="row-2">
            <button className="btn" onClick={() => setConfirm(false)}>
              Non
            </button>
            <button
              className="btn danger"
              onClick={() => {
                actions.remove(p.id);
                onBack();
              }}
            >
              Oui, supprimer
            </button>
          </div>
        </div>
      ) : (
        <button className="btn slim plain" onClick={() => setConfirm(true)}>
          Supprimer ce joueur
        </button>
      )}
    </main>
  );
}
