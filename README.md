# commit-sentinel

> Enforce commit message and branch naming conventions via a git `commit-msg` hook.

If a commit message or branch name doesn't match your rules, the operation is **blocked** (or warned) and the terminal shows what's wrong plus a suggested fix.

```
  ❌  Commit blocked by commit-sentinel

  Commit: "added login screen"

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
  "commits": {
    "enabled": true,
    "enforce": true,
    "tense": "imperative",
    "case": "sentence",
    "minLength": 10,
    "maxLength": 72,
    "noTrailingPeriod": true,
    "noGenericMessages": true,
    "requireType": false,
    "allowedTypes": ["feat", "fix", "docs", "chore", "refactor", "test", "style", "perf", "ci", "build", "revert"],
    "forbiddenWords": ["WIP", "wip", "fixup", "FIXUP"],
    "ignoredPrefixes": [],
    "requiredPatterns": [],
    "requireBlankLineAfterSubject": false,
    "customPattern": null
  },
  "branches": {
    "enabled": true,
    "enforce": true,
    "tense": null,
    "allowedPrefixes": ["feature", "bugfix", "task", "test", "tests"],
    "requireTicketNumber": true,
    "ticketPattern": "[0-9]{4,}",
    "namingPattern": "kebab-case",
    "exempt": ["main", "rc", "qa", "production", "release-*"]
  },
  "scope": {
    "enabled": false,
    "enforce": true,
    "rules": []
  }
}
```

You can also embed the config in `package.json` under a `"commitSentinel"` key.

Only specify the fields you want to override — all other values use defaults.

---

## Config Reference

### `commits`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | `boolean` | `true` | When `false`, all commit message checks are skipped |
| `enforce` | `boolean` | `true` | When `false`, checks run and print feedback but do **not** block the commit |
| `tense` | `string \| null` | `"imperative"` | Verb tense of the first word. `"imperative"`, `"past"`, `"present"`, or `null` to skip |
| `case` | `string \| null` | `"sentence"` | Casing rule. `"sentence"`, `"lower"`, `"upper"`, `"title"`, `"camel"`, or `null` |
| `minLength` | `number` | `10` | Minimum subject line length |
| `maxLength` | `number` | `72` | Maximum subject line length |
| `noTrailingPeriod` | `boolean` | `true` | Disallow trailing `.` on the subject |
| `noGenericMessages` | `boolean` | `true` | Block single-word generic messages like `"fix"` or `"update"` |
| `requireType` | `boolean` | `false` | Enforce a [Conventional Commits](https://www.conventionalcommits.org) type prefix (`feat:`, `fix:`, etc.) |
| `allowedTypes` | `string[]` | `["feat","fix",...]` | Allowed type prefixes (only when `requireType: true`) |
| `forbiddenWords` | `string[]` | `["WIP","wip","fixup","FIXUP"]` | Words/phrases that must not appear in the message |
| `ignoredPrefixes` | `string[]` | `[]` | Regex patterns stripped from the subject before checks (ticket IDs, team tags, etc.) |
| `requiredPatterns` | `object[]` | `[]` | Patterns that must match the subject. Each entry: `{ pattern: string, message?: string }` |
| `requireBlankLineAfterSubject` | `boolean` | `false` | Require a blank line between the subject and body |
| `customPattern` | `string \| null` | `null` | A regex the entire subject must match (overrides all other checks) |

### `branches`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | `boolean` | `true` | When `false`, all branch name checks are skipped |
| `enforce` | `boolean` | `true` | When `false`, checks print feedback but do **not** block |
| `tense` | `string \| null` | `null` | Verb tense of the first word in the description. `"imperative"`, `"past"`, `"present"`, or `null` to skip |
| `allowedPrefixes` | `string[]` | `["feature","bugfix","task","test","tests"]` | Allowed prefixes (the part before `/`) |
| `requireTicketNumber` | `boolean` | `true` | Whether a ticket number is required after the prefix |
| `ticketPattern` | `string` | `"[0-9]{4,}"` | Regex for matching the ticket portion of the branch name |
| `namingPattern` | `string \| null` | `"kebab-case"` | Naming convention for the description segment. `"kebab-case"`, `"snake_case"`, or `null` to skip |
| `exempt` | `string[]` | `["main","rc","qa","production","release-*"]` | Branch names or glob patterns that bypass all checks |

### `scope`

Scope rules enforce that certain paths are committed in isolation — if staged files match a scope rule **and** other staged files don't, the commit is flagged. This is useful when specific directories (e.g. shared libraries, database migrations) should always be committed separately.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | `boolean` | `false` | When `false`, all scope checks are skipped (opt-in) |
| `enforce` | `boolean` | `true` | When `false`, checks print feedback but do **not** block the commit |
| `rules` | `object[]` | `[]` | Paths that must be committed in isolation. Each entry: `{ path: string, name?: string, message?: string }` |

Each rule in `rules` accepts:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `path` | `string` | yes | Glob pattern to match staged files (e.g. `"src/shared/**"`, `"db/**"`) |
| `name` | `string` | no | Human-readable label used in error messages (defaults to the `path`) |
| `message` | `string` | no | Custom error message shown when the rule is violated |

---

## Preset examples

### Strict Conventional Commits
```json
{
  "commits": {
    "requireType": true,
    "allowedTypes": ["feat", "fix", "docs", "chore", "refactor", "test"],
    "tense": "imperative",
    "case": "lower",
    "maxLength": 72
  }
}
```

### Commits only (no branch checks)
```json
{
  "commits": {
    "tense": "imperative",
    "case": "sentence"
  },
  "branches": {
    "enabled": false
  }
}
```

### Branches only (no commit checks)
```json
{
  "commits": {
    "enabled": false
  },
  "branches": {
    "tense": "imperative",
    "allowedPrefixes": ["feature", "bugfix", "hotfix"],
    "requireTicketNumber": true,
    "ticketPattern": "[A-Z]+-[0-9]+",
    "namingPattern": "kebab-case"
  }
}
```

### Warn-only mode (no blocking)
```json
{
  "commits": {
    "enforce": false
  },
  "branches": {
    "enforce": false
  }
}
```

### Relaxed — just length and no WIP
```json
{
  "commits": {
    "tense": null,
    "case": null,
    "minLength": 8,
    "maxLength": 100,
    "forbiddenWords": ["WIP", "wip", "TODO", "FIXME"]
  },
  "branches": {
    "enabled": false
  }
}
```

### Branch naming with snake_case
```json
{
  "branches": {
    "allowedPrefixes": ["feature", "bugfix", "task"],
    "namingPattern": "snake_case",
    "exempt": ["main", "develop", "release-*"]
  }
}
```

### Isolate shared code changes
```json
{
  "scope": {
    "enabled": true,
    "enforce": true,
    "rules": [
      { "path": "src/shared/**", "name": "shared code" }
    ]
  }
}
```

### Warn (don't block) when mixing scoped paths
```json
{
  "scope": {
    "enabled": true,
    "enforce": false,
    "rules": [
      { "path": "src/shared/**", "name": "shared code" },
      { "path": "db/migrations/**", "message": "Database migrations should be committed separately" }
    ]
  }
}
```

---

## CLI Commands

```bash
# Install the git hook
npx commit-sentinel install

# Remove the hook
npx commit-sentinel uninstall

# Manually validate a commit message (useful in CI)
npx commit-sentinel validate "feat: add login screen"

# Manually validate a branch name
npx commit-sentinel validate-branch "feature/1234-add-login"

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

- name: Validate branch name
  run: |
    BRANCH=$(git rev-parse --abbrev-ref HEAD)
    npx commit-sentinel validate-branch "$BRANCH"
```

---

## Programmatic API

```js
const { CommitSentinel } = require('commit-sentinel');

const sentinel = new CommitSentinel({
  commits: {
    tense: 'imperative',
    case: 'sentence',
    maxLength: 72
  },
  branches: {
    allowedPrefixes: ['feature', 'bugfix'],
    namingPattern: 'kebab-case'
  }
});

const commitResult = sentinel.validateCommit('Added new feature');
// { valid: false, enforced: true, errors: [...], suggestions: [...] }
console.log(sentinel.formatCommit('Added new feature', commitResult));

const branchResult = sentinel.validateBranch('feature/1234-add-login');
// { valid: true, enforced: true, errors: [], suggestions: [] }
console.log(sentinel.formatBranch('feature/1234-add-login', branchResult));

const scopeResult = sentinel.validateScope(['src/shared/utils.ts', 'src/app.ts']);
// { valid: false, enforced: true, errors: [...], suggestions: [...] }
console.log(sentinel.formatScope(['src/shared/utils.ts', 'src/app.ts'], scopeResult));
```

---

## How the hook is installed

`commit-sentinel install` writes a `commit-msg` hook to `.git/hooks/commit-msg`. If a hook already exists, the sentinel call is **appended** (chained) — it won't overwrite your existing hook.

The hook validates staged-file scopes, the commit message, and the current branch name. If any check fails:
- **`enforce: true`** (default) — the commit is blocked.
- **`enforce: false`** — feedback is printed but the commit proceeds.

---

## License

MIT
