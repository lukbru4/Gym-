// Aufnahmedatum eines Fotos: aus den EXIF-Daten (JPEG), sonst Änderungsdatum der Datei, sonst heute.
import type { ISODate } from './types';

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** „2025:05:17 08:30:00“ aus den EXIF-Daten eines JPEG lesen (DateTimeOriginal, sonst DateTime) */
export function exifDate(buf: ArrayBuffer): ISODate | null {
  const v = new DataView(buf);
  if (v.byteLength < 4 || v.getUint16(0) !== 0xffd8) return null;
  let off = 2;
  while (off + 4 <= v.byteLength) {
    if (v.getUint8(off) !== 0xff) return null;
    const marker = v.getUint8(off + 1), len = v.getUint16(off + 2);
    if (marker === 0xda || marker === 0xd9) return null; // Bilddaten beginnen – kein EXIF
    if (marker === 0xe1 && off + 10 <= v.byteLength && v.getUint32(off + 4) === 0x45786966 /* Exif */) return readTiff(v, off + 10, Math.min(v.byteLength, off + 2 + len));
    off += 2 + len;
  }
  return null;
}
function readTiff(v: DataView, start: number, end: number): ISODate | null {
  if (start + 8 > end) return null;
  const le = v.getUint16(start) === 0x4949;
  const u16 = (o: number) => v.getUint16(start + o, le), u32 = (o: number) => v.getUint32(start + o, le);
  const ascii = (o: number, n: number) => { let s = ''; for (let i = 0; i < n && start + o + i < end; i++) { const c = v.getUint8(start + o + i); if (!c) break; s += String.fromCharCode(c); } return s; };
  const tags = (ifd: number) => {
    const out = new Map<number, number>();
    if (ifd <= 0 || start + ifd + 2 > end) return out;
    const n = u16(ifd);
    for (let i = 0; i < n && start + ifd + 2 + i * 12 + 12 <= end; i++) {
      const e = ifd + 2 + i * 12;
      out.set(u16(e), e);
    }
    return out;
  };
  const dateAt = (entry: number | undefined) => (entry === undefined ? null : ascii(u32(entry + 8), 19));
  const ifd0 = tags(u32(4));
  const exifPtr = ifd0.get(0x8769);
  const exif = exifPtr !== undefined ? tags(u32(exifPtr + 8)) : new Map<number, number>();
  const raw = dateAt(exif.get(0x9003)) ?? dateAt(exif.get(0x9004)) ?? dateAt(ifd0.get(0x0132));
  const m = raw?.match(/^(\d{4}):(\d{2}):(\d{2})/);
  if (!m || m[1] === '0000') return null;
  return `${m[1]}-${m[2]}-${m[3]}`;
}

/** Aufnahmedatum für ein ausgewähltes Foto (nie in der Zukunft) */
export async function photoDate(file: Blob & { lastModified?: number }, now = new Date()): Promise<ISODate> {
  const today = iso(now);
  let d: ISODate | null = null;
  try {
    d = exifDate(await file.slice(0, 128 * 1024).arrayBuffer());
  } catch {
    d = null;
  }
  if (!d && file.lastModified) d = iso(new Date(file.lastModified));
  return !d || d > today || d < '2000-01-01' ? today : d;
}
