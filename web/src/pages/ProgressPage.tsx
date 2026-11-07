// Eigene Seite „Fotos & Maße“: Fortschritts-Fotos (aus Galerie oder Kamera) und Körpermaße.
import { useApp } from '../app/context';
import { useAsync } from '../app/useAsync';
import { MeasuresSection, PhotosSection } from '../components/Progress';

export function ProgressPage() {
  const { api, dataVersion } = useApp();
  const weights = useAsync(() => api.listBodyWeights(), [api, dataVersion]);
  return (
    <>
      <div className="row-between"><a className="btn small-btn" href="#/koerper">← Körper</a></div>
      <PhotosSection weights={weights.status === 'ok' ? weights.data : []} />
      <MeasuresSection />
    </>
  );
}
