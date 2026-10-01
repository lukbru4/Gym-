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
  description: string;
}

export const SHOP_ITEMS: ShopItem[] = [
  { id: 'skin_lava', kind: 'skin', name: 'Lava', price: 300, color: '#ff5a1f', description: 'Körpergraph und Avatar glühen rot-orange.' },
  { id: 'skin_eis', kind: 'skin', name: 'Eis', price: 300, color: '#6fd8ff', description: 'Kühles Eisblau für Körpergraph und Avatar.' },
  { id: 'skin_pink', kind: 'skin', name: 'Neon-Pink', price: 300, color: '#ff4fd8', description: 'Knalliges Pink für Körpergraph und Avatar.' },
  { id: 'skin_matrix', kind: 'skin', name: 'Matrix', price: 450, color: '#00ff66', description: 'Grelles Terminal-Grün.' },
  { id: 'skin_gold', kind: 'skin', name: 'Gold', price: 600, color: '#ffcc33', description: 'Goldener Körpergraph für Champions.' },
  { id: 'scheme_gold', kind: 'scheme', name: 'Schwarz-Gold', price: 500, color: '#e0b43a', description: 'Farbschema für die ganze App: Schwarz mit Gold.' },
  { id: 'scheme_eis', kind: 'scheme', name: 'Eisblau', price: 500, color: '#3aa7e0', description: 'Farbschema für die ganze App: kühles Blau.' },
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
  ['skin', 'Körpergraph-Looks'],
  ['accessory', 'Avatar'],
  ['title', 'Titel'],
  ['scheme', 'Farbschemata'],
];

export const itemById = (id: string | null | undefined) => SHOP_ITEMS.find((i) => i.id === id);

/** Was ein Profil gerade trägt (vom Server, für Freunde sichtbar) */
export interface Equipped { skin?: string; accessory?: string; title?: string }
