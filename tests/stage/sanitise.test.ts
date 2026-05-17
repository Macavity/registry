import { describe, expect, test } from 'bun:test';
import type { PluginManifest } from '@grove/manifest-schema';
import { htmlEscape, sanitiseManifest } from '../../actions/stage/sanitise';

describe('htmlEscape', () => {
  test('escapes the five entities', () => {
    expect(htmlEscape(`<>&"'`)).toBe('&lt;&gt;&amp;&quot;&#39;');
  });

  test('escapes a script tag XSS payload', () => {
    expect(htmlEscape('<script>alert(1)</script>')).toBe(
      '&lt;script&gt;alert(1)&lt;/script&gt;',
    );
  });

  test('escapes an img onerror payload', () => {
    expect(htmlEscape('<img src=x onerror=alert(1)>')).toBe(
      '&lt;img src=x onerror=alert(1)&gt;',
    );
  });

  test('escapes ampersand first to avoid double-encoding', () => {
    expect(htmlEscape('A & B')).toBe('A &amp; B');
  });

  test('leaves safe characters alone', () => {
    expect(htmlEscape('plain ASCII 123 äöü')).toBe('plain ASCII 123 äöü');
  });
});

describe('sanitiseManifest', () => {
  const base: PluginManifest = {
    id: 'k',
    name: { default: 'Kanban' },
    description: { default: 'Drag and drop columns' },
    version: '1.0.0',
    author: 'Paneon',
    minGroveVersion: '1.0.0',
    license: 'MIT',
    entry: 'dist/main.js',
    frontends: ['desktop'],
  };

  test('escapes name across every locale', () => {
    const m: PluginManifest = {
      ...base,
      name: { default: '<a>', en: '<en>', de: '<de>' } as PluginManifest['name'],
    };
    const out = sanitiseManifest(m);
    expect(out.name.default).toBe('&lt;a&gt;');
    expect(out.name.en).toBe('&lt;en&gt;');
    expect(out.name.de).toBe('&lt;de&gt;');
  });

  test('escapes description', () => {
    const m: PluginManifest = {
      ...base,
      description: { default: '<img src=x onerror=alert(1)>' },
    };
    const out = sanitiseManifest(m);
    expect(out.description.default).toBe('&lt;img src=x onerror=alert(1)&gt;');
  });

  test('leaves unrelated fields untouched', () => {
    const out = sanitiseManifest(base);
    expect(out.id).toBe('k');
    expect(out.entry).toBe('dist/main.js');
    expect(out.license).toBe('MIT');
    expect(out.frontends).toEqual(['desktop']);
  });
});
