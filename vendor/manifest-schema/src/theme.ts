import * as v from 'valibot';
import { commonManifestFields, type CommonManifest } from './common';

export const ThemeModeSchema = v.picklist(['light', 'dark']);

export type ThemeMode = 'light' | 'dark';

export const ThemeManifestSchema = v.pipe(
  v.object({
    ...commonManifestFields,
    entry: v.pipe(v.string(), v.minLength(1, 'entry is required')),
    modes: v.pipe(
      v.array(ThemeModeSchema),
      v.minLength(1, 'modes must contain at least one value'),
    ),
    providesIcons: v.optional(v.boolean()),
    iconEntry: v.optional(v.string()),
  }),
  v.check((obj) => {
    if (!obj.providesIcons) return true;
    return typeof obj.iconEntry === 'string' && obj.iconEntry.length > 0;
  }, 'iconEntry is required when providesIcons is true'),
);

export interface ThemeManifest extends CommonManifest {
  entry: string;
  modes: ThemeMode[];
  providesIcons?: boolean;
  iconEntry?: string;
}

export function parseThemeManifest(input: unknown): ThemeManifest {
  return v.parse(ThemeManifestSchema, input) as ThemeManifest;
}

export function safeParseThemeManifest(
  input: unknown,
): v.SafeParseResult<typeof ThemeManifestSchema> {
  return v.safeParse(ThemeManifestSchema, input);
}
