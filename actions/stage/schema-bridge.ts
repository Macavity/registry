import {
  parseIconPackManifest as _parseIconPackManifest,
  parsePluginManifest as _parsePluginManifest,
  parseTemplateManifest as _parseTemplateManifest,
  parseThemeManifest as _parseThemeManifest,
  parseWidgetManifest as _parseWidgetManifest,
} from '@grove/manifest-schema';
import type { AnyManifest } from './types';

export type AnyManifestParse = (input: unknown) => AnyManifest;

export const parsePluginManifest: AnyManifestParse = _parsePluginManifest;
export const parseThemeManifest: AnyManifestParse = _parseThemeManifest;
export const parseIconPackManifest: AnyManifestParse = _parseIconPackManifest;
export const parseTemplateManifest: AnyManifestParse = _parseTemplateManifest;
export const parseWidgetManifest: AnyManifestParse = _parseWidgetManifest;
