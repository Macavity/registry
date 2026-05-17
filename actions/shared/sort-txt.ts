#!/usr/bin/env bun
import { readFile, writeFile } from 'node:fs/promises';

const FILES = ['plugins.txt', 'themes.txt', 'icons.txt', 'templates.txt', 'widgets.txt'];

for (const path of FILES) {
  const before = await readFile(path, 'utf8').catch(() => '');
  const lines = [
    ...new Set(
      before
        .split('\n')
        .map((l) => l.trim().toLowerCase())
        .filter((l) => l.length > 0),
    ),
  ];
  lines.sort();
  const after = lines.length === 0 ? '' : lines.join('\n') + '\n';
  if (after === before) {
    console.log(`clean: ${path}`);
    continue;
  }
  await writeFile(path, after);
  console.log(`sorted: ${path} (${lines.length} entries)`);
}
