// Zeigt das Übungsfoto (Start-/Endstellung im Wechsel, wie ein kurzes Video), wenn es eins gibt; sonst nichts.
import { useEffect, useState } from 'react';
import { mediaSlug, mediaSlugs, mediaUrl } from '../lib/exerciseMedia';

export function useHasMedia(name: string): boolean {
  const [has, setHas] = useState(false);
  useEffect(() => {
    let alive = true;
    void mediaSlugs().then((s) => alive && setHas(s.has(mediaSlug(name))));
    return () => { alive = false; };
  }, [name]);
  return has;
}

export function ExerciseMedia({ name, height = 260, className = '' }: { name: string; height?: number; className?: string }) {
  const has = useHasMedia(name);
  const [frame, setFrame] = useState<0 | 1>(0);
  useEffect(() => {
    if (!has) return;
    const t = window.setInterval(() => setFrame((f) => (f === 0 ? 1 : 0)), 900);
    return () => window.clearInterval(t);
  }, [has]);
  if (!has) return null;
  return (
    <div className={`ex-media ${className}`} style={{ height }} data-media={mediaSlug(name)}>
      <img src={mediaUrl(name, 0)} alt={`Startstellung: ${name}`} className={frame === 0 ? 'on' : ''} loading="lazy" />
      <img src={mediaUrl(name, 1)} alt={`Endstellung: ${name}`} className={frame === 1 ? 'on' : ''} loading="lazy" />
    </div>
  );
}
