<!--
Thanks for submitting an extension!

The `pr-check` workflow will validate everything below within ~1 minute and
post a detailed comment. This template is just a baseline so you can catch
the easy stuff before the bot has to.

See `docs/submission.md` for the full guide.
-->

## Submission

- **Resource type:** plugin / theme / icon pack / template / widget *(pick one)*
- **Repository:** `owner/repo`
- **Release tag:** `v?.?.?`

## Pre-flight checklist

- [ ] Added **one line** `owner/repo` (any casing, no leading/trailing spaces) to the **correct** `.txt` file — the resource type dictates the file and the manifest filename the bot looks for:
  - plugin → `plugins.txt` → `plugin.json`
  - theme → `themes.txt` → `theme.json`
  - icon pack → `icons.txt` → `icon-pack.json`
  - template → `templates.txt` → `template.json`
  - widget → `widgets.txt` → `widget.json`
- [ ] Ran `bun install && bun run sort` locally — no diff afterwards.
- [ ] Repo has a tagged release (e.g. `v1.0.0`) with a `package.zip` asset attached.
- [ ] Manifest is at the **repo root** at that tag.
- [ ] Manifest declares `id`, `version` (matching the tag, modulo a leading `v`), `license` (one of [`config/licenses.txt`](../config/licenses.txt)), and `minGroveVersion`.
- [ ] Only `*.txt` files are changed in this PR.

<!--
If the bot fails: read the comment it posts. Each rule has its own fix hint.
Push fixes to this same branch and the check re-runs automatically.
-->
