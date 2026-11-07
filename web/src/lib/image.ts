// Foto vom Handy für den Upload verkleinern: quadratischer Ausschnitt aus der Mitte, JPEG.
export async function toSquareJpeg(file: Blob, size = 256, quality = 0.85): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Das Bild konnte nicht verarbeitet werden.');
  ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, size, size);
  bitmap.close?.();
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Das Bild konnte nicht verarbeitet werden.'))), 'image/jpeg', quality));
}

/** Foto, das auf maximal `max` Pixel Kantenlänge verkleinert wird (für die KI-Auswertung) */
export async function toMaxJpeg(file: Blob, max = 1024, quality = 0.8): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Das Bild konnte nicht verarbeitet werden.');
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Das Bild konnte nicht verarbeitet werden.'))), 'image/jpeg', quality));
}

// ---- Ausschnitt für das Profilbild (verschieben und zoomen) --------------------------------------
export interface Crop { zoom: number; ox: number; oy: number }
/** Zoom 1 = Bild füllt das Quadrat gerade aus. ox/oy = Position der linken oberen Bildecke im Quadrat (≤ 0). */
export function clampCrop(imgW: number, imgH: number, view: number, crop: Crop): Crop {
  const zoom = Math.min(5, Math.max(1, crop.zoom));
  const scale = (view / Math.min(imgW, imgH)) * zoom;
  const minX = view - imgW * scale;
  const minY = view - imgH * scale;
  return { zoom, ox: Math.min(0, Math.max(minX, crop.ox)), oy: Math.min(0, Math.max(minY, crop.oy)) };
}
/** Startausschnitt: Bild mittig */
export const centeredCrop = (imgW: number, imgH: number, view: number, zoom = 1): Crop => {
  const scale = (view / Math.min(imgW, imgH)) * zoom;
  return clampCrop(imgW, imgH, view, { zoom, ox: (view - imgW * scale) / 2, oy: (view - imgH * scale) / 2 });
};
/** Zoom ändern und dabei den Punkt (fx, fy) im Quadrat festhalten (z. B. die Mitte oder die Finger) */
export function zoomAt(imgW: number, imgH: number, view: number, crop: Crop, zoom: number, fx = view / 2, fy = view / 2): Crop {
  const oldScale = (view / Math.min(imgW, imgH)) * crop.zoom;
  const z = Math.min(5, Math.max(1, zoom));
  const newScale = (view / Math.min(imgW, imgH)) * z;
  const ix = (fx - crop.ox) / oldScale;
  const iy = (fy - crop.oy) / oldScale;
  return clampCrop(imgW, imgH, view, { zoom: z, ox: fx - ix * newScale, oy: fy - iy * newScale });
}
/** Zeichnet den sichtbaren Ausschnitt auf eine Zeichenfläche (Vorschau und Ergebnis nutzen dasselbe) */
export function drawCrop(ctx: CanvasRenderingContext2D, bitmap: ImageBitmap, view: number, crop: Crop, out: number) {
  const k = out / view;
  const scale = (view / Math.min(bitmap.width, bitmap.height)) * crop.zoom;
  ctx.clearRect(0, 0, out, out);
  ctx.drawImage(bitmap, crop.ox * k, crop.oy * k, bitmap.width * scale * k, bitmap.height * scale * k);
}
export async function cropToJpeg(bitmap: ImageBitmap, view: number, crop: Crop, size = 256, quality = 0.85): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Das Bild konnte nicht verarbeitet werden.');
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, size, size);
  drawCrop(ctx, bitmap, view, crop, size);
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Das Bild konnte nicht verarbeitet werden.'))), 'image/jpeg', quality));
}
export const loadBitmap = (file: Blob) => createImageBitmap(file, { imageOrientation: 'from-image' });
