/**
 * `@grove/manifest-schema` — static metadata schema for Grove marketplace
 * extensions.
 *
 * The package validates the *on-disk shipping shape* of a manifest file
 * (`plugin.json`, `theme.json`, etc.) that an author commits to their repo
 * and submits to the Grove registry. It is intentionally orthogonal to
 * `@grove/plugin-api`, which exposes the runtime API surface plugin code
 * calls into; see this package's README for the distinction.
 *
 * Validators are strict on known field types (no coercion) and lenient on
 * unknown top-level fields (dropped on parse, never an error). See
 * `manifest-schema.md` §7 for the rationale.
 */

export type {
  CommonManifest,
  LocalizedPath,
  LocalizedString,
  SupportedLanguage,
} from './common';
export {
  KebabCaseIdSchema,
  LocalizedPathSchema,
  LocalizedStringSchema,
  SUPPORTED_LANGUAGES,
  SemVerSchema,
  SpdxLicenseSchema,
  SupportedLanguageSchema,
  commonManifestFields,
} from './common';

export type { Frontend, PluginManifest } from './plugin';
export {
  FrontendSchema,
  PluginManifestSchema,
  parsePluginManifest,
  safeParsePluginManifest,
} from './plugin';

export type { ThemeManifest, ThemeMode } from './theme';
export {
  ThemeManifestSchema,
  ThemeModeSchema,
  parseThemeManifest,
  safeParseThemeManifest,
} from './theme';

export type { IconPackManifest } from './icon-pack';
export {
  IconPackManifestSchema,
  parseIconPackManifest,
  safeParseIconPackManifest,
} from './icon-pack';

export type { TemplateManifest } from './template';
export {
  TemplateManifestSchema,
  parseTemplateManifest,
  safeParseTemplateManifest,
} from './template';

export type { WidgetManifest } from './widget';
export {
  WidgetManifestSchema,
  parseWidgetManifest,
  safeParseWidgetManifest,
} from './widget';

export type { RegistryEntry } from './registry';
