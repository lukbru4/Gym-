// Shop-Katalog. Preise und IDs müssen zu public.shop_items in supabase/schema.sql passen
// (der Server prüft jeden Kauf; tests/shop.test.ts vergleicht beide Listen).
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
  description: string;
}

export const SHOP_ITEMS: ShopItem[] = [
  { id: 'skin_lava', kind: 'skin', name: 'Lava', price: 300, color: '#ff5a1f', description: 'Körpergraph und Avatar glühen rot-orange.' },
  { id: 'skin_eis', kind: 'skin', name: 'Eis', price: 300, color: '#6fd8ff', description: 'Kühles Eisblau für Körpergraph und Avatar.' },
  { id: 'skin_pink', kind: 'skin', name: 'Neon-Pink', price: 300, color: '#ff4fd8', description: 'Knalliges Pink für Körpergraph und Avatar.' },
  { id: 'skin_matrix', kind: 'skin', name: 'Matrix', price: 450, color: '#00ff66', description: 'Grelles Terminal-Grün.' },
  { id: 'skin_gold', kind: 'skin', name: 'Gold', price: 600, color: '#ffcc33', description: 'Goldener Körpergraph für Champions.' },
  // Farbschemata (gelten für die ganze App; Vorschau mit dem Auge vor dem Kauf)
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
  { id: 'acc_band', kind: 'accessory', name: 'Stirnband', price: 150, description: 'Stirnband für deinen Avatar.' },
  { id: 'acc_shades', kind: 'accessory', name: 'Sonnenbrille', price: 250, description: 'Cool bleiben beim Training.' },
  { id: 'acc_cap', kind: 'accessory', name: 'Cap', price: 200, description: 'Kappe für deinen Avatar.' },
  { id: 'acc_chain', kind: 'accessory', name: 'Goldkette', price: 400, description: 'Ein bisschen Bling.' },
  { id: 'acc_crown', kind: 'accessory', name: 'Krone', price: 800, description: 'Für die Nummer 1 im Gym.' },
  { id: 'title_early', kind: 'title', name: 'Frühaufsteher', price: 150, description: 'Titel unter deinem Namen.' },
  { id: 'title_iron', kind: 'title', name: 'Eisenfresser', price: 200, description: 'Titel unter deinem Namen.' },
  { id: 'title_reps', kind: 'title', name: 'Rep-Maschine', price: 200, description: 'Titel unter deinem Namen.' },
  { id: 'title_beast', kind: 'title', name: 'Beast Mode', price: 400, description: 'Titel unter deinem Namen.' },
  { id: 'title_legend', kind: 'title', name: 'Gym-Legende', price: 1000, description: 'Der seltenste Titel.' },
];

export const SHOP_SECTIONS: [ShopKind, string][] = [
  ['scheme', 'Farbschemata'],
  ['skin', 'Körpergraph-Looks'],
  ['accessory', 'Avatar'],
  ['title', 'Titel'],
];

export const itemById = (id: string | null | undefined) => SHOP_ITEMS.find((i) => i.id === id);

/** Was ein Profil gerade trägt (vom Server, für Freunde sichtbar) */
export interface Equipped { skin?: string; accessory?: string; title?: string }
