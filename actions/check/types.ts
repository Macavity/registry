import type { FormatViolation } from '../shared/txt-parser';
import type { ResourceType } from '../stage/types';

export type RuleResult = {
  name: string;
  pass: boolean;
  message: string;
};

export type CheckReport = {
  allPassed: boolean;
  diffSummary: string;
  rules: RuleResult[];
};

export type ChangedEntry = {
  type: ResourceType;
  added: string[];
  removed: string[];
  formatViolations: FormatViolation[];
};

export type ExistingIdInfo = { type: ResourceType; repo: string };
