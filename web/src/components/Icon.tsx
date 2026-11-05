// Eigene flache Illustrations-Icons (statt Emojis): 24×24, runde Formen, je Motiv eine Grundfarbe + hellere Fläche,
// keine Verläufe. Einheitlicher, ruhiger Stil für die ganze App.
import type { ReactNode } from 'react';

const C = {
  red: '#e5484d', redL: '#ffd1d3', orange: '#f76b15', orangeL: '#ffdcc3', yellow: '#f5b300', yellowL: '#fff1b8',
  green: '#30a46c', greenL: '#c6f0d6', blue: '#0090ff', blueL: '#cde7ff', purple: '#8e4ec6', purpleL: '#e7d7f8',
  gray: '#6f7782', grayL: '#dfe3e8', dark: '#2b2f36', white: '#ffffff', skin: '#f2c6a0',
};

const P: Record<string, ReactNode> = {
  dumbbell: <><rect x="1.5" y="8" width="4" height="8" rx="1.6" fill={C.dark} /><rect x="18.5" y="8" width="4" height="8" rx="1.6" fill={C.dark} /><rect x="4.5" y="6" width="3" height="12" rx="1.4" fill={C.red} /><rect x="16.5" y="6" width="3" height="12" rx="1.4" fill={C.red} /><rect x="7.5" y="10.8" width="9" height="2.4" rx="1.2" fill={C.gray} /></>,
  flame: <><path d="M12 2.5c1 3.5 5.5 5.6 5.5 10.6A5.5 5.5 0 0 1 6.5 13c0-2.4 1.2-3.9 2.4-5 .3 1.6 1 2.6 2 3-.4-3.2.4-6 1.1-8.5Z" fill={C.orange} /><path d="M12 11c.6 1.8 3 2.8 3 5.2a3 3 0 0 1-6 0c0-1.4.8-2.3 1.5-3 .2.8.6 1.3 1.1 1.5-.2-1.4 0-2.6.4-3.7Z" fill={C.yellow} /></>,
  trophy: <><path d="M7 3h10v5a5 5 0 0 1-10 0V3Z" fill={C.yellow} /><path d="M7 5H4.5a2.5 2.5 0 0 0 2.6 4.2M17 5h2.5a2.5 2.5 0 0 1-2.6 4.2" fill="none" stroke={C.yellow} strokeWidth="1.8" strokeLinecap="round" /><rect x="10.8" y="12.5" width="2.4" height="4" fill={C.yellow} /><rect x="7.5" y="16.5" width="9" height="4" rx="1.2" fill={C.dark} /><path d="M9.3 5.2v2.6" stroke={C.yellowL} strokeWidth="1.6" strokeLinecap="round" /></>,
  star: <path d="m12 2.8 2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3-4.6-4.4 6.3-.9L12 2.8Z" fill={C.yellow} stroke={C.orange} strokeWidth="1" strokeLinejoin="round" />,
  pill: <><g transform="rotate(-40 12 12)"><rect x="3" y="8" width="18" height="8" rx="4" fill={C.redL} /><path d="M12 8h5a4 4 0 0 1 0 8h-5Z" fill={C.red} /></g></>,
  bolt: <path d="M13.5 2 5 13.5h5.5L9 22l9.5-12.5H13L13.5 2Z" fill={C.yellow} stroke={C.orange} strokeWidth="1" strokeLinejoin="round" />,
  sun: <><circle cx="12" cy="12" r="5" fill={C.yellow} />{[0, 45, 90, 135, 180, 225, 270, 315].map((a) => <rect key={a} x="11" y="1.5" width="2" height="3.5" rx="1" fill={C.orange} transform={`rotate(${a} 12 12)`} />)}</>,
  moon: <><path d="M15.5 3.2A8.5 8.5 0 1 0 20.8 15 7 7 0 0 1 15.5 3.2Z" fill={C.purple} /><circle cx="9" cy="10" r="1.2" fill={C.purpleL} /><circle cx="11.5" cy="15.5" r="0.9" fill={C.purpleL} /></>,
  fish: <><path d="M3 12c3-5 9-6.5 14-2.5L21 6v12l-4-3.5C12 18.5 6 17 3 12Z" fill={C.blue} /><circle cx="8" cy="11" r="1.1" fill={C.white} /><path d="M11.5 9.5c.8 1.6.8 3.4 0 5" stroke={C.blueL} strokeWidth="1.4" fill="none" strokeLinecap="round" /></>,
  shield: <><path d="M12 2.5 19.5 5v6.5c0 4.6-3.2 8-7.5 10-4.3-2-7.5-5.4-7.5-10V5L12 2.5Z" fill={C.green} /><path d="M12 5v14.3c3-1.7 5-4.3 5-7.8V6.8L12 5Z" fill={C.greenL} opacity="0.5" /><path d="m8.6 12 2.3 2.3 4.5-4.6" stroke={C.white} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></>,
  shaker: <><path d="M7 7h10l-1.3 13.2a1.6 1.6 0 0 1-1.6 1.3H9.9a1.6 1.6 0 0 1-1.6-1.3L7 7Z" fill={C.blueL} /><path d="M7.6 12h8.8l-.8 8.2a1.6 1.6 0 0 1-1.6 1.3H10a1.6 1.6 0 0 1-1.6-1.3L7.6 12Z" fill={C.blue} /><rect x="6" y="3.5" width="12" height="3.5" rx="1.2" fill={C.dark} /></>,
  drop: <><path d="M12 2.5c3.5 4.6 6.5 8 6.5 11.7a6.5 6.5 0 0 1-13 0C5.5 10.5 8.5 7.1 12 2.5Z" fill={C.blue} /><path d="M8.8 14.5a3.2 3.2 0 0 0 2.6 3" stroke={C.blueL} strokeWidth="1.6" fill="none" strokeLinecap="round" /></>,
  scale: <><rect x="3" y="4" width="18" height="16" rx="4" fill={C.grayL} /><path d="M7 11a5 5 0 0 1 10 0Z" fill={C.white} /><path d="m12 11 2.2-3" stroke={C.red} strokeWidth="1.6" strokeLinecap="round" /></>,
  camera: <><rect x="2.5" y="6.5" width="19" height="13.5" rx="3" fill={C.dark} /><path d="M8 6.5 9.4 4h5.2L16 6.5" fill={C.dark} /><circle cx="12" cy="13.2" r="4.3" fill={C.blueL} /><circle cx="12" cy="13.2" r="2.2" fill={C.blue} /><circle cx="18" cy="9.3" r="1" fill={C.yellow} /></>,
  tape: <><circle cx="9.5" cy="11" r="7" fill={C.yellow} /><circle cx="9.5" cy="11" r="2.2" fill={C.orange} /><path d="M9.5 18H21v3H9.5" fill={C.yellow} />{[12, 15, 18].map((x) => <rect key={x} x={x} y="18" width="0.9" height="1.6" fill={C.dark} />)}</>,
  calendar: <><rect x="3" y="4.5" width="18" height="16" rx="3" fill={C.white} stroke={C.grayL} /><path d="M3 7.5a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3V9H3Z" fill={C.red} /><rect x="7" y="2.5" width="2" height="4" rx="1" fill={C.dark} /><rect x="15" y="2.5" width="2" height="4" rx="1" fill={C.dark} />{[[7, 12.5], [11, 12.5], [15, 12.5], [7, 16.5], [11, 16.5]].map(([x, y]) => <rect key={`${x}-${y}`} x={x} y={y} width="2.4" height="2.2" rx="0.6" fill={C.grayL} />)}</>,
  bell: <><path d="M12 3a6 6 0 0 0-6 6v4.2L4.3 16.5h15.4L18 13.2V9a6 6 0 0 0-6-6Z" fill={C.yellow} /><path d="M9.5 18.5a2.5 2.5 0 0 0 5 0" fill={C.orange} /></>,
  gym: <><path d="M3 10.5 12 4l9 6.5V20H3Z" fill={C.redL} /><path d="M3 10.5 12 4l9 6.5" fill="none" stroke={C.red} strokeWidth="2" strokeLinejoin="round" /><rect x="8" y="14.4" width="8" height="1.6" rx="0.8" fill={C.dark} /><rect x="6.8" y="12.8" width="1.8" height="4.8" rx="0.8" fill={C.red} /><rect x="15.4" y="12.8" width="1.8" height="4.8" rx="0.8" fill={C.red} /></>,
  brick: <><rect x="2.5" y="5" width="9" height="4.5" rx="1" fill={C.orange} /><rect x="12.5" y="5" width="9" height="4.5" rx="1" fill={C.red} /><rect x="2.5" y="10.5" width="4" height="4.5" rx="1" fill={C.red} /><rect x="7.5" y="10.5" width="9" height="4.5" rx="1" fill={C.orange} /><rect x="17.5" y="10.5" width="4" height="4.5" rx="1" fill={C.red} /><rect x="2.5" y="16" width="9" height="4.5" rx="1" fill={C.orange} /><rect x="12.5" y="16" width="9" height="4.5" rx="1" fill={C.red} /></>,
  window: <><rect x="4" y="3.5" width="16" height="17" rx="2.5" fill={C.dark} /><rect x="6" y="5.5" width="5" height="6" rx="1" fill={C.blueL} /><rect x="13" y="5.5" width="5" height="6" rx="1" fill={C.blueL} /><rect x="6" y="13" width="5" height="5.5" rx="1" fill={C.blueL} /><rect x="13" y="13" width="5" height="5.5" rx="1" fill={C.blueL} /></>,
  lamp: <><path d="M7 9a5 5 0 0 1 10 0v2.5H7Z" fill={C.yellow} /><rect x="11" y="2.5" width="2" height="4" fill={C.dark} /><path d="M9 15.5h6l-1 2.5h-4Z" fill={C.yellowL} /><path d="M12 11.5v3" stroke={C.yellowL} strokeWidth="2" /></>,
  floor: <><path d="M2.5 15 12 10l9.5 5L12 20Z" fill={C.grayL} /><path d="M7.2 12.5 16.8 17.5M16.8 12.5 7.2 17.5" stroke={C.gray} strokeWidth="1" /></>,
  ruler: <><rect x="2.5" y="8.5" width="19" height="7" rx="1.5" fill={C.yellow} />{[5, 8, 11, 14, 17].map((x, i) => <rect key={x} x={x} y="8.5" width="1" height={i % 2 ? 2 : 3.5} fill={C.dark} />)}</>,
  stairs: <><path d="M3 20h18V4h-4.5v4h-4v4h-4v4H3Z" fill={C.purpleL} /><path d="M3 20h18V4h-4.5v4h-4v4h-4v4H3Z" fill="none" stroke={C.purple} strokeWidth="1.6" strokeLinejoin="round" /></>,
  plant: <><path d="M7 15h10l-1.2 6H8.2Z" fill={C.orange} /><path d="M12 15C12 9 8 7 4.5 7.5 5 11 8 14 12 15Zm0 0c0-6 4-8.5 7.5-8-.5 3.5-3.5 7-7.5 8Z" fill={C.green} /></>,
  people: <><circle cx="8.5" cy="8" r="3.3" fill={C.skin} /><path d="M2.5 19.5a6 6 0 0 1 12 0Z" fill={C.blue} /><circle cx="16.5" cy="9" r="2.8" fill={C.skin} /><path d="M12.5 19.5a5 5 0 0 1 9 0Z" fill={C.green} /></>,
  person: <><circle cx="12" cy="7.5" r="4" fill={C.skin} /><path d="M4.5 21a7.5 7.5 0 0 1 15 0Z" fill={C.red} /></>,
  gift: <><rect x="3.5" y="9.5" width="17" height="11" rx="2" fill={C.red} /><rect x="2.5" y="7" width="19" height="4" rx="1.4" fill={C.redL} /><rect x="10.8" y="7" width="2.4" height="13.5" fill={C.yellow} /><path d="M12 7c-1.5-3-5-3.4-5-1.2C7 7 9.5 7 12 7Zm0 0c1.5-3 5-3.4 5-1.2C17 7 14.5 7 12 7Z" fill={C.yellow} /></>,
  clock: <><circle cx="12" cy="12" r="9" fill={C.blueL} /><circle cx="12" cy="12" r="9" fill="none" stroke={C.blue} strokeWidth="1.8" /><path d="M12 7v5l3.2 2" stroke={C.dark} strokeWidth="1.8" fill="none" strokeLinecap="round" /></>,
  target: <><circle cx="12" cy="12" r="9" fill={C.redL} /><circle cx="12" cy="12" r="6" fill={C.white} /><circle cx="12" cy="12" r="3" fill={C.red} /></>,
  check: <><circle cx="12" cy="12" r="9" fill={C.green} /><path d="m7.8 12.2 2.8 2.8 5.6-5.8" stroke={C.white} strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></>,
  lock: <><rect x="5" y="10.5" width="14" height="10" rx="2.5" fill={C.gray} /><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" fill="none" stroke={C.gray} strokeWidth="2.2" /><circle cx="12" cy="15.5" r="1.6" fill={C.grayL} /></>,
  thumb: <><rect x="3" y="10" width="4" height="10" rx="1.2" fill={C.blue} /><path d="M8 10.5 11.5 3.5c1.6 0 2.5 1.2 2.2 2.8L13.2 9H19a2 2 0 0 1 2 2.3l-1.2 6.8A2.3 2.3 0 0 1 17.5 20H8Z" fill={C.yellow} /></>,
  arrow: <path d="M4 12h14m-5-5.5L18.5 12 13 17.5" stroke={C.red} strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />,
  cards: <><rect x="3" y="5" width="12" height="15" rx="2" fill={C.grayL} /><rect x="9" y="3.5" width="12" height="15" rx="2" fill={C.white} stroke={C.gray} strokeWidth="1.2" /><path d="M12 8h6M12 11h6M12 14h4" stroke={C.gray} strokeWidth="1.4" strokeLinecap="round" /></>,
  chat: <><path d="M4 5h16a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 20 17h-9l-4.5 3.5V17H4a1.5 1.5 0 0 1-1.5-1.5v-9A1.5 1.5 0 0 1 4 5Z" fill={C.blue} /><path d="M7 9.5h10M7 12.5h6" stroke={C.white} strokeWidth="1.6" strokeLinecap="round" /></>,
  handshake: <><path d="M2 9.5 6 7l6 3 6-3 4 2.5-3 5-7 4-7-4Z" fill={C.skin} /><path d="m8.5 13.5 2 2M11 12l2 2M13.5 10.5l2 2" stroke={C.orange} strokeWidth="1.3" strokeLinecap="round" /></>,
  swords: <><path d="M4 4 15 15M20 4 9 15" stroke={C.gray} strokeWidth="2.4" strokeLinecap="round" /><path d="m13.5 17.5 4-4M10.5 17.5l-4-4" stroke={C.orange} strokeWidth="2.4" strokeLinecap="round" /><circle cx="18.5" cy="18.5" r="1.8" fill={C.dark} /><circle cx="5.5" cy="18.5" r="1.8" fill={C.dark} /></>,
  flag: <><rect x="4.5" y="3" width="2" height="18.5" rx="1" fill={C.dark} /><path d="M6.5 4h12l-2.5 4 2.5 4h-12Z" fill={C.grayL} /></>,
  rotate: <><path d="M19 12a7 7 0 1 1-2.1-5" stroke={C.blue} strokeWidth="2.4" fill="none" strokeLinecap="round" /><path d="M17.5 2.8v4.5H13" stroke={C.blue} strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" /></>,
  cube: <><path d="M12 2.8 20.5 7.4v9.2L12 21.2 3.5 16.6V7.4Z" fill={C.blueL} /><path d="M12 12 20.5 7.4M12 12v9.2M12 12 3.5 7.4" stroke={C.blue} strokeWidth="1.6" /></>,
  square: <rect x="4" y="6" width="16" height="12" rx="2.5" fill={C.grayL} stroke={C.gray} strokeWidth="1.6" />,
  up: <path d="M12 19V5m-6 6 6-6 6 6" stroke={C.green} strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />,
  down: <path d="M12 5v14m-6-6 6 6 6-6" stroke={C.purple} strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />,
  link: <><rect x="2.5" y="8.5" width="10" height="7" rx="3.5" fill="none" stroke={C.purple} strokeWidth="2.4" /><rect x="11.5" y="8.5" width="10" height="7" rx="3.5" fill="none" stroke={C.purple} strokeWidth="2.4" /></>,
  plate: <><circle cx="12" cy="12" r="9.5" fill={C.blue} /><circle cx="12" cy="12" r="6" fill={C.blueL} /><circle cx="12" cy="12" r="2" fill={C.dark} /></>,
  palette: <><path d="M12 3a9 9 0 1 0 0 18c1.4 0 2-1 1.6-2.1-.5-1.3.4-2.4 1.8-2.4H18a3 3 0 0 0 3-3A9 9 0 0 0 12 3Z" fill={C.yellowL} /><circle cx="7.5" cy="11" r="1.6" fill={C.red} /><circle cx="10" cy="7" r="1.6" fill={C.blue} /><circle cx="15" cy="7.2" r="1.6" fill={C.green} /><circle cx="17.5" cy="11" r="1.4" fill={C.purple} /></>,
  gear: <><circle cx="12" cy="12" r="7.5" fill={C.gray} />{[0, 45, 90, 135].map((a) => <rect key={a} x="10.5" y="1.8" width="3" height="20.4" rx="1.2" fill={C.gray} transform={`rotate(${a} 12 12)`} />)}<circle cx="12" cy="12" r="3.2" fill={C.grayL} /></>,
  cloud: <><path d="M7 19a4.5 4.5 0 0 1-.6-9 6 6 0 0 1 11.4 1.6A3.8 3.8 0 0 1 17.5 19Z" fill={C.blueL} /><path d="M7 19a4.5 4.5 0 0 1-.6-9 6 6 0 0 1 11.4 1.6A3.8 3.8 0 0 1 17.5 19Z" fill="none" stroke={C.blue} strokeWidth="1.4" /></>,
  apple: <><path d="M12 7.5c-2-1.6-6.5-1.4-6.5 4 0 4.6 3 9 5 9 .8 0 1-.4 1.5-.4s.7.4 1.5.4c2 0 5-4.4 5-9 0-5.4-4.5-5.6-6.5-4Z" fill={C.red} /><path d="M12 7.5c0-2 1-3.6 3-4" stroke={C.green} strokeWidth="1.6" fill="none" strokeLinecap="round" /></>,
  leaf: <><path d="M5 19C5 10 10 4.5 20 4c0 9.5-5.5 15-15 15Z" fill={C.green} /><path d="M5 19 14 10" stroke={C.greenL} strokeWidth="1.6" strokeLinecap="round" /></>,
  wave: <path d="M3 9c2-2 4-2 6 0s4 2 6 0 4-2 6 0M3 15c2-2 4-2 6 0s4 2 6 0 4-2 6 0" stroke={C.blue} strokeWidth="2.2" fill="none" strokeLinecap="round" />,
  run: <><circle cx="14.5" cy="4.5" r="2.3" fill={C.skin} /><path d="m9 21 3-6 3 2.5 2 3.5M8 11l3.5-3.5 3 2.5 2.5 3M11.5 7.5l1.5 6" stroke={C.orange} strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" /></>,
  muscle: <><path d="M5 18c-1.5-3 0-7.5 3-9.5L10 4l3 1-1.5 4.2c3-1 6.5.5 7.5 3.8.8 2.8-1 5.5-4 5.5Z" fill={C.skin} /><path d="M11.5 9.2c2.5-.4 4.6 1.2 5 3.4" stroke={C.orange} strokeWidth="1.4" fill="none" strokeLinecap="round" /></>,
  bed: <><rect x="2.5" y="12" width="19" height="5" rx="1.5" fill={C.purple} /><rect x="2.5" y="8" width="7" height="4.5" rx="1.5" fill={C.purpleL} /><rect x="2.5" y="17" width="2" height="3" fill={C.dark} /><rect x="19.5" y="17" width="2" height="3" fill={C.dark} /></>,
  sparkle: <><path d="M12 2.5 13.8 10.2 21.5 12l-7.7 1.8L12 21.5l-1.8-7.7L2.5 12l7.7-1.8Z" fill={C.yellow} /></>,
  coin: <><circle cx="12" cy="12" r="9" fill={C.yellow} /><circle cx="12" cy="12" r="6.2" fill="none" stroke={C.orange} strokeWidth="1.4" /><path d="M12 8.5v7M10 10h3.2a1.4 1.4 0 0 1 0 2.8H10.8a1.4 1.4 0 0 0 0 2.7H14" stroke={C.orange} strokeWidth="1.5" fill="none" strokeLinecap="round" /></>,
  pencil: <><path d="m15.5 4.5 4 4L9 19l-5 1 1-5Z" fill={C.yellow} /><path d="m15.5 4.5 2-2 4 4-2 2Z" fill={C.red} /><path d="m4 20 1-5 4 4Z" fill={C.skin} /></>,
  info: <><circle cx="12" cy="12" r="9" fill={C.blueL} /><rect x="11" y="10.5" width="2" height="7" rx="1" fill={C.blue} /><circle cx="12" cy="7.5" r="1.3" fill={C.blue} /></>,
  bomb: <><circle cx="11" cy="14" r="6.5" fill={C.dark} /><path d="M14.5 8.5 17 6" stroke={C.gray} strokeWidth="2" strokeLinecap="round" /><path d="M17.5 3.5 18.2 5l1.5.7-1.5.7-.7 1.5-.7-1.5-1.5-.7 1.5-.7Z" fill={C.orange} /><circle cx="8.8" cy="12" r="1.3" fill={C.gray} /></>,
};
export type IconName = keyof typeof P;
export const ICON_NAMES = Object.keys(P);

export function Icon({ name, size = 20, className = '', label }: { name: string; size?: number; className?: string; label?: string }) {
  const body = P[name] ?? P.sparkle;
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={`ico ${className}`} role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true} data-icon={name}>
      {body}
    </svg>
  );
}

/** Früher gespeicherte Emoji-Symbole (z. B. bei Supplements) auf Icons abbilden */
const EMOJI_ICON: Record<string, string> = {
  '⚡': 'bolt', '☀️': 'sun', '☀': 'sun', '🌙': 'moon', '🐟': 'fish', '🛡️': 'shield', '🛡': 'shield', '🥤': 'shaker', '💊': 'pill',
  '💪': 'dumbbell', '🔥': 'flame', '🏆': 'trophy', '💧': 'drop', '⚖️': 'scale', '📷': 'camera', '📏': 'tape', '🏗️': 'brick', '🎁': 'gift',
};
export const iconFor = (emojiOrName: string | undefined, fallback = 'pill') => (emojiOrName && (P[emojiOrName] ? emojiOrName : EMOJI_ICON[emojiOrName])) || fallback;
