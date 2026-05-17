export type EtagCache = Map<string, string>;

export function newCache(): EtagCache {
  return new Map();
}

export function getEtag(cache: EtagCache, key: string): string | undefined {
  return cache.get(key);
}

export function setEtag(cache: EtagCache, key: string, etag: string): void {
  cache.set(key, etag);
}
