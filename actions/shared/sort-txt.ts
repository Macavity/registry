#!/usr/bin/env bun
import { readFile, writeFile } from 'node:fs/promises';

const FILES = ['plugins.txt', 'themes.txt', 'icons.txt', 'templates.txt', 'widgets.txt'];

for (const path of FILES) {
  const before = await readFile(path, 'utf8').catch(() => '');
  const seen = new Set<string>();
  const entries: string[] = [];
  // Preserve the author's casing (GitHub display form); dedup and sort use a
  // lowercase key so `Macavity/repo` and `macavity/repo` collapse to one.
  for (const raw of before.split('\n')) {
    const trimmed = raw.trim();
    if (trimmed.length === 0) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    entries.push(trimmed);
  }
  entries.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
  const after = entries.length === 0 ? '' : entries.join('\n') + '\n';
  if (after === before) {
    console.log(`clean: ${path}`);
    continue;
  }
  await writeFile(path, after);
  console.log(`sorted: ${path} (${entries.length} entries)`);
}
