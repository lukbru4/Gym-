// Profilbild im Neon-Stil: Büste als leuchtender Umriss, ohne Gesicht, mit Level auf der Brust.
export function Avatar({ level }: { level: number }) {
  return (
    <svg className="avatar" viewBox="0 0 200 170" role="img" aria-label={`Avatar, Level ${level}`}>
      <defs>
        <filter id="avatar-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2.2" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <rect width="200" height="170" fill="var(--neon-bg)" />
      <g fill="none" stroke="var(--neon)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" filter="url(#avatar-glow)">
        <ellipse cx="100" cy="54" rx="27" ry="32" />
        <path d="M88 84 C89 92 88 98 86 102 M112 84 C111 92 112 98 114 102" />
        <path d="M30 170 C32 132 50 112 86 102 C94 108 106 108 114 102 C150 112 168 132 170 170" />
        <path d="M58 122 C70 134 90 138 100 132 C110 138 130 134 142 122" opacity="0.55" />
      </g>
      <text x="100" y="160" textAnchor="middle" fontSize="17" fontWeight="900" fill="var(--neon)" letterSpacing="1">
        LV {level}
      </text>
    </svg>
  );
}
