// Leiste unten, solange im Shop ein Farbschema zur Vorschau angeschaut wird – auf jeder Seite sichtbar.
import { useSyncExternalStore } from 'react';
import { getPreviewScheme, schemeLabel, setPreviewScheme, subscribePreview } from '../lib/theme';

export function PreviewBar() {
  const scheme = useSyncExternalStore(subscribePreview, getPreviewScheme);
  if (!scheme) return null;
  const label = schemeLabel(scheme).replace(' (Shop)', '');
  return (
    <div className="preview-bar" id="preview-bar" role="status">
      <span>
        👁 <strong>{label}</strong>
      </span>
      {location.hash !== '#/shop' && (
        <a className="btn small-btn" href="#/shop">Shop</a>
      )}
      <button className="btn small-btn primary" id="end-preview" onClick={() => setPreviewScheme(null)}>
        Beenden
      </button>
    </div>
  );
}
