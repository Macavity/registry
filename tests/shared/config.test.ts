import { expect, test } from 'bun:test';
import { loadLicenseAllowlist, loadReservedIds } from '../../actions/shared/config';

test('loads SPDX license allowlist', async () => {
  const allowed = await loadLicenseAllowlist();
  expect(allowed.has('MIT')).toBe(true);
  expect(allowed.has('Apache-2.0')).toBe(true);
  expect(allowed.has('AGPL-3.0-only')).toBe(true);
  expect(allowed.has('FAKE-LICENSE')).toBe(false);
});

test('reserved ids is empty in v1', async () => {
  const reserved = await loadReservedIds();
  expect(reserved.size).toBe(0);
});
