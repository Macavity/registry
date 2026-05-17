import type { AnyManifest } from './types';

const ENTITY_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function htmlEscape(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ENTITY_MAP[c]!);
}

function escapeLocalized<T extends Record<string, string>>(value: T): T {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(value)) out[k] = htmlEscape(v);
  return out as T;
}

/**
 * Escape user-supplied strings before they reach the JSON index. Only the two
 * LocalizedString fields shared by every manifest type (name, description) need
 * escaping — every other field is either a controlled enum (license, frontends),
 * a regex-validated id/version, or a path the registry HEAD-checks but does not
 * render.
 */
export function sanitiseManifest<M extends AnyManifest>(manifest: M): M {
  return {
    ...manifest,
    name: escapeLocalized(manifest.name),
    description: escapeLocalized(manifest.description),
  };
}
