import * as v from 'valibot';
import { commonManifestFields, type CommonManifest } from './common';

export const IconPackManifestSchema = v.object({
  ...commonManifestFields,
  entry: v.pipe(v.string(), v.minLength(1, 'entry is required')),
  iconCount: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0))),
});

export interface IconPackManifest extends CommonManifest {
  entry: string;
  iconCount?: number;
}

export function parseIconPackManifest(input: unknown): IconPackManifest {
  return v.parse(IconPackManifestSchema, input) as IconPackManifest;
}

export function safeParseIconPackManifest(
  input: unknown,
): v.SafeParseResult<typeof IconPackManifestSchema> {
  return v.safeParse(IconPackManifestSchema, input);
}
