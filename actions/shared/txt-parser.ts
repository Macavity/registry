export type FormatViolation =
  | { kind: 'whitespace'; line: number; raw: string }
  | { kind: 'blank'; line: number }
  | { kind: 'case'; line: number; raw: string }
  | { kind: 'duplicate'; line: number; entry: string }
  | { kind: 'out-of-order'; line: number; entry: string; shouldBeAfter: string }
  | { kind: 'invalid-format'; line: number; raw: string }
  | { kind: 'missing-trailing-newline' };

export type ParsedTxt = {
  entries: string[];
  violations: FormatViolation[];
};

const REPO_RE = /^[a-z0-9](?:[a-z0-9._-]{0,38}[a-z0-9])?\/[a-z0-9](?:[a-z0-9._-]{0,99}[a-z0-9])?$/;

export function parseTxt(content: string): ParsedTxt {
  const violations: FormatViolation[] = [];
  const entries: string[] = [];
  const seen = new Set<string>();

  if (content.length > 0 && !content.endsWith('\n')) {
    violations.push({ kind: 'missing-trailing-newline' });
  }

  // Empty file is valid (no entries, no violations beyond the optional newline check).
  if (content.length === 0) return { entries, violations };

  const rawLines = content.split('\n');
  // Drop the trailing empty element produced by a final '\n'.
  if (rawLines[rawLines.length - 1] === '') rawLines.pop();

  let previous: string | null = null;
  rawLines.forEach((raw, idx) => {
    const lineNo = idx + 1;

    if (raw.length === 0) {
      violations.push({ kind: 'blank', line: lineNo });
      return;
    }
    if (raw !== raw.trim()) {
      violations.push({ kind: 'whitespace', line: lineNo, raw });
    }
    const trimmed = raw.trim();
    if (trimmed !== trimmed.toLowerCase()) {
      violations.push({ kind: 'case', line: lineNo, raw });
    }
    const normalised = trimmed.toLowerCase();
    if (!REPO_RE.test(normalised)) {
      violations.push({ kind: 'invalid-format', line: lineNo, raw });
      return;
    }
    if (seen.has(normalised)) {
      violations.push({ kind: 'duplicate', line: lineNo, entry: normalised });
      return;
    }
    if (previous !== null && normalised < previous) {
      violations.push({
        kind: 'out-of-order',
        line: lineNo,
        entry: normalised,
        shouldBeAfter: previous,
      });
    }
    seen.add(normalised);
    entries.push(normalised);
    previous = normalised;
  });

  return { entries, violations };
}
