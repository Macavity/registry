import * as v from 'valibot';
import { commonManifestFields, type CommonManifest } from './common';

// v1 stub: widgets accept any object that satisfies CommonManifest. The
// embedding mechanism in markdown and the per-widget config shape are
// unresolved; the spec calls v1.x out as a breaking change for widget authors.
export const WidgetManifestSchema = v.object({
  ...commonManifestFields,
});

export type WidgetManifest = CommonManifest;

export function parseWidgetManifest(input: unknown): WidgetManifest {
  return v.parse(WidgetManifestSchema, input) as WidgetManifest;
}

export function safeParseWidgetManifest(
  input: unknown,
): v.SafeParseResult<typeof WidgetManifestSchema> {
  return v.safeParse(WidgetManifestSchema, input);
}
