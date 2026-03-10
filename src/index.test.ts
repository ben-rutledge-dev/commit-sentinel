import { CommitSentinel }                        from './index';
import { detectTense, toImperative, toPresent, toPast } from './verb-tense';
import type { VerbTense }                        from './types';

let passed = 0;
let failed = 0;

function test(description: string, fn: () => void): void {
  try {
    fn();
    console.log(`  \u2705 ${description}`);
    passed++;
  } catch (e) {
    console.error(`  \u274c ${description}`);
    console.error(`     ${(e as Error).message}`);
    failed++;
  }
}

function assert(condition: boolean, message?: string): void {
  if (!condition) throw new Error(message ?? 'Assertion failed');
}

function eq<T>(a: T, b: T): void {
  if (a !== b) throw new Error(`Expected "${String(b)}", got "${String(a)}"`);
}

// ===========================================================================
// verb-tense unit tests
// ===========================================================================

console.log('\n\u2500\u2500 detectTense \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n');

(
  [
    ['Add',      'imperative'],
    ['Fix',      'imperative'],
    ['Write',    'imperative'],
    ['Build',    'imperative'],
    ['Rewrite',  'imperative'],
    ['Make',     'imperative'],
    ['Run',      'imperative'],
    ['Rebuild',  'imperative'],
  ] as [string, VerbTense][]
).forEach(([word, expected]) =>
  test(`detectTense: "${word}" \u2192 ${expected}`, () => eq(detectTense(word), expected))
);

(
  [
    ['Added',      'past'],
    ['Removed',    'past'],
    ['Updated',    'past'],
    ['Refactored', 'past'],
    ['Fixed',      'past'],
  ] as [string, VerbTense][]
).forEach(([word, expected]) =>
  test(`detectTense: "${word}" \u2192 ${expected} (regular)`, () => eq(detectTense(word), expected))
);

(
  [
    ['Wrote',   'past'],
    ['Rewrote', 'past'],
    ['Built',   'past'],
    ['Rebuilt', 'past'],
    ['Made',    'past'],
    ['Broke',   'past'],
    ['Ran',     'past'],
    ['Went',    'past'],
    ['Got',     'past'],
    ['Took',    'past'],
    ['Sent',    'past'],
    ['Led',     'past'],
    ['Found',   'past'],
  ] as [string, VerbTense][]
).forEach(([word, expected]) =>
  test(`detectTense: "${word}" \u2192 ${expected} (irregular)`, () => eq(detectTense(word), expected))
);

(
  [
    ['Writes', 'present'],
    ['Builds', 'present'],
    ['Adds',   'present'],
    ['Fixes',  'present'],
  ] as [string, VerbTense][]
).forEach(([word, expected]) =>
  test(`detectTense: "${word}" \u2192 ${expected}`, () => eq(detectTense(word), expected))
);

(
  [
    ['Adding',      'gerund'],
    ['Writing',     'gerund'],
    ['Refactoring', 'gerund'],
  ] as [string, VerbTense][]
).forEach(([word, expected]) =>
  test(`detectTense: "${word}" \u2192 ${expected}`, () => eq(detectTense(word), expected))
);

console.log('\n\u2500\u2500 toImperative \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n');

(
  [
    ['wrote',   'write'],
    ['rebuilt', 'rebuild'],
    ['fixed',   'fix'],
    ['added',   'add'],
    ['went',    'go'],
    ['broke',   'break'],
    ['builds',  'build'],
    ['running', 'run'],
  ] as [string, string][]
).forEach(([input, expected]) =>
  test(`toImperative: "${input}" \u2192 "${expected}"`, () => eq(toImperative(input), expected))
);

console.log('\n\u2500\u2500 toPast / toPresent \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n');

(
  [
    ['write', 'wrote'],
    ['build', 'built'],
    ['add',   'added'],
    ['fix',   'fixed'],
    ['run',   'ran'],
  ] as [string, string][]
).forEach(([input, expected]) =>
  test(`toPast: "${input}" \u2192 "${expected}"`, () => eq(toPast(input), expected))
);

(
  [
    ['write', 'writes'],
    ['fix',   'fixes'],
    ['add',   'adds'],
  ] as [string, string][]
).forEach(([input, expected]) =>
  test(`toPresent: "${input}" \u2192 "${expected}"`, () => eq(toPresent(input), expected))
);

// ===========================================================================
// CommitSentinel - commit validation
// ===========================================================================

console.log('\n\u2500\u2500 CommitSentinel: irregular verb rejection \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n');

const s = new CommitSentinel();

test('rejects "Wrote new parser" (irregular past)', () => {
  const r = s.validateCommit('Wrote new parser for JSON handling');
  assert(!r.valid);
  assert(r.errors.some(e => e.includes('tense')));
});
test('rejects "Rebuilt auth module"', () => {
  const r = s.validateCommit('Rebuilt the authentication module');
  assert(!r.valid);
  assert(r.errors.some(e => e.includes('tense')));
});
test('rejects "Made changes to config"', () => {
  const r = s.validateCommit('Made changes to the configuration');
  assert(!r.valid);
  assert(r.errors.some(e => e.includes('tense')));
});
test('rejects "Broke down legacy code"', () => {
  const r = s.validateCommit('Broke down legacy code into modules');
  assert(!r.valid);
  assert(r.errors.some(e => e.includes('tense')));
});
test('accepts "Rewrite the JSON parser"', () => {
  const r = s.validateCommit('Rewrite the JSON parser for speed');
  assert(r.valid, JSON.stringify(r.errors));
});
test('accepts "Build Docker image on CI"', () => {
  const r = s.validateCommit('Build Docker image on CI pipeline');
  assert(r.valid, JSON.stringify(r.errors));
});
test('accepts "Fix memory leak in renderer"', () => {
  const r = s.validateCommit('Fix memory leak in renderer module');
  assert(r.valid, JSON.stringify(r.errors));
});

console.log('\n\u2500\u2500 CommitSentinel: existing rules \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n');

test('accepts valid imperative sentence-case message', () => {
  const r = s.validateCommit('Add user authentication module');
  assert(r.valid, JSON.stringify(r.errors));
});
test('rejects regular past "Added"', () => {
  const r = s.validateCommit('Added user authentication module');
  assert(!r.valid);
  assert(r.errors.some(e => e.includes('tense')));
});
test('rejects lowercase start', () => {
  const r = s.validateCommit('add user authentication module');
  assert(!r.valid);
  assert(r.errors.some(e => e.includes('case')));
});
test('rejects trailing period', () => {
  const r = s.validateCommit('Add user authentication module.');
  assert(!r.valid);
  assert(r.errors.some(e => e.includes('period')));
});
test('rejects too-short message', () => {
  const r = s.validateCommit('Fix bug');
  assert(!r.valid);
  assert(r.errors.some(e => e.includes('short')));
});
test('rejects forbidden word WIP', () => {
  const r = s.validateCommit('WIP: Add half-finished feature');
  assert(!r.valid);
  assert(r.errors.some(e => e.includes('forbidden')));
});

const cc = new CommitSentinel({ commits: { requireType: true, tense: 'imperative', case: 'lower' } });

test('accepts conventional commit format', () => {
  const r = cc.validateCommit('feat: add login screen');
  assert(r.valid, JSON.stringify(r.errors));
});
test('rejects unknown conventional commit type', () => {
  const r = cc.validateCommit('hack: add something');
  assert(!r.valid);
  assert(r.errors.some(e => e.includes('Unknown type')));
});

console.log('\n\u2500\u2500 Suggestions \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n');

test('suggests "Write" when "Wrote" is used', () => {
  const r = s.validateCommit('Wrote new parser for JSON handling');
  assert(r.suggestions.some(s => s.toLowerCase().includes('write')), JSON.stringify(r.suggestions));
});
test('suggests "Build" when "Built" is used', () => {
  const r = s.validateCommit('Built the Docker image pipeline');
  assert(r.suggestions.some(s => s.toLowerCase().includes('build')), JSON.stringify(r.suggestions));
});
test('produces one combined suggestion for tense + case errors', () => {
  const r = s.validateCommit('added fix to login screen');
  assert(!r.valid);
  // Should have exactly one Try: suggestion that fixes BOTH tense and case → "Add fix to login screen"
  const trySuggestions = r.suggestions.filter(s => s.startsWith('Try: "'));
  eq(trySuggestions.length, 1);
  assert(trySuggestions[0].includes('Add fix to login screen'), JSON.stringify(trySuggestions));
});

// ===========================================================================
// ignoredPrefixes
// ===========================================================================

console.log('\n\u2500\u2500 CommitSentinel: ignoredPrefixes \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n');

test('ignoredPrefixes strips ticket ID before tense/case checks', () => {
  const sentinel = new CommitSentinel({ commits: { ignoredPrefixes: ['[A-Z]+-\\d+'] } });
  const r = sentinel.validateCommit('PROJ-123: Add login screen');
  assert(r.valid, JSON.stringify(r.errors));
});
test('ignoredPrefixes strips multiple prefixes', () => {
  const sentinel = new CommitSentinel({ commits: { ignoredPrefixes: ['[A-Z]+-\\d+', '\\[team\\]'] } });
  const r = sentinel.validateCommit('[team] PROJ-123: Add login screen');
  assert(r.valid, JSON.stringify(r.errors));
});
test('ignoredPrefixes empty array does nothing', () => {
  const r = s.validateCommit('Add login screen');
  assert(r.valid, JSON.stringify(r.errors));
});

// ===========================================================================
// requiredPatterns
// ===========================================================================

console.log('\n\u2500\u2500 CommitSentinel: requiredPatterns \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n');

test('requiredPatterns rejects when pattern is missing', () => {
  const sentinel = new CommitSentinel({
    commits: { requiredPatterns: [{ pattern: '[A-Z]+-\\d+' }] },
  });
  const r = sentinel.validateCommit('Add login screen');
  assert(!r.valid);
  assert(r.errors.some(e => e.includes('pattern')), JSON.stringify(r.errors));
});
test('requiredPatterns accepts when pattern matches', () => {
  const sentinel = new CommitSentinel({
    commits: { requiredPatterns: [{ pattern: '[A-Z]+-\\d+' }] },
  });
  const r = sentinel.validateCommit('PROJ-123 Add login screen');
  assert(r.valid, JSON.stringify(r.errors));
});
test('requiredPatterns uses custom message', () => {
  const sentinel = new CommitSentinel({
    commits: { requiredPatterns: [{ pattern: 'JIRA-\\d+', message: 'Must include JIRA ticket' }] },
  });
  const r = sentinel.validateCommit('Add login screen');
  assert(!r.valid);
  assert(r.errors.includes('Must include JIRA ticket'), JSON.stringify(r.errors));
});
test('requiredPatterns checks multiple patterns', () => {
  const sentinel = new CommitSentinel({
    commits: { requiredPatterns: [
      { pattern: '[A-Z]+-\\d+' },
      { pattern: 'v\\d+' },
    ] },
  });
  const r = sentinel.validateCommit('PROJ-123 Add login screen');
  assert(!r.valid, 'should fail missing v-number');
  eq(r.errors.length, 1);
});

// ===========================================================================
// enabled / enforce flags
// ===========================================================================

console.log('\n\u2500\u2500 CommitSentinel: enabled / enforce flags \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n');

test('commits.enabled=false skips all commit checks', () => {
  const sentinel = new CommitSentinel({ commits: { enabled: false } });
  const r = sentinel.validateCommit('bad');
  assert(r.valid, JSON.stringify(r.errors));
});
test('commits.enforce=false returns enforced=false on failure', () => {
  const sentinel = new CommitSentinel({ commits: { enforce: false } });
  const r = sentinel.validateCommit('bad');
  assert(!r.valid);
  assert(!r.enforced, 'enforced should be false');
});
test('commits.enforce=true returns enforced=true on failure', () => {
  const r = s.validateCommit('bad');
  assert(!r.valid);
  assert(r.enforced, 'enforced should be true');
});
test('branches.enabled=false skips all branch checks', () => {
  const sentinel = new CommitSentinel({ branches: { enabled: false } });
  const r = sentinel.validateBranch('totally-wrong');
  assert(r.valid, JSON.stringify(r.errors));
});
test('branches.enforce=false returns enforced=false on failure', () => {
  const sentinel = new CommitSentinel({ branches: { enforce: false } });
  const r = sentinel.validateBranch('bad-branch');
  assert(!r.valid);
  assert(!r.enforced, 'enforced should be false');
});

// ===========================================================================
// Branch validation
// ===========================================================================

console.log('\n\u2500\u2500 CommitSentinel: branch validation \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n');

const bDefault = new CommitSentinel();

test('rejects branch without prefix separator', () => {
  const r = bDefault.validateBranch('my-branch');
  assert(!r.valid);
  assert(r.errors.some(e => e.includes('prefix')), JSON.stringify(r.errors));
});
test('rejects unknown branch prefix', () => {
  const r = bDefault.validateBranch('hotfix/1234-fix-it');
  assert(!r.valid);
  assert(r.errors.some(e => e.includes('not allowed')), JSON.stringify(r.errors));
});
test('rejects branch missing ticket number', () => {
  const r = bDefault.validateBranch('feature/add-login');
  assert(!r.valid);
  assert(r.errors.some(e => e.includes('ticket')), JSON.stringify(r.errors));
});
test('accepts valid branch with ticket + kebab-case', () => {
  const r = bDefault.validateBranch('feature/1234-add-login');
  assert(r.valid, JSON.stringify(r.errors));
});
test('accepts exempt branch "main"', () => {
  const r = bDefault.validateBranch('main');
  assert(r.valid, JSON.stringify(r.errors));
});
test('accepts exempt branch matching glob "release-*"', () => {
  const r = bDefault.validateBranch('release-2.0');
  assert(r.valid, JSON.stringify(r.errors));
});
test('rejects non-kebab-case description', () => {
  const r = bDefault.validateBranch('feature/1234-AddLogin');
  assert(!r.valid);
  assert(r.errors.some(e => e.includes('kebab-case')), JSON.stringify(r.errors));
});
test('accepts snake_case naming pattern', () => {
  const sentinel = new CommitSentinel({ branches: { namingPattern: 'snake_case' } });
  const r = sentinel.validateBranch('feature/1234-add_login_screen');
  assert(r.valid, JSON.stringify(r.errors));
});
test('rejects kebab-case in snake_case mode', () => {
  const sentinel = new CommitSentinel({ branches: { namingPattern: 'snake_case' } });
  const r = sentinel.validateBranch('feature/1234-add-login');
  assert(!r.valid);
  assert(r.errors.some(e => e.includes('snake_case')), JSON.stringify(r.errors));
});
test('namingPattern null skips naming check', () => {
  const sentinel = new CommitSentinel({ branches: { namingPattern: null } });
  const r = sentinel.validateBranch('feature/1234-AnYtHiNg-GoEs');
  assert(r.valid, JSON.stringify(r.errors));
});
test('requireTicketNumber false allows branches without ticket', () => {
  const sentinel = new CommitSentinel({ branches: { requireTicketNumber: false } });
  const r = sentinel.validateBranch('feature/add-login');
  assert(r.valid, JSON.stringify(r.errors));
});

test('tense imperative rejects past tense in branch description', () => {
  const sentinel = new CommitSentinel({ branches: { tense: 'imperative' } });
  const r = sentinel.validateBranch('feature/1234-added-login');
  assert(!r.valid);
  assert(r.errors.some(e => e.includes('verb tense')), JSON.stringify(r.errors));
  assert(r.suggestions.some(s => s.includes('add')), JSON.stringify(r.suggestions));
});
test('tense imperative accepts imperative branch description', () => {
  const sentinel = new CommitSentinel({ branches: { tense: 'imperative' } });
  const r = sentinel.validateBranch('feature/1234-add-login');
  assert(r.valid, JSON.stringify(r.errors));
});
test('tense past accepts past tense in branch description', () => {
  const sentinel = new CommitSentinel({ branches: { tense: 'past' } });
  const r = sentinel.validateBranch('feature/1234-added-login');
  assert(r.valid, JSON.stringify(r.errors));
});
test('tense null skips tense check on branches', () => {
  const sentinel = new CommitSentinel({ branches: { tense: null } });
  const r = sentinel.validateBranch('feature/1234-added-login');
  assert(r.valid, JSON.stringify(r.errors));
});
test('tense works with snake_case branches', () => {
  const sentinel = new CommitSentinel({ branches: { tense: 'imperative', namingPattern: 'snake_case' } });
  const r = sentinel.validateBranch('feature/1234-added_login');
  assert(!r.valid);
  assert(r.errors.some(e => e.includes('verb tense')), JSON.stringify(r.errors));
});

// ===========================================================================
// Scope validation
// ===========================================================================

console.log('\n\u2500\u2500 CommitSentinel: scope validation \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n');

test('scope.enabled=false skips all scope checks', () => {
  const sentinel = new CommitSentinel({ scope: { enabled: false, rules: [{ path: 'src/shared/**' }] } });
  const r = sentinel.validateScope(['src/shared/utils.ts', 'src/app.ts']);
  assert(r.valid, JSON.stringify(r.errors));
});

test('scope rejects mixed files when rule matches', () => {
  const sentinel = new CommitSentinel({
    scope: { enabled: true, rules: [{ path: 'src/shared/**' }] },
  });
  const r = sentinel.validateScope(['src/shared/utils.ts', 'src/app.ts']);
  assert(!r.valid);
  assert(r.errors.some(e => e.includes('separately')), JSON.stringify(r.errors));
});

test('scope accepts when only scoped files are staged', () => {
  const sentinel = new CommitSentinel({
    scope: { enabled: true, rules: [{ path: 'src/shared/**' }] },
  });
  const r = sentinel.validateScope(['src/shared/utils.ts', 'src/shared/types.ts']);
  assert(r.valid, JSON.stringify(r.errors));
});

test('scope accepts when no scoped files are staged', () => {
  const sentinel = new CommitSentinel({
    scope: { enabled: true, rules: [{ path: 'src/shared/**' }] },
  });
  const r = sentinel.validateScope(['src/app.ts', 'src/main.ts']);
  assert(r.valid, JSON.stringify(r.errors));
});

test('scope accepts empty file list', () => {
  const sentinel = new CommitSentinel({
    scope: { enabled: true, rules: [{ path: 'src/shared/**' }] },
  });
  const r = sentinel.validateScope([]);
  assert(r.valid, JSON.stringify(r.errors));
});

test('scope uses custom name in error messages', () => {
  const sentinel = new CommitSentinel({
    scope: { enabled: true, rules: [{ path: 'src/shared/**', name: 'shared code' }] },
  });
  const r = sentinel.validateScope(['src/shared/utils.ts', 'src/app.ts']);
  assert(!r.valid);
  assert(r.errors.some(e => e.includes('shared code')), JSON.stringify(r.errors));
});

test('scope uses custom message', () => {
  const sentinel = new CommitSentinel({
    scope: { enabled: true, rules: [{ path: 'lib/**', message: 'Keep lib changes isolated!' }] },
  });
  const r = sentinel.validateScope(['lib/core.ts', 'src/app.ts']);
  assert(!r.valid);
  assert(r.errors.includes('Keep lib changes isolated!'), JSON.stringify(r.errors));
});

test('scope checks multiple rules independently', () => {
  const sentinel = new CommitSentinel({
    scope: { enabled: true, rules: [
      { path: 'src/shared/**' },
      { path: 'db/**' },
    ] },
  });
  // Violates both rules
  const r = sentinel.validateScope(['src/shared/a.ts', 'db/migration.sql', 'src/app.ts']);
  assert(!r.valid);
  eq(r.errors.length, 2);
});

test('scope enforce=false returns enforced=false on failure', () => {
  const sentinel = new CommitSentinel({
    scope: { enabled: true, enforce: false, rules: [{ path: 'src/shared/**' }] },
  });
  const r = sentinel.validateScope(['src/shared/utils.ts', 'src/app.ts']);
  assert(!r.valid);
  assert(!r.enforced, 'enforced should be false');
});

test('scope enforce=true returns enforced=true on failure', () => {
  const sentinel = new CommitSentinel({
    scope: { enabled: true, enforce: true, rules: [{ path: 'src/shared/**' }] },
  });
  const r = sentinel.validateScope(['src/shared/utils.ts', 'src/app.ts']);
  assert(!r.valid);
  assert(r.enforced, 'enforced should be true');
});

test('scope provides helpful suggestion', () => {
  const sentinel = new CommitSentinel({
    scope: { enabled: true, rules: [{ path: 'src/shared/**', name: 'shared' }] },
  });
  const r = sentinel.validateScope(['src/shared/utils.ts', 'src/app.ts']);
  assert(r.suggestions.some(s => s.includes('shared')), JSON.stringify(r.suggestions));
});

test('formatScope includes file count', () => {
  const sentinel = new CommitSentinel({
    scope: { enabled: true, rules: [{ path: 'src/shared/**' }] },
  });
  const r = sentinel.validateScope(['src/shared/utils.ts', 'src/app.ts']);
  const out = sentinel.formatScope(['src/shared/utils.ts', 'src/app.ts'], r);
  assert(out.includes('2 staged file(s)'), 'expected file count in output: ' + out);
});

test('formatScope shows warning when enforce=false', () => {
  const sentinel = new CommitSentinel({
    scope: { enabled: true, enforce: false, rules: [{ path: 'src/shared/**' }] },
  });
  const r = sentinel.validateScope(['src/shared/utils.ts', 'src/app.ts']);
  const out = sentinel.formatScope(['src/shared/utils.ts', 'src/app.ts'], r);
  assert(out.includes('warning'), 'expected "warning" in output: ' + out);
});

test('formatScope shows blocked when enforce=true', () => {
  const sentinel = new CommitSentinel({
    scope: { enabled: true, enforce: true, rules: [{ path: 'src/shared/**' }] },
  });
  const r = sentinel.validateScope(['src/shared/utils.ts', 'src/app.ts']);
  const out = sentinel.formatScope(['src/shared/utils.ts', 'src/app.ts'], r);
  assert(out.includes('blocked'), 'expected "blocked" in output: ' + out);
});

// ===========================================================================
// Type-safety spot checks
// ===========================================================================

console.log('\n\u2500\u2500 TypeScript type safety \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n');

test('SentinelConfig accepts valid tense values', () => {
  const modes: Array<'imperative' | 'past' | 'present' | null> = ['imperative', 'past', 'present', null];
  modes.forEach(tense => {
    const sentinel = new CommitSentinel({ commits: { tense } });
    assert(sentinel instanceof CommitSentinel);
  });
});

test('SentinelConfig accepts valid case values', () => {
  const modes: Array<'sentence' | 'lower' | 'upper' | 'title' | 'camel' | null> =
    ['sentence', 'lower', 'upper', 'title', 'camel', null];
  modes.forEach(c => {
    const sentinel = new CommitSentinel({ commits: { case: c } });
    assert(sentinel instanceof CommitSentinel);
  });
});

test('ValidationResult has correct shape', () => {
  const r = s.validateCommit('Add something useful here');
  assert(typeof r.valid === 'boolean');
  assert(typeof r.enforced === 'boolean');
  assert(Array.isArray(r.errors));
  assert(Array.isArray(r.suggestions));
});

// ===========================================================================
// formatCommit / formatBranch
// ===========================================================================

console.log('\n\u2500\u2500 Formatting \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n');

test('formatCommit shows warning when enforce=false', () => {
  const sentinel = new CommitSentinel({ commits: { enforce: false } });
  const r = sentinel.validateCommit('bad');
  const out = sentinel.formatCommit('bad', r);
  assert(out.includes('warning'), 'expected "warning" in output: ' + out);
});
test('formatCommit shows blocked when enforce=true', () => {
  const r = s.validateCommit('bad');
  const out = s.formatCommit('bad', r);
  assert(out.includes('blocked'), 'expected "blocked" in output: ' + out);
});
test('formatBranch includes branch name', () => {
  const r = bDefault.validateBranch('bad-name');
  const out = bDefault.formatBranch('bad-name', r);
  assert(out.includes('bad-name'), 'expected branch name in output: ' + out);
});

// ===========================================================================
// Results
// ===========================================================================

console.log(`\n  ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
