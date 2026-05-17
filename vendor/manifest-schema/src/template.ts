import * as v from 'valibot';
import { commonManifestFields, type CommonManifest } from './common';

export const TemplateManifestSchema = v.object({
  ...commonManifestFields,
  entry: v.pipe(v.string(), v.minLength(1, 'entry is required')),
});

export interface TemplateManifest extends CommonManifest {
  entry: string;
}

export function parseTemplateManifest(input: unknown): TemplateManifest {
  return v.parse(TemplateManifestSchema, input) as TemplateManifest;
}

export function safeParseTemplateManifest(
  input: unknown,
): v.SafeParseResult<typeof TemplateManifestSchema> {
  return v.safeParse(TemplateManifestSchema, input);
}
