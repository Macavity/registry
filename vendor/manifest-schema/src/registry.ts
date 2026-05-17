import type { CommonManifest } from './common';

// Shape of an entry as it appears in the registry's generated *.json index
// files. The manifest fields are merged with registry-derived fields
// (repository, downloadUrl, publishedAt, stars). The marketplace spec owns
// the semantics; this package only exports the generic for type-only use.
export type RegistryEntry<M extends CommonManifest = CommonManifest> = M & {
  repository: string;
  downloadUrl: string;
  publishedAt: string;
  stars: number;
};
