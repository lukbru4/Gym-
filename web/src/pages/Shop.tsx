// Shop: Guthaben, Artikel nach Bereichen, kaufen (Server prüft) und ausrüsten.
import { useState, useSyncExternalStore } from 'react';
import { useApp } from '../app/context';
import { useGame } from '../app/gameContext';
import { Avatar } from '../components/Avatar';
import { LoadError, Loading } from '../components/Bits';
import { Coin } from '../components/Icons';
import { getCosmetics, setCosmetics, useCosmetics } from '../lib/cosmetics';
import { fmt } from '../lib/format';
import { SHOP_SECTIONS, useShopItems, type ShopItem } from '../lib/shop';
import { PREMIUM_SCHEMES, getPreviewScheme, getScheme, setPreviewScheme, setScheme, subscribePreview, type SchemeChoice } from '../lib/theme';
import { ask } from '../components/Dialog';

/** Shop-Artikel → Farbschema (fest eingebaut oder vom Admin entworfen) */
const schemeOf = (itemId: string): SchemeChoice | null =>
  itemId.startsWith('scheme_c_') ? `custom:${itemId}` : ((Object.entries(PREMIUM_SCHEMES).find(([, id]) => id === itemId)?.[0] ?? null) as SchemeChoice | null);

function Preview({ item, level }: { item: ShopItem; level: number }) {
  if (item.kind === 'skin') return <div className="shop-preview"><Avatar level={level} skin={item.id} /></div>;
  if (item.kind === 'accessory') return <div className="shop-preview"><Avatar level={level} accessory={item.id} /></div>;
  if (item.kind === 'title') return <div className="shop-preview title-preview" lang="de">„{item.name}“</div>;
  // Farbschema: Mini-Ansicht der App in Hell und Dunkel
  const pal = item.palette;
  if (!pal) return <div className="shop-preview swatches"><span style={{ background: item.color }} /></div>;
  const mini = ([bg, card, accent, onAccent]: string[], label: string) => (
    <div className="mini-app" style={{ background: bg }} aria-hidden="true">
      <span className="mini-card" style={{ background: card }}>
        <i style={{ background: accent }} />
        <i style={{ background: accent, opacity: 0.35 }} />
      </span>
      <span className="mini-btn" style={{ background: accent, color: onAccent }}>{label}</span>
    </div>
  );
  return (
    <div className="shop-preview scheme-preview" data-scheme-preview={item.id}>
      {mini(pal.light, 'Hell')}
      {mini(pal.dark, 'Dunkel')}
    </div>
  );
}

export function Shop() {
  const { api, showError, dataChanged } = useApp();
  const game = useGame();
  const cosmetics = useCosmetics();
  const [busy, setBusy] = useState<string | null>(null);
  const [scheme, setSchemeState] = useState(getScheme());
  const previewing = useSyncExternalStore(subscribePreview, getPreviewScheme);
  const items = useShopItems();
  const social = api.social;

  if (!social)
    return (
      <>
        <h2>Shop</h2>
        <div className="card">
          <h3>Der Shop braucht ein Konto</h3>
          <p className="muted">Käufe werden auf dem Server geprüft. Im lokalen Modus ohne Konto gibt es deshalb keinen Shop.</p>
        </div>
      </>
    );
  if (game.status === 'loading') return <Loading />;
  if (game.status === 'error') return <LoadError error={game.error} />;
  const g = game.data;
  const balance = g.balance;
  const owned = new Set(cosmetics.owned);

  const reloadShop = async () => setCosmetics(await social.myShop());

  const buy = async (item: ShopItem) => {
    if (!(await ask(`„${item.name}“ für ${fmt(item.price, 0)} Credits kaufen?`, { title: 'Kaufen?', ok: 'Kaufen' }))) return;
    setBusy(item.id);
    try {
      await social.buy(item.id);
      await reloadShop();
      dataChanged(); // Guthaben in der Kopfzeile neu laden
      await use(item, true);
    } catch (err) {
      showError(err);
    } finally {
      setBusy(null);
    }
  };

  /** Ausrüsten bzw. ablegen (Farbschemata gelten pro Gerät) */
  const use = async (item: ShopItem, afterBuy = false) => {
    if (item.kind === 'scheme') {
      const id = schemeOf(item.id);
      if (id) {
        setScheme(id);
        setSchemeState(id);
      }
      return;
    }
    const kind = item.kind;
    const active = getCosmetics().equipped[kind] === item.id;
    const next = active && !afterBuy ? null : item.id;
    try {
      await social.equip(kind, next);
      await reloadShop();
    } catch (err) {
      showError(err);
    }
  };

  const isActive = (item: ShopItem) => (item.kind === 'scheme' ? schemeOf(item.id) === scheme : cosmetics.equipped[item.kind] === item.id);

  return (
    <>
      <h2>Shop</h2>
      <div className="card wallet">
        <span className="muted small">Dein Guthaben</span>
        <div className="wallet-balance" id="shop-balance"><Coin /> {fmt(balance, 0)}</div>
        <p className="muted small">
          Verdient: {fmt(g.credits, 0)} · Ausgegeben: {fmt(g.credits - balance, 0)}. Credits bekommst du für Trainings, Aufgaben und Challenges.
          Dein Level zählt alle verdienten Credits – Einkaufen senkt es nicht.
        </p>
        {cosmetics.admin && <p className="notice small" id="admin-shop-note">Admin: Du besitzt alle Artikel. Eigene Farbschemata entwirfst du im Admin-Menü.</p>}
      </div>
      {SHOP_SECTIONS.map(([kind, title]) => (
        <section key={kind}>
          <h3>{title}</h3>
          <div className="shop-grid">
            {items.filter((i) => i.kind === kind).map((item) => {
              const has = owned.has(item.id);
              const active = has && isActive(item);
              const missing = item.price - balance;
              return (
                <div key={item.id} className={`shop-item${active ? ' equipped' : ''}`} data-item={item.id}>
                  <Preview item={item} level={g.player.level} />
                  <h4>{item.name}</h4>
                  <p>{item.description}</p>
                  {item.kind === 'scheme' && !(has && active) && (
                    <button
                      className={`btn eye-btn${previewing === schemeOf(item.id) ? ' on' : ''}`}
                      data-preview={item.id}
                      aria-pressed={previewing === schemeOf(item.id)}
                      onClick={() => setPreviewScheme(previewing === schemeOf(item.id) ? null : schemeOf(item.id))}
                    >
                      {previewing === schemeOf(item.id) ? '👁 Vorschau aus' : '👁 Ansehen'}
                    </button>
                  )}
                  {has ? (
                    <button className={`btn ${active ? '' : 'primary'}`} onClick={() => use(item)} disabled={active && item.kind === 'scheme'}>
                      {active ? (item.kind === 'scheme' ? 'Aktiv ✓' : 'Aktiv ✓ · ablegen') : 'Benutzen'}
                    </button>
                  ) : (
                    <button className="btn" onClick={() => buy(item)} disabled={missing > 0 || busy !== null}>
                      {missing > 0 ? (
                        `Noch ${fmt(missing, 0)} fehlen`
                      ) : (
                        <span className="price"><Coin /> {fmt(item.price, 0)} kaufen</span>
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </>
  );
}
