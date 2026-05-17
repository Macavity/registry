import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

function root(): string {
  return process.env.BASE_PATH ?? '.';
}

async function readLines(relPath: string): Promise<string[]> {
  const text = await readFile(join(root(), relPath), 'utf8');
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
}

export async function loadLicenseAllowlist(): Promise<Set<string>> {
  return new Set(await readLines('config/licenses.txt'));
}

export async function loadReservedIds(): Promise<Set<string>> {
  return new Set(await readLines('config/reserved-ids.txt'));
}
