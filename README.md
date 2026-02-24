# commit-sentinel

> Enforce commit message conventions — tense, casing, length, conventional-commits prefixes, and more — via a git `commit-msg` hook.

If a commit message doesn't match your rules, the commit is **blocked** and the terminal shows exactly what's wrong plus a suggested fix.

```
  ❌  Commit blocked by commit-sentinel

  Message: "added login screen"

  • Verb tense is wrong. Required: imperative mood (e.g. "Add feature", "Fix bug")
  • Subject case is wrong. Required: Sentence case (first letter capitalised)

  💡 Suggestions:
     Try: "Add login screen"
```

---

## Installation

```bash
npm install --save-dev commit-sentinel
```

Then install the git hook in your repo:

```bash
npx commit-sentinel install
```

That's it. Every `git commit` will now be validated.

---

## Configuration

Create `.commit-sentinel.json` in your project root (or run `npx commit-sentinel init`):

```json
{
  "tense": "imperative",
  "case": "sentence",
  "minLength": 10,
  "maxLength": 72,
  "noTrailingPeriod": true,
  "noGenericMessages": true,
  "requireType": false,
  "allowedTypes": ["feat", "fix", "docs", "chore", "refactor", "test", "style", "perf", "ci", "build", "revert"],
  "scopePattern": null,
  "forbiddenWords": ["WIP", "wip", "fixup"],
  "ignoredPrefixes": [],
  "requiredPatterns": [],
  "requireBlankLineAfterSubject": false,
  "customPattern": null
}
```

You can also embed the config in `package.json` under a `"commitSentinel"` key.

---

## Config Reference

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `tense` | `string \| null` | `"imperative"` | Verb tense of the first word. `"imperative"`, `"past"`, `"present"`, or `null` to skip |
| `case` | `string \| null` | `"sentence"` | Casing rule. `"sentence"`, `"lower"`, `"upper"`, `"title"`, `"camel"`, or `null` |
| `minLength` | `number` | `10` | Minimum subject line length |
| `maxLength` | `number` | `72` | Maximum subject line length |
| `noTrailingPeriod` | `boolean` | `true` | Disallow trailing `.` on the subject |
| `noGenericMessages` | `boolean` | `true` | Block single-word generic messages like `"fix"` or `"update"` |
| `requireType` | `boolean` | `false` | Enforce a [Conventional Commits](https://www.conventionalcommits.org) type prefix (`feat:`, `fix:`, etc.) |
| `allowedTypes` | `string[]` | `["feat","fix",...]` | Allowed type prefixes (only when `requireType: true`) |
| `scopePattern` | `string \| null` | `null` | Regex the scope must match, e.g. `"^[a-z-]+$"` |
| `forbiddenWords` | `string[]` | `["WIP","wip","fixup"]` | Words/phrases that must not appear in the message |
| `ignoredPrefixes` | `string[]` | `[]` | Regex patterns for prefixes stripped before case/tense checks (e.g. ticket refs) |
| `requiredPatterns` | `object[]` | `[]` | Patterns that must each match the subject. Each entry has `pattern` (regex string) and optional `message` (custom error) |
| `requireBlankLineAfterSubject` | `boolean` | `false` | Require a blank line between the subject and body |
| `customPattern` | `string \| null` | `null` | A regex the entire subject must match (overrides all other checks) |

---

## Preset examples

### Strict Conventional Commits
```json
{
  "requireType": true,
  "allowedTypes": ["feat", "fix", "docs", "chore", "refactor", "test"],
  "tense": "imperative",
  "case": "lower",
  "maxLength": 72
}
```

### Jira-style ticket prefix
```json
{
  "customPattern": "^[A-Z]+-\\d+",
  "tense": null,
  "case": null
}
```

### Team tag + ticket ref (e.g. "SHARED: AB#12345 Fix login")
```json
{
  "requireType": true,
  "allowedTypes": ["feat", "fix", "docs", "chore", "refactor", "test", "shared"],
  "ignoredPrefixes": ["AB#\\d+"],
  "tense": "imperative",
  "case": "sentence"
}
```

### Relaxed — just length and no WIP
```json
{
  "tense": null,
  "case": null,
  "minLength": 8,
  "maxLength": 100,
  "forbiddenWords": ["WIP", "wip", "TODO", "FIXME"]
}
```

### Require a Jira ticket and version number
```json
{
  "tense": "imperative",
  "case": "sentence",
  "requiredPatterns": [
    { "pattern": "[A-Z]+-\\d+", "message": "Must include a Jira ticket (e.g. PROJ-123)" },
    { "pattern": "v\\d+\\.\\d+", "message": "Must include a version number (e.g. v1.2)" }
  ],
  "ignoredPrefixes": ["[A-Z]+-\\d+"]
}
```

---

## CLI Commands

```bash
# Install the git hook
npx commit-sentinel install

# Remove the hook
npx commit-sentinel uninstall

# Manually validate a message (useful in CI)
npx commit-sentinel validate "feat: add login screen"

# Generate a default config file
npx commit-sentinel init

# Show help
npx commit-sentinel --help
```

---

## Using in CI

You can manually validate the latest commit message in CI without needing the hook:

```yaml
# GitHub Actions example
- name: Validate commit message
  run: |
    MSG=$(git log -1 --pretty=%B)
    npx commit-sentinel validate "$MSG"
```

---

## Programmatic API

```js
const { CommitSentinel } = require('commit-sentinel');

const sentinel = new CommitSentinel({
  tense: 'imperative',
  case: 'sentence',
  maxLength: 72
});

const result = sentinel.validate('Added new feature');
// { valid: false, errors: [...], suggestions: [...] }

console.log(sentinel.format('Added new feature', result));
```

---

## How the hook is installed

`commit-sentinel install` writes a `commit-msg` hook to `.git/hooks/commit-msg`. If a hook already exists, the sentinel call is **appended** (chained) — it won't overwrite your existing hook.

---

## License

MIT
