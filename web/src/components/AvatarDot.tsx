// Runder Avatar: Profilbild (falls vorhanden) oder Anfangsbuchstabe (Freunde, Ranglisten, Profil).
import { useAvatarUrl } from '../lib/avatars';

export function AvatarDot({ name, me = false, userId, size }: { name: string; me?: boolean; userId?: string; size?: number }) {
  const url = useAvatarUrl(userId);
  const letter = (name.trim()[0] ?? '?').toUpperCase();
  const style = size ? { width: size, height: size, fontSize: size * 0.5 } : undefined;
  return url ? (
    <img className={`avatar-dot photo${me ? ' me' : ''}`} src={url} alt="" style={style} />
  ) : (
    <span className={`avatar-dot${me ? ' me' : ''}`} aria-hidden="true" style={style}>{letter}</span>
  );
}
