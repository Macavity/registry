import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { computeDiff } from '../../actions/check/diff';

function tree(): { base: string; head: string; cleanup: () => void } {
  const root = mkdtempSync(join(tmpdir(), 'check-diff-'));
  const base = join(root, 'base');
  const head = join(root, 'head');
  mkdirSync(base);
  mkdirSync(head);
  for (const f of ['plugins.txt', 'themes.txt', 'icons.txt', 'templates.txt', 'widgets.txt']) {
    writeFileSync(join(base, f), '');
    writeFileSync(join(head, f), '');
  }
  return {
    base,
    head,
    cleanup: () => rmSync(root, { recursive: true, force: true }),
  };
}

describe('computeDiff', () => {
  let t: ReturnType<typeof tree>;
  beforeEach(() => {
    t = tree();
  });
  afterEach(() => t.cleanup());

  test('reports an addition', async () => {
    writeFileSync(join(t.head, 'plugins.txt'), 'example/sample-kanban\n');
    const d = await computeDiff(t.base, t.head);
    const plugins = d.perType.find((p) => p.type === 'plugins')!;
    expect(plugins.added).toEqual(['example/sample-kanban']);
    expect(plugins.removed).toEqual([]);
    expect(d.illegalFiles).toEqual([]);
  });

  test('reports a removal', async () => {
    writeFileSync(join(t.base, 'plugins.txt'), 'example/sample-kanban\n');
    writeFileSync(join(t.head, 'plugins.txt'), '');
    const d = await computeDiff(t.base, t.head);
    const plugins = d.perType.find((p) => p.type === 'plugins')!;
    expect(plugins.removed).toEqual(['example/sample-kanban']);
    expect(plugins.added).toEqual([]);
  });

  test('flags illegal file changes', async () => {
    writeFileSync(join(t.head, 'README.md'), 'new content');
    const d = await computeDiff(t.base, t.head);
    expect(d.illegalFiles).toContain('README.md');
  });

  test('propagates format violations from the head tree', async () => {
    writeFileSync(join(t.head, 'plugins.txt'), '  example/sample-kanban\n');
    const d = await computeDiff(t.base, t.head);
    const plugins = d.perType.find((p) => p.type === 'plugins')!;
    expect(plugins.formatViolations.some((v) => v.kind === 'whitespace')).toBe(true);
  });

  test('preserves author casing in added and treats case-only differences as a no-op', async () => {
    writeFileSync(join(t.base, 'themes.txt'), 'macavity/dark-forest-theme\n');
    writeFileSync(join(t.head, 'themes.txt'), 'Macavity/dark-forest-theme\n');
    const d = await computeDiff(t.base, t.head);
    const themes = d.perType.find((p) => p.type === 'themes')!;
    expect(themes.added).toEqual([]);
    expect(themes.removed).toEqual([]);
  });

  test('reports an addition with the author casing preserved', async () => {
    writeFileSync(join(t.head, 'themes.txt'), 'Macavity/dark-forest-theme\n');
    const d = await computeDiff(t.base, t.head);
    const themes = d.perType.find((p) => p.type === 'themes')!;
    expect(themes.added).toEqual(['Macavity/dark-forest-theme']);
  });
});
