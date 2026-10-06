// Runder Avatar mit Anfangsbuchstaben (Freunde, Ranglisten).
export function AvatarDot({ name, me = false }: { name: string; me?: boolean }) {
  const letter = (name.trim()[0] ?? '?').toUpperCase();
  return <span className={`avatar-dot${me ? ' me' : ''}`} aria-hidden="true">{letter}</span>;
}
