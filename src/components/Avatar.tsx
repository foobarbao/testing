import type { Profile } from '../lib/profiles';

/** Photo ronde du joueur, ou son initiale sur sa couleur. */
export default function Avatar({ profile, size = 56, ring }: { profile: Profile | null; size?: number; ring?: string }) {
  const style = {
    width: size,
    height: size,
    fontSize: size * 0.45,
    background: profile?.color ?? 'var(--line)',
    boxShadow: ring ? `0 0 0 ${Math.max(3, size / 18)}px ${ring}` : undefined,
  };
  return (
    <span className="avatar" style={style} aria-hidden="true">
      {profile?.photo ? <img src={profile.photo} alt="" /> : <span>{profile ? profile.name.slice(0, 1).toUpperCase() : '?'}</span>}
    </span>
  );
}
