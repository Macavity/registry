import { TYPE_TO_MANIFEST_FILE, type ResourceType } from './types';
import { getEtag, setEtag, type EtagCache } from './etag-cache';

export type ManifestFetchResult =
  | { kind: 'not-modified' }
  | { kind: 'ok'; text: string; etag?: string }
  | { kind: 'missing' };

export type ManifestFetchArgs = {
  owner: string;
  repo: string;
  tag: string;
  type: ResourceType;
};

export async function fetchManifest(
  cache: EtagCache,
  args: ManifestFetchArgs,
): Promise<ManifestFetchResult> {
  const file = TYPE_TO_MANIFEST_FILE[args.type];
  const url = `https://raw.githubusercontent.com/${args.owner}/${args.repo}/${args.tag}/${file}`;
  const key = `${args.owner}/${args.repo}@${args.tag}#${args.type}`;
  const prior = getEtag(cache, key);
  const res = await fetch(url, {
    headers: prior ? { 'If-None-Match': prior } : undefined,
  });
  if (res.status === 304) return { kind: 'not-modified' };
  if (res.status === 404) return { kind: 'missing' };
  if (!res.ok) throw new Error(`fetch ${url} → ${res.status}`);
  const etag = res.headers.get('etag') ?? undefined;
  if (etag) setEtag(cache, key, etag);
  return { kind: 'ok', text: await res.text(), etag };
}
