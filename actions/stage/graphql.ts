import type { GraphqlClient } from '../shared/github';

export type RepoFacts = {
  exists: boolean;
  defaultBranch?: string;
  latestReleaseTag?: string;
  latestReleasePublishedAt?: string;
  stars?: number;
};

export type RepoCoords = { owner: string; name: string };

const CHUNK_SIZE = 100;

function buildQuery(chunk: RepoCoords[]): string {
  const fields = chunk
    .map(
      (r, j) => `r${j}: repository(owner: "${r.owner}", name: "${r.name}") {
        defaultBranchRef { name }
        stargazerCount
        latestRelease { tagName publishedAt }
      }`,
    )
    .join('\n');
  return `query Batch { ${fields} }`;
}

type RepoNode = {
  defaultBranchRef?: { name: string } | null;
  stargazerCount?: number;
  latestRelease?: { tagName: string; publishedAt: string } | null;
} | null;

async function executeQuery(
  gql: GraphqlClient,
  query: string,
): Promise<Record<string, RepoNode>> {
  try {
    return (await gql(query)) as Record<string, RepoNode>;
  } catch (e) {
    // Octokit throws when ANY repo node is null, even if the rest of the batch
    // succeeded. Partial data lives at e.data — read it back and let null nodes
    // surface as exists:false downstream.
    const err = e as { data?: Record<string, RepoNode> };
    if (err.data && typeof err.data === 'object') return err.data;
    throw e;
  }
}

export async function fetchRepoFacts(
  gql: GraphqlClient,
  repos: RepoCoords[],
): Promise<Map<string, RepoFacts>> {
  const result = new Map<string, RepoFacts>();
  for (let i = 0; i < repos.length; i += CHUNK_SIZE) {
    const chunk = repos.slice(i, i + CHUNK_SIZE);
    const data = await executeQuery(gql, buildQuery(chunk));
    chunk.forEach((r, j) => {
      const node = data[`r${j}`];
      const key = `${r.owner}/${r.name}`;
      if (!node) {
        result.set(key, { exists: false });
        return;
      }
      result.set(key, {
        exists: true,
        defaultBranch: node.defaultBranchRef?.name,
        latestReleaseTag: node.latestRelease?.tagName,
        latestReleasePublishedAt: node.latestRelease?.publishedAt,
        stars: node.stargazerCount,
      });
    });
  }
  return result;
}

// Exported for unit tests.
export const _internals = { buildQuery, CHUNK_SIZE };
