import { describe, expect, test } from 'bun:test';
import { parseTxt } from '../../actions/shared/txt-parser';

describe('parseTxt', () => {
  test('parses an empty file with no violations', () => {
    const r = parseTxt('');
    expect(r.entries).toEqual([]);
    expect(r.violations).toEqual([]);
  });

  test('parses a single clean entry', () => {
    const r = parseTxt('example/sample-kanban\n');
    expect(r.entries).toEqual(['example/sample-kanban']);
    expect(r.violations).toEqual([]);
  });

  test('parses multiple sorted entries', () => {
    const r = parseTxt('alpha/one\nbeta/two\ngamma/three\n');
    expect(r.entries).toEqual(['alpha/one', 'beta/two', 'gamma/three']);
    expect(r.violations).toEqual([]);
  });

  test('flags leading whitespace', () => {
    const r = parseTxt('  alpha/one\n');
    expect(r.violations.some((v) => v.kind === 'whitespace')).toBe(true);
  });

  test('flags blank lines', () => {
    const r = parseTxt('alpha/one\n\nbeta/two\n');
    expect(r.violations.some((v) => v.kind === 'blank' && v.line === 2)).toBe(true);
  });

  test('flags mixed-case repo names', () => {
    const r = parseTxt('Paneon/Sample-Kanban\n');
    expect(r.violations.some((v) => v.kind === 'case')).toBe(true);
  });

  test('flags duplicates', () => {
    const r = parseTxt('alpha/one\nalpha/one\n');
    expect(r.violations.some((v) => v.kind === 'duplicate')).toBe(true);
  });

  test('flags out-of-order entries', () => {
    const r = parseTxt('zeta/one\nalpha/two\n');
    expect(r.violations.some((v) => v.kind === 'out-of-order' && v.entry === 'alpha/two')).toBe(
      true,
    );
  });

  test('flags invalid format', () => {
    const r = parseTxt('not-a-repo-line\n');
    expect(r.violations.some((v) => v.kind === 'invalid-format')).toBe(true);
  });

  test('flags missing trailing newline on non-empty file', () => {
    const r = parseTxt('alpha/one');
    expect(r.violations.some((v) => v.kind === 'missing-trailing-newline')).toBe(true);
  });

  test('accepts org/repo names with dots, hyphens, underscores', () => {
    const r = parseTxt('user.name/repo_name.with-dots\n');
    expect(r.entries).toEqual(['user.name/repo_name.with-dots']);
    expect(r.violations).toEqual([]);
  });
});
