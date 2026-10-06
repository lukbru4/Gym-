// Shop-Katalog. Preise und IDs müssen zu public.shop_items in supabase/schema.sql passen
// (der Server prüft jeden Kauf; tests/shop.test.ts vergleicht beide Listen).
import { useSyncExternalStore } from 'react';
import { registerCustomSchemes, validPalette, type CustomPalette } from './theme';

export type ShopKind = 'skin' | 'scheme' | 'accessory' | 'title';

export interface ShopItem {
  id: string;
  kind: ShopKind;
  name: string;
  price: number;
  /** Farbe für Vorschau (Skins, Schemata) */
  color?: string;
  /** Farbschemata: Vorschau-Farben [Hintergrund, Karte, Akzent, Schrift auf Akzent] für hell und dunkel */
  palette?: { light: [string, string, string, string]; dark: [string, string, string, string] };
  /** Vom Admin entworfenes Farbschema (kommt vom Server) */
  custom?: CustomPalette;
  description: string;
}

export const SHOP_ITEMS: ShopItem[] = [
  { id: 'skin_lava', kind: 'skin', name: 'Lava', price: 300, color: '#ff5a1f', description: 'Körpergraph und Avatar glühen rot-orange.' },
  { id: 'skin_eis', kind: 'skin', name: 'Eis', price: 300, color: '#6fd8ff', description: 'Kühles Eisblau für Körpergraph und Avatar.' },
  { id: 'skin_pink', kind: 'skin', name: 'Neon-Pink', price: 300, color: '#ff4fd8', description: 'Knalliges Pink für Körpergraph und Avatar.' },
  { id: 'skin_matrix', kind: 'skin', name: 'Matrix', price: 450, color: '#00ff66', description: 'Grelles Terminal-Grün.' },
  { id: 'skin_gold', kind: 'skin', name: 'Gold', price: 600, color: '#ffcc33', description: 'Goldener Körpergraph für Champions.' },
  // Farbschemata (gelten für die ganze App; Vorschau mit dem Auge vor dem Kauf)
  { id: 'scheme_energie', kind: 'scheme', name: 'Neon-Grün', price: 300, color: '#b4f000', description: 'Schwarz mit Neon-Grün – der Energie-Look.', palette: { light: ['#f5f5f0', '#ffffff', '#3f7a00', '#ffffff'], dark: ['#0a0a0a', '#161616', '#b4f000', '#0a0a0a'] } },
  { id: 'scheme_ozean', kind: 'scheme', name: 'Ozean', price: 300, color: '#22c3c3', description: 'Petrol und Türkis wie das Meer.', palette: { light: ['#f1f6f8', '#ffffff', '#0c7f86', '#ffffff'], dark: ['#0b1418', '#13222a', '#22c3c3', '#062326'] } },
  { id: 'scheme_violett', kind: 'scheme', name: 'Nacht-Violett', price: 300, color: '#3b9cf2', description: 'Dunkles Violett mit blauen Akzenten.', palette: { light: ['#f3f2f8', '#ffffff', '#1f7fe0', '#ffffff'], dark: ['#0e0c19', '#1c1a29', '#3b9cf2', '#ffffff'] } },
  { id: 'scheme_glut', kind: 'scheme', name: 'Glut', price: 300, color: '#ff6b2c', description: 'Warmes Orange wie Feuer.', palette: { light: ['#fbf5f1', '#ffffff', '#d9480f', '#ffffff'], dark: ['#140d0a', '#221612', '#ff6b2c', '#ffffff'] } },
  { id: 'scheme_kirsche', kind: 'scheme', name: 'Kirschblüte', price: 400, color: '#ff6fae', description: 'Zartes Rosa, kräftiges Pink.', palette: { light: ['#fbf3f6', '#ffffff', '#c2185b', '#ffffff'], dark: ['#0f070b', '#1b0f15', '#ff6fae', '#1b0710'] } },
  { id: 'scheme_wald', kind: 'scheme', name: 'Wald', price: 400, color: '#5fd068', description: 'Sattes Grün, ruhig und frisch.', palette: { light: ['#f2f6f1', '#ffffff', '#2e7d32', '#ffffff'], dark: ['#08100a', '#111c13', '#5fd068', '#06120a'] } },
  { id: 'scheme_mitternacht', kind: 'scheme', name: 'Mitternacht', price: 400, color: '#7c8cff', description: 'Tiefes Nachtblau mit Lavendel.', palette: { light: ['#f1f3fa', '#ffffff', '#3949ab', '#ffffff'], dark: ['#05071a', '#0d1130', '#7c8cff', '#05071a'] } },
  { id: 'scheme_sunset', kind: 'scheme', name: 'Sonnenuntergang', price: 450, color: '#ff7a45', description: 'Orange und Lila wie am Abendhimmel.', palette: { light: ['#fff5ef', '#ffffff', '#c2410c', '#ffffff'], dark: ['#120806', '#1e0f0b', '#ff7a45', '#1a0905'] } },
  { id: 'scheme_mono', kind: 'scheme', name: 'Schwarz-Weiß', price: 450, color: '#f5f5f5', description: 'Puristisch, ganz ohne Farbe.', palette: { light: ['#f4f4f4', '#ffffff', '#111111', '#ffffff'], dark: ['#000000', '#111111', '#f5f5f5', '#000000'] } },
  { id: 'scheme_gold', kind: 'scheme', name: 'Schwarz-Gold', price: 500, color: '#e0b43a', description: 'Schwarz mit Gold – für Champions.', palette: { light: ['#f7f4ec', '#ffffff', '#9a6b00', '#ffffff'], dark: ['#0b0a08', '#17150f', '#e6b93e', '#0b0a08'] } },
  { id: 'scheme_eis', kind: 'scheme', name: 'Eisblau', price: 500, color: '#3aa7e0', description: 'Kühles Blau, klar wie Eis.', palette: { light: ['#f0f6fb', '#ffffff', '#1668a8', '#ffffff'], dark: ['#070d14', '#0f1a26', '#5cc8ff', '#06121c'] } },
  { id: 'title_early', kind: 'title', name: 'Frühaufsteher', price: 150, description: 'Titel unter deinem Namen.' },
  { id: 'title_iron', kind: 'title', name: 'Eisenfresser', price: 200, description: 'Titel unter deinem Namen.' },
  { id: 'title_reps', kind: 'title', name: 'Rep-Maschine', price: 200, description: 'Titel unter deinem Namen.' },
  { id: 'title_beast', kind: 'title', name: 'Beast Mode', price: 400, description: 'Titel unter deinem Namen.' },
  { id: 'title_legend', kind: 'title', name: 'Gym-Legende', price: 1000, description: 'Der seltenste Titel.' },
];

export const SHOP_SECTIONS: [ShopKind, string][] = [
  ['scheme', 'Farbschemata'],
  ['skin', 'Körpergraph-Looks'],
  ['title', 'Titel'],
];

// Vom Admin entworfene Farbschemata kommen zusätzlich vom Server (shop_catalog)
let serverItems: ShopItem[] = [];
const listeners = new Set<() => void>();
export function setServerCatalog(rows: { id: string; kind: string; name: string; price: number; palette: unknown }[]) {
  serverItems = rows
    .filter((r) => r.kind === 'scheme' && r.id.startsWith('scheme_c_') && validPalette(r.palette))
    .map((r) => {
      const p = r.palette as CustomPalette;
      return {
        id: r.id, kind: 'scheme' as const, name: r.name, price: Number(r.price) || 0, color: p.dark.accent, custom: p,
        description: 'Exklusives Farbschema.',
        palette: { light: [p.light.bg, p.light.surface, p.light.accent, '#ffffff'], dark: [p.dark.bg, p.dark.surface, p.dark.accent, '#000000'] },
      } satisfies ShopItem;
    });
  registerCustomSchemes(serverItems.map((i) => ({ id: i.id, name: i.name, palette: i.custom! })));
  listeners.forEach((l) => l());
}
const getAll = () => allItems;
let allItems: ShopItem[] = SHOP_ITEMS;
listeners.add(() => (allItems = [...SHOP_ITEMS, ...serverItems]));
export const useShopItems = () => useSyncExternalStore((cb) => (listeners.add(cb), () => void listeners.delete(cb)), getAll);

export const itemById = (id: string | null | undefined) => allItems.find((i) => i.id === id);

/** Was ein Profil gerade trägt (vom Server, für Freunde sichtbar) */
export interface Equipped { skin?: string; accessory?: string; title?: string }
