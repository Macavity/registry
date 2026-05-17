import * as v from 'valibot';
import {
  commonManifestFields,
  SupportedLanguageSchema,
  type CommonManifest,
  type SupportedLanguage,
} from './common';

export const FrontendSchema = v.picklist(['desktop', 'web', 'mobile']);

export type Frontend = 'desktop' | 'web' | 'mobile';

export const PluginManifestSchema = v.object({
  ...commonManifestFields,
  entry: v.pipe(v.string(), v.minLength(1, 'entry is required')),
  frontends: v.pipe(
    v.array(FrontendSchema),
    v.minLength(1, 'frontends must contain at least one value'),
  ),
  i18n: v.optional(v.array(SupportedLanguageSchema)),
});

export interface PluginManifest extends CommonManifest {
  entry: string;
  frontends: Frontend[];
  i18n?: SupportedLanguage[];
}

export function parsePluginManifest(input: unknown): PluginManifest {
  return v.parse(PluginManifestSchema, input) as PluginManifest;
}

export function safeParsePluginManifest(
  input: unknown,
): v.SafeParseResult<typeof PluginManifestSchema> {
  return v.safeParse(PluginManifestSchema, input);
}
