import { graphql as octokitGraphql } from '@octokit/graphql';
import { Octokit } from '@octokit/rest';

export type GraphqlClient = typeof octokitGraphql;

function token(): string {
  const t = process.env.GITHUB_TOKEN ?? '';
  if (!t) throw new Error('GITHUB_TOKEN is not set');
  return t;
}

export function makeGraphqlClient(): GraphqlClient {
  return octokitGraphql.defaults({
    headers: { authorization: `bearer ${token()}` },
  });
}

export function makeRestClient(): Octokit {
  return new Octokit({ auth: token() });
}

export type HeadResult = { status: number; etag?: string };

export async function headOk(url: string, etag?: string): Promise<HeadResult> {
  const res = await fetch(url, {
    method: 'HEAD',
    headers: etag ? { 'If-None-Match': etag } : undefined,
  });
  return { status: res.status, etag: res.headers.get('etag') ?? undefined };
}
