import * as v from 'valibot';

// Canonical semver regex from semver.org/#is-there-a-suggested-regular-expression.
// sonarjs flags it as complex; the pattern is the SemVer 2.0.0 spec, not an
// invention worth simplifying away.
const SEMVER_RE =
  // eslint-disable-next-line sonarjs/regex-complexity
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;

const KEBAB_ID_RE = /^[a-z][a-z0-9-]*$/;

const SPDX_RE = /^[\w.+-]+( WITH [\w.+-]+)?$/;

/**
 * The set of language tags Grove actively renders. A `LocalizedString` may
 * supply a translation for any of these (plus the required `default`), and
 * the plugin's optional `i18n` field declares which of these the plugin
 * itself ships translations for.
 *
 * Canonical source of truth: this constant is re-exported by Grove's i18n
 * runtime (`packages/frontend/src/i18n/locale.ts`) so the validator and
 * the renderer cannot diverge. Adding a language is a minor bump of this
 * package; removing one is a major.
 *
 * Deliberately tight allowlist — accepting arbitrary BCP 47 tags would
 * let a plugin ship translations Grove can't display, which is dead data.
 */
export const SUPPORTED_LANGUAGES = ['en', 'de', 'es', 'zh-Hans', 'zh-Hant'] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const SemVerSchema = v.pipe(
  v.string(),
  v.regex(SEMVER_RE, 'expected a semver string (major.minor.patch)'),
);

export const KebabCaseIdSchema = v.pipe(
  v.string(),
  v.minLength(3, 'id must be at least 3 characters'),
  v.maxLength(50, 'id must be at most 50 characters'),
  v.regex(KEBAB_ID_RE, 'id must be kebab-case and start with a letter (^[a-z][a-z0-9-]*$)'),
);

export const SpdxLicenseSchema = v.pipe(
  v.string(),
  v.minLength(1, 'license is required'),
  v.regex(SPDX_RE, 'expected an SPDX license identifier (e.g. "MIT", "Apache-2.0")'),
);

// Locale keys are an enumerated allowlist: "default" plus every language Grove
// supports. v.strictObject enforces this — unknown keys (typos, locales Grove
// doesn't render) are rejected rather than silently dropped. The optional
// locale entries below must enumerate every value in SUPPORTED_LANGUAGES;
// the consistency test in common.test.ts fails if they diverge.
const LocalizedRecordSchema = v.strictObject({
  default: v.string(),
  en: v.optional(v.string()),
  de: v.optional(v.string()),
  es: v.optional(v.string()),
  'zh-Hans': v.optional(v.string()),
  'zh-Hant': v.optional(v.string()),
});

export const LocalizedStringSchema = LocalizedRecordSchema;
export const LocalizedPathSchema = LocalizedRecordSchema;

export type LocalizedString = {
  default: string;
} & {
  [K in SupportedLanguage]?: string;
};

// Alias kept distinct from LocalizedString so consumers reading the type
// signatures can tell at a glance whether a field's values are display
// strings or file paths. Both have the same runtime shape.
// eslint-disable-next-line sonarjs/redundant-type-aliases
export type LocalizedPath = LocalizedString;

/** Valibot schema accepting any single `SupportedLanguage` code. */
export const SupportedLanguageSchema = v.picklist(SUPPORTED_LANGUAGES);

export const commonManifestFields = {
  $schema: v.optional(v.string()),
  id: KebabCaseIdSchema,
  name: LocalizedStringSchema,
  description: LocalizedStringSchema,
  version: SemVerSchema,
  author: v.pipe(v.string(), v.minLength(1, 'author is required')),
  authorUrl: v.optional(v.string()),
  minGroveVersion: SemVerSchema,
  license: SpdxLicenseSchema,
  keywords: v.optional(v.array(v.string())),
  readme: v.optional(LocalizedPathSchema),
} as const;

export interface CommonManifest {
  $schema?: string;
  id: string;
  name: LocalizedString;
  description: LocalizedString;
  version: string;
  author: string;
  authorUrl?: string;
  minGroveVersion: string;
  license: string;
  keywords?: string[];
  readme?: LocalizedPath;
}
