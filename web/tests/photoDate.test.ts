import { describe, expect, test } from 'vitest';
import { exifDate, photoDate } from '../src/lib/photoDate';

/** Minimales JPEG mit EXIF: SOI, APP1(Exif, TIFF little/big endian, IFD0 → ExifIFD → DateTimeOriginal), SOS */
export function jpegWithExif(date: string, le = true): Uint8Array<ArrayBuffer> {
  const tiff: number[] = [];
  const u16 = (v: number) => (le ? [v & 255, v >> 8] : [v >> 8, v & 255]);
  const u32 = (v: number) => (le ? [v & 255, (v >> 8) & 255, (v >> 16) & 255, v >>> 24] : [v >>> 24, (v >> 16) & 255, (v >> 8) & 255, v & 255]);
  tiff.push(...(le ? [0x49, 0x49] : [0x4d, 0x4d]), ...u16(42), ...u32(8));
  // IFD0 bei 8: 1 Eintrag (0x8769 → ExifIFD bei 26), next 0
  tiff.push(...u16(1), ...u16(0x8769), ...u16(4), ...u32(1), ...u32(26), ...u32(0));
  // ExifIFD bei 26: 1 Eintrag (0x9003 ASCII 20 Byte bei 44)
  tiff.push(...u16(1), ...u16(0x9003), ...u16(2), ...u32(20), ...u32(44), ...u32(0));
  for (const c of `${date} 08:30:00`) tiff.push(c.charCodeAt(0));
  tiff.push(0);
  const app1 = [0x45, 0x78, 0x69, 0x66, 0, 0, ...tiff];
  const len = app1.length + 2;
  return new Uint8Array([0xff, 0xd8, 0xff, 0xe1, len >> 8, len & 255, ...app1, 0xff, 0xda, 0, 2]);
}

describe('Aufnahmedatum von Galerie-Fotos', () => {
  const now = new Date(2026, 10, 3, 12);
  test('EXIF DateTimeOriginal (Intel und Motorola Byte-Reihenfolge)', () => {
    expect(exifDate(jpegWithExif('2025:05:17').buffer as ArrayBuffer)).toBe('2025-05-17');
    expect(exifDate(jpegWithExif('2024:12:31', false).buffer as ArrayBuffer)).toBe('2024-12-31');
    expect(exifDate(new Uint8Array([0x89, 0x50, 0x4e, 0x47]).buffer)).toBeNull();
    expect(exifDate(new Uint8Array([0xff, 0xd8, 0xff, 0xda, 0, 2]).buffer)).toBeNull();
  });
  test('Datei: EXIF, sonst Änderungsdatum, nie in der Zukunft', async () => {
    expect(await photoDate(new File([jpegWithExif('2025:05:17')], 'a.jpg', { type: 'image/jpeg', lastModified: now.getTime() }), now)).toBe('2025-05-17');
    expect(await photoDate(new File([new Uint8Array([1, 2, 3])], 'b.png', { lastModified: new Date(2026, 8, 4, 12).getTime() }), now)).toBe('2026-09-04');
    expect(await photoDate(new File([new Uint8Array([1])], 'c.png', { lastModified: new Date(2027, 0, 1).getTime() }), now)).toBe('2026-11-03');
    expect(await photoDate(new File([jpegWithExif('2031:01:01')], 'd.jpg', { lastModified: now.getTime() }), now)).toBe('2026-11-03');
  });
});
