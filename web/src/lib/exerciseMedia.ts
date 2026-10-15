// Übungsbilder (Start-/Endstellung) liegen in public/exercise-media/<slug>/0.jpg und 1.jpg.
// Welche es gibt, steht in exercise-media/index.json (beim Build erzeugt). Ohne Bild zeigt die App die Animation.
import { norm } from './describe';

/** Ordnername einer Übung: Kleinbuchstaben, Umlaute aufgelöst, Sonderzeichen zu „-“ („Rudern (T-Stange)“ → „rudern-t-stange“) */
export function mediaSlug(name: string): string {
  return norm(name).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

let loaded: Promise<Set<string>> | null = null;
export function mediaSlugs(): Promise<Set<string>> {
  loaded ??= fetch('./exercise-media/index.json')
    .then((r) => (r.ok ? r.json() : { slugs: [] }))
    .then((j: { slugs?: string[] }) => new Set(j.slugs ?? []))
    .catch(() => new Set<string>());
  return loaded;
}

export const mediaUrl = (name: string, frame: 0 | 1): string => `./exercise-media/${mediaSlug(name)}/${frame}.jpg`;
