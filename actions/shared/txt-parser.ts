export type FormatViolation =
  | { kind: 'whitespace'; line: number; raw: string }
  | { kind: 'blank'; line: number }
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
    // Casing is preserved in the file (GitHub display form), but dedup, sort
    // order, and the REPO_RE shape check are evaluated case-insensitively —
    // GitHub resolves URLs that way too.
    const key = trimmed.toLowerCase();
    if (!REPO_RE.test(key)) {
      violations.push({ kind: 'invalid-format', line: lineNo, raw });
      return;
    }
    if (seen.has(key)) {
      violations.push({ kind: 'duplicate', line: lineNo, entry: key });
      return;
    }
    if (previous !== null && key < previous) {
      violations.push({
        kind: 'out-of-order',
        line: lineNo,
        entry: key,
        shouldBeAfter: previous,
      });
    }
    seen.add(key);
    entries.push(trimmed);
    previous = key;
  });

  return { entries, violations };
}
