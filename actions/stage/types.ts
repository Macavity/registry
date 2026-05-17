import type {
  IconPackManifest,
  PluginManifest,
  TemplateManifest,
  ThemeManifest,
  WidgetManifest,
} from '@grove/manifest-schema';

export type ResourceType = 'plugins' | 'themes' | 'icons' | 'templates' | 'widgets';

export const RESOURCE_TYPES: ResourceType[] = [
  'plugins',
  'themes',
  'icons',
  'templates',
  'widgets',
];

export type ManifestByType = {
  plugins: PluginManifest;
  themes: ThemeManifest;
  icons: IconPackManifest;
  templates: TemplateManifest;
  widgets: WidgetManifest;
};

export type AnyManifest =
  | PluginManifest
  | ThemeManifest
  | IconPackManifest
  | TemplateManifest
  | WidgetManifest;

export type RegistryEntry<M extends AnyManifest = AnyManifest> = M & {
  repository: string;
  releaseTag: string;
  downloadUrl: string;
  publishedAt: string;
  stars: number;
  addedAt: string;
};

export type IndexFile<M extends AnyManifest = AnyManifest> = {
  schemaVersion: number;
  generatedAt: string;
  manifestSchemaVersion: string;
  count: number;
  entries: RegistryEntry<M>[];
};

export const SCHEMA_VERSION = 1;

export const TYPE_TO_MANIFEST_FILE: Record<ResourceType, string> = {
  plugins: 'plugin.json',
  themes: 'theme.json',
  icons: 'icon-pack.json',
  templates: 'template.json',
  widgets: 'widget.json',
};
