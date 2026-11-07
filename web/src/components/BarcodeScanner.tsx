// Barcode mit der Kamera scannen (läuft im Browser und in der installierten App; die Bibliothek wird erst beim Öffnen geladen).
import { useEffect, useRef, useState } from 'react';

export function BarcodeScanner({ onCode, onClose }: { onCode: (code: string) => void; onClose: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let stop: (() => void) | null = null;
    let cancelled = false;
    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('Die Kamera ist hier nicht verfügbar.');
        const { BrowserMultiFormatReader } = await import('@zxing/browser');
        const { BarcodeFormat, DecodeHintType } = await import('@zxing/library');
        const hints = new Map();
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E]);
        const reader = new BrowserMultiFormatReader(hints);
        const controls = await reader.decodeFromConstraints({ video: { facingMode: { ideal: 'environment' } } }, video.current!, (result) => {
          if (result && !cancelled) {
            cancelled = true;
            controls.stop();
            onCode(result.getText());
          }
        });
        if (cancelled) controls.stop();
        else stop = () => controls.stop();
      } catch (err) {
        const name = (err as { name?: string })?.name;
        const known: Record<string, string> = {
          NotAllowedError: 'Kein Zugriff auf die Kamera. Erlaube sie in den Einstellungen deines Geräts oder tippe die Nummer ein.',
          NotFoundError: 'Keine Kamera gefunden. Tippe die Nummer unter dem Barcode ein.',
          NotReadableError: 'Die Kamera wird gerade von etwas anderem benutzt.',
        };
        const own = (err as Error).message?.startsWith('Die Kamera') ? (err as Error).message : null;
        setError((name && known[name]) || own || 'Die Kamera konnte nicht gestartet werden. Tippe die Nummer ein.');
      }
    })();
    return () => {
      cancelled = true;
      stop?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="scanner">
      <video ref={video} muted playsInline />
      <div className="scanner-frame" aria-hidden="true" />
      {error ? <p className="notice">{error}</p> : <p className="muted small center">Halte den Barcode ins Feld.</p>}
      <button type="button" className="btn block" id="scan-close" onClick={onClose}>Abbrechen</button>
    </div>
  );
}
