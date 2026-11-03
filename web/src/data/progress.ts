// Körpermaße und Fortschritts-Fotos – mit Konto in Supabase (Fotos im privaten Speicher), ohne Konto auf dem Gerät.
import type { SupabaseClient } from '@supabase/supabase-js';
import { cleanMeasure, MAX_PHOTOS, type Measure, type MeasureValues, type Pose, type ProgressPhoto } from '../lib/measures';
import type { ISODate } from '../lib/types';

export interface FriendPhoto extends ProgressPhoto { url: string }
export interface Progress {
  /** Fotos dürfen mit Freunden geteilt werden (nur mit Konto) */
  canShare: boolean;
  listMeasures(): Promise<Measure[]>;
  saveMeasure(date: ISODate, values: MeasureValues): Promise<void>;
  deleteMeasure(id: number): Promise<void>;
  listPhotos(): Promise<ProgressPhoto[]>;
  addPhoto(blob: Blob, date: ISODate, pose: Pose, shared: boolean): Promise<void>;
  setShared(id: string, shared: boolean): Promise<void>;
  deletePhoto(id: string): Promise<void>;
  /** Anzeige-Adressen der eigenen Fotos */
  photoUrls(ids: string[]): Promise<Record<string, string>>;
  /** Alle eigenen Fotos löschen (vor dem Konto-Löschen) */
  deleteAllPhotos(): Promise<void>;
  friendPhotos?(userId: string): Promise<FriendPhoto[]>;
  reportPhoto?(id: string, reason: string): Promise<void>;
}

// ---------------------------------------------------------------------------------------------
// Ohne Konto: Maße in den Gerätedaten (über get/set), Fotos in IndexedDB
// ---------------------------------------------------------------------------------------------
const DB = 'gym-tracker-photos', STORE = 'photos';
interface StoredPhoto extends ProgressPhoto { blob: Blob; created?: number }
function idb<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('Fotos können in diesem Browser nicht gespeichert werden.'));
    const open = indexedDB.open(DB, 1);
    open.onupgradeneeded = () => { open.result.createObjectStore(STORE, { keyPath: 'id' }); };
    open.onerror = () => reject(open.error ?? new Error('Fotospeicher nicht verfügbar.'));
    open.onsuccess = () => {
      const tx = open.result.transaction(STORE, mode);
      const req = fn(tx.objectStore(STORE));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => open.result.close();
    };
  });
}
const urlCache = new Map<string, string>();
const uuid = () => (globalThis.crypto?.randomUUID?.() ?? `p${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`);

export function localProgress(get: () => Measure[], set: (list: Measure[]) => void, nextId: () => number): Progress {
  const all = () => idb<StoredPhoto[]>('readonly', (s) => s.getAll() as IDBRequest<StoredPhoto[]>);
  return {
    canShare: false,
    listMeasures: async () => get().map((m) => ({ ...m })).sort((a, b) => a.date.localeCompare(b.date)),
    async saveMeasure(date, values) {
      const v = cleanMeasure(values as Record<string, unknown>);
      const list = get().filter((m) => m.date !== date);
      set([...list, { id: get().find((m) => m.date === date)?.id ?? nextId(), date, ...v }]);
    },
    async deleteMeasure(id) { set(get().filter((m) => m.id !== id)); },
    listPhotos: async () => (await all()).sort((a, b) => a.date.localeCompare(b.date) || (a.created ?? 0) - (b.created ?? 0)).map(({ blob: _b, created: _c, ...p }) => p),
    async addPhoto(blob, date, pose) {
      if ((await all()).length >= MAX_PHOTOS) throw new Error(`Höchstens ${MAX_PHOTOS} Fotos – lösch ältere, um neue hinzuzufügen.`);
      await idb('readwrite', (s) => s.put({ id: uuid(), date, pose, shared: false, blob, created: Date.now() } satisfies StoredPhoto));
    },
    async setShared() { /* ohne Konto gibt es keine Freunde */ },
    async deletePhoto(id) {
      await idb('readwrite', (s) => s.delete(id));
      const u = urlCache.get(id); if (u) { URL.revokeObjectURL(u); urlCache.delete(id); }
    },
    async photoUrls(ids) {
      const out: Record<string, string> = {};
      const want = new Set(ids);
      for (const p of await all()) {
        if (!want.has(p.id)) continue;
        if (!urlCache.has(p.id)) urlCache.set(p.id, URL.createObjectURL(p.blob));
        out[p.id] = urlCache.get(p.id)!;
      }
      return out;
    },
    async deleteAllPhotos() { await idb('readwrite', (s) => s.clear()); },
  };
}

// ---------------------------------------------------------------------------------------------
// Mit Konto: Tabellen body_measures/progress_photos, Bilder im privaten Speicher progress-photos
// ---------------------------------------------------------------------------------------------
const BUCKET = 'progress-photos';
const COLS = 'id, date, chest, waist, hips, arm, thigh, calf, neck, bodyfat';
export function cloudProgress(supabase: SupabaseClient): Progress {
  const check = <T,>({ data, error }: { data: T | null; error: unknown }): T => { if (error) throw error; return data as T; };
  const uid = async () => {
    const id = (await supabase.auth.getSession()).data.session?.user.id;
    if (!id) throw new Error('Bitte melde dich erneut an.');
    return id;
  };
  const num = (v: unknown) => (v === null || v === undefined ? undefined : Number(v));
  const signed = async (paths: string[]) => {
    if (!paths.length) return [] as { path: string | null; signedUrl: string }[];
    return check(await supabase.storage.from(BUCKET).createSignedUrls(paths, 3600)) as { path: string | null; signedUrl: string }[];
  };
  return {
    canShare: true,
    async listMeasures() {
      const rows = check(await supabase.from('body_measures').select(COLS).order('date')) as Record<string, unknown>[];
      return rows.map((r) => ({ id: Number(r.id), date: String(r.date), chest: num(r.chest), waist: num(r.waist), hips: num(r.hips), arm: num(r.arm), thigh: num(r.thigh), calf: num(r.calf), neck: num(r.neck), bodyfat: num(r.bodyfat) }));
    },
    async saveMeasure(date, values) {
      const v = cleanMeasure(values as Record<string, unknown>);
      const row = { user_id: await uid(), date, chest: null, waist: null, hips: null, arm: null, thigh: null, calf: null, neck: null, bodyfat: null, ...v };
      check(await supabase.from('body_measures').upsert(row, { onConflict: 'user_id,date' }));
    },
    async deleteMeasure(id) { check(await supabase.from('body_measures').delete().eq('id', id)); },
    async listPhotos() {
      return check(await supabase.from('progress_photos').select('id, date, pose, shared').eq('user_id', await uid()).order('date').order('created_at')) as ProgressPhoto[];
    },
    async addPhoto(blob, date, pose, shared) {
      const me = await uid();
      const id = check(await supabase.rpc('add_progress_photo', { p_date: date, p_pose: pose, p_shared: shared })) as string;
      const { error } = await supabase.storage.from(BUCKET).upload(`${me}/${id}.jpg`, blob, { contentType: 'image/jpeg', cacheControl: '3600' });
      if (error) {
        await supabase.rpc('delete_progress_photo', { p_id: id });
        throw error;
      }
    },
    async setShared(id, shared) { check(await supabase.rpc('set_photo_shared', { p_id: id, p_shared: shared })); },
    async deletePhoto(id) {
      const me = await uid();
      await supabase.storage.from(BUCKET).remove([`${me}/${id}.jpg`]);
      check(await supabase.rpc('delete_progress_photo', { p_id: id }));
    },
    async photoUrls(ids) {
      const me = await uid();
      const out: Record<string, string> = {};
      for (const r of await signed(ids.map((id) => `${me}/${id}.jpg`))) if (r.path && r.signedUrl) out[r.path.split('/')[1].replace('.jpg', '')] = r.signedUrl;
      return out;
    },
    async deleteAllPhotos() {
      const me = await uid();
      const list = check(await supabase.from('progress_photos').select('id').eq('user_id', me)) as { id: string }[];
      if (list.length) await supabase.storage.from(BUCKET).remove(list.map((p) => `${me}/${p.id}.jpg`));
      for (const p of list) await supabase.rpc('delete_progress_photo', { p_id: p.id });
    },
    async friendPhotos(userId) {
      const rows = check(await supabase.rpc('friend_photos', { p_user: userId })) as ProgressPhoto[];
      const urls = await signed(rows.map((p) => `${userId}/${p.id}.jpg`));
      const byId = new Map(urls.filter((u) => u.path && u.signedUrl).map((u) => [u.path!.split('/')[1].replace('.jpg', ''), u.signedUrl]));
      return rows.filter((p) => byId.has(p.id)).map((p) => ({ ...p, url: byId.get(p.id)! }));
    },
    async reportPhoto(id, reason) { check(await supabase.rpc('report_photo', { p_id: id, p_reason: reason })); },
  };
}
