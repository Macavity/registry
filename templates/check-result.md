<!-- Rendered by actions/check/report.ts. -->
{{#if allPassed}}
## ✅ Ready to merge

All checks passed.
{{else}}
## ❌ Checks failed

See the rule list below for what needs fixing. After pushing fixes, apply the **Check** label to re-run.
{{/if}}

### Diff
{{diffSummary}}

### Rules
{{#each rules}}
- {{#if pass}}✅{{else}}❌{{/if}} **{{name}}** — {{message}}
{{/each}}

<!-- check-result -->
