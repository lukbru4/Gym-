// Profilbild zurechtrücken: Bild mit dem Finger verschieben, mit zwei Fingern oder dem Regler zoomen, dann übernehmen.
import { useEffect, useRef, useState } from 'react';
import { centeredCrop, clampCrop, cropToJpeg, drawCrop, loadBitmap, zoomAt, type Crop } from '../lib/image';

const VIEW = 260; // Kantenlänge der Vorschau in px

export function AvatarCropper({ file, onCancel, onDone }: { file: File; onCancel: () => void; onDone: (jpeg: Blob) => void | Promise<void> }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [bitmap, setBitmap] = useState<ImageBitmap | null>(null);
  const [crop, setCrop] = useState<Crop>({ zoom: 1, ox: 0, oy: 0 });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const last = useRef<{ x: number; y: number; dist: number } | null>(null);

  useEffect(() => {
    let alive = true;
    loadBitmap(file).then(
      (b) => {
        if (!alive) return;
        setBitmap(b);
        setCrop(centeredCrop(b.width, b.height, VIEW));
      },
      () => alive && setError('Dieses Bild kann nicht gelesen werden. Versuche ein anderes.'),
    );
    return () => {
      alive = false;
    };
  }, [file]);
  useEffect(() => {
    const ctx = canvas.current?.getContext('2d');
    if (ctx && bitmap) {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, VIEW, VIEW);
      drawCrop(ctx, bitmap, VIEW, crop, VIEW);
    }
  }, [bitmap, crop]);

  const pos = (e: React.PointerEvent) => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const onDown = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, pos(e));
    last.current = null;
  };
  const onMove = (e: React.PointerEvent) => {
    if (!bitmap || !pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, pos(e));
    const pts = [...pointers.current.values()];
    if (pts.length >= 2) {
      const [a, b] = pts;
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      if (last.current && last.current.dist > 0)
        setCrop((c) => {
          const zoomed = zoomAt(bitmap.width, bitmap.height, VIEW, c, c.zoom * (dist / last.current!.dist), mid.x, mid.y);
          return clampCrop(bitmap.width, bitmap.height, VIEW, { ...zoomed, ox: zoomed.ox + (mid.x - last.current!.x), oy: zoomed.oy + (mid.y - last.current!.y) });
        });
      last.current = { ...mid, dist };
    } else {
      const p = pts[0];
      if (last.current) {
        const dx = p.x - last.current.x;
        const dy = p.y - last.current.y;
        setCrop((c) => clampCrop(bitmap.width, bitmap.height, VIEW, { ...c, ox: c.ox + dx, oy: c.oy + dy }));
      }
      last.current = { ...p, dist: 0 };
    }
  };
  const onUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    last.current = null;
  };
  const zoomTo = (z: number) => bitmap && setCrop((c) => zoomAt(bitmap.width, bitmap.height, VIEW, c, z));

  const accept = async () => {
    if (!bitmap) return;
    setBusy(true);
    try {
      await onDone(await cropToJpeg(bitmap, VIEW, crop));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="dialog-backdrop">
      <div className="dialog avatar-crop" id="avatar-crop" role="dialog" aria-modal="true" aria-label="Profilbild zurechtrücken">
        <div className="picker-title">Profilbild zurechtrücken</div>
        {error ? (
          <p className="notice">{error}</p>
        ) : (
          <>
            <div className="crop-view" style={{ width: VIEW, height: VIEW }} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
              onWheel={(e) => bitmap && setCrop((c) => zoomAt(bitmap.width, bitmap.height, VIEW, c, c.zoom * (e.deltaY < 0 ? 1.08 : 1 / 1.08)))}>
              <canvas ref={canvas} width={VIEW} height={VIEW} id="crop-canvas" />
              <div className="crop-mask" aria-hidden="true" />
            </div>
            <p className="muted small center">Mit dem Finger verschieben, mit zwei Fingern oder dem Regler vergrößern.</p>
            <input type="range" id="crop-zoom" min="1" max="5" step="0.05" value={crop.zoom} aria-label="Vergrößern" onChange={(e) => zoomTo(Number(e.target.value))} />
          </>
        )}
        <div className="dialog-actions">
          <button type="button" className="btn" id="crop-cancel" onClick={onCancel}>Abbrechen</button>
          <button type="button" className="btn primary" id="crop-ok" disabled={!bitmap || busy} onClick={accept}>Übernehmen</button>
        </div>
      </div>
    </div>
  );
}
