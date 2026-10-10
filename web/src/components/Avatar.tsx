// Profilbild im Neon-Stil: Büste als leuchtender Umriss, ohne Gesicht, mit Level auf der Brust.
// Optional mit Shop-Look (skin: andere Neonfarbe) und Accessoire (Stirnband, Brille, Cap, Kette, Krone).
const GOLD = '#ffcc33';

function Accessory({ id }: { id?: string }) {
  switch (id) {
    case 'acc_band':
      return (
        <g>
          <path d="M73 40 C85 34 115 34 127 40 L127 48 C115 42 85 42 73 48 Z" fill="var(--neon)" opacity="0.9" />
          <path d="M127 42 L140 50 L136 54 Z M127 46 L138 60 L133 61 Z" fill="var(--neon)" opacity="0.75" />
        </g>
      );
    case 'acc_shades':
      return (
        <g fill="#0b0d10" stroke="var(--neon)" strokeWidth="2">
          <rect x="77" y="47" width="20" height="11" rx="4" />
          <rect x="103" y="47" width="20" height="11" rx="4" />
          <path d="M97 51 L103 51" fill="none" />
        </g>
      );
    case 'acc_cap':
      return (
        <g fill="var(--neon)">
          <path d="M72 42 C72 16 128 16 128 42 Z" opacity="0.9" />
          <path d="M70 42 L146 42 C143 48 120 49 70 47 Z" />
        </g>
      );
    case 'acc_chain':
      return (
        <g fill="none" stroke={GOLD} strokeWidth="3" strokeLinecap="round">
          <path d="M80 106 C88 126 112 126 120 106" />
          <circle cx="100" cy="124" r="5" fill={GOLD} />
        </g>
      );
    case 'acc_crown':
      return <path d="M76 26 L82 6 L92 20 L100 2 L108 20 L118 6 L124 26 Z" fill={GOLD} stroke="#0b0d10" strokeWidth="1.5" strokeLinejoin="round" />;
    default:
      return null;
  }
}

export function Avatar({ level, skin, accessory }: { level: number; skin?: string; accessory?: string }) {
  return (
    <svg className="avatar" viewBox="0 0 200 170" role="img" aria-label={`Avatar, Level ${level}`} data-skin={skin} data-accessory={accessory}>
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
      <Accessory id={accessory} />
      <text x="100" y="160" textAnchor="middle" fontSize="17" fontWeight="900" fill="var(--neon)" letterSpacing="1">
        LV {level}
      </text>
    </svg>
  );
}
