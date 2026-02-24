import { CommitSentinel }                        from './index';
import { detectTense, toImperative, toPresent, toPast } from './verb-tense';
import type { VerbTense }                        from './types';

let passed = 0;
let failed = 0;

function test(description: string, fn: () => void): void {
  try {
    fn();
    console.log(`  ✅ ${description}`);
    passed++;
  } catch (e) {
    console.error(`  ❌ ${description}`);
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

console.log('\n── detectTense ─────────────────────────────────────────\n');

// Imperatives
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
  test(`detectTense: "${word}" → ${expected}`, () => eq(detectTense(word), expected))
);

// Regular past
(
  [
    ['Added',      'past'],
    ['Removed',    'past'],
    ['Updated',    'past'],
    ['Refactored', 'past'],
    ['Fixed',      'past'],
  ] as [string, VerbTense][]
).forEach(([word, expected]) =>
  test(`detectTense: "${word}" → ${expected} (regular)`, () => eq(detectTense(word), expected))
);

// Irregular past — the key improvement over regex
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
  test(`detectTense: "${word}" → ${expected} (irregular)`, () => eq(detectTense(word), expected))
);

// Present
(
  [
    ['Writes', 'present'],
    ['Builds', 'present'],
    ['Adds',   'present'],
    ['Fixes',  'present'],
  ] as [string, VerbTense][]
).forEach(([word, expected]) =>
  test(`detectTense: "${word}" → ${expected}`, () => eq(detectTense(word), expected))
);

// Gerund
(
  [
    ['Adding',      'gerund'],
    ['Writing',     'gerund'],
    ['Refactoring', 'gerund'],
  ] as [string, VerbTense][]
).forEach(([word, expected]) =>
  test(`detectTense: "${word}" → ${expected}`, () => eq(detectTense(word), expected))
);

console.log('\n── toImperative ────────────────────────────────────────\n');

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
  test(`toImperative: "${input}" → "${expected}"`, () => eq(toImperative(input), expected))
);

console.log('\n── toPast / toPresent ──────────────────────────────────\n');

(
  [
    ['write', 'wrote'],
    ['build', 'built'],
    ['add',   'added'],
    ['fix',   'fixed'],
    ['run',   'ran'],
  ] as [string, string][]
).forEach(([input, expected]) =>
  test(`toPast: "${input}" → "${expected}"`, () => eq(toPast(input), expected))
);

(
  [
    ['write', 'writes'],
    ['fix',   'fixes'],
    ['add',   'adds'],
  ] as [string, string][]
).forEach(([input, expected]) =>
  test(`toPresent: "${input}" → "${expected}"`, () => eq(toPresent(input), expected))
);

// ===========================================================================
// CommitSentinel integration tests
// ===========================================================================

console.log('\n── CommitSentinel: irregular verb rejection ────────────\n');

const s = new CommitSentinel();

test('rejects "Wrote new parser" (irregular past)', () => {
  const r = s.validate('Wrote new parser for JSON handling');
  assert(!r.valid);
  assert(r.errors.some(e => e.includes('tense')));
});
test('rejects "Rebuilt auth module"', () => {
  const r = s.validate('Rebuilt the authentication module');
  assert(!r.valid);
  assert(r.errors.some(e => e.includes('tense')));
});
test('rejects "Made changes to config"', () => {
  const r = s.validate('Made changes to the configuration');
  assert(!r.valid);
  assert(r.errors.some(e => e.includes('tense')));
});
test('rejects "Broke down legacy code"', () => {
  const r = s.validate('Broke down legacy code into modules');
  assert(!r.valid);
  assert(r.errors.some(e => e.includes('tense')));
});
test('accepts "Rewrite the JSON parser"', () => {
  const r = s.validate('Rewrite the JSON parser for speed');
  assert(r.valid, JSON.stringify(r.errors));
});
test('accepts "Build Docker image on CI"', () => {
  const r = s.validate('Build Docker image on CI pipeline');
  assert(r.valid, JSON.stringify(r.errors));
});
test('accepts "Fix memory leak in renderer"', () => {
  const r = s.validate('Fix memory leak in renderer module');
  assert(r.valid, JSON.stringify(r.errors));
});

console.log('\n── CommitSentinel: existing rules ──────────────────────\n');

test('accepts valid imperative sentence-case message', () => {
  const r = s.validate('Add user authentication module');
  assert(r.valid, JSON.stringify(r.errors));
});
test('rejects regular past "Added"', () => {
  const r = s.validate('Added user authentication module');
  assert(!r.valid);
  assert(r.errors.some(e => e.includes('tense')));
});
test('rejects lowercase start', () => {
  const r = s.validate('add user authentication module');
  assert(!r.valid);
  assert(r.errors.some(e => e.includes('case')));
});
test('rejects trailing period', () => {
  const r = s.validate('Add user authentication module.');
  assert(!r.valid);
  assert(r.errors.some(e => e.includes('period')));
});
test('rejects too-short message', () => {
  const r = s.validate('Fix bug');
  assert(!r.valid);
  assert(r.errors.some(e => e.includes('short')));
});
test('rejects forbidden word WIP', () => {
  const r = s.validate('WIP: Add half-finished feature');
  assert(!r.valid);
  assert(r.errors.some(e => e.includes('forbidden')));
});

const cc = new CommitSentinel({ requireType: true, tense: 'imperative', case: 'lower' });

test('accepts conventional commit format', () => {
  const r = cc.validate('feat: add login screen');
  assert(r.valid, JSON.stringify(r.errors));
});
test('rejects unknown conventional commit type', () => {
  const r = cc.validate('hack: add something');
  assert(!r.valid);
  assert(r.errors.some(e => e.includes('Unknown type')));
});

console.log('\n── CommitSentinel: ignoredPrefixes ─────────────────────\n');

const ip = new CommitSentinel({
  tense: 'imperative',
  case: 'sentence',
  ignoredPrefixes: ['AB#\\d+'],
});

test('rejects lowercase after ignored prefix', () => {
  const r = ip.validate('AB#12345 commit code here now');
  assert(!r.valid, 'should fail: ' + JSON.stringify(r));
  assert(r.errors.some(e => e.includes('case')), JSON.stringify(r.errors));
});
test('suggestion includes ignored prefix for case fix', () => {
  const r = ip.validate('AB#12345 commit code here now');
  assert(r.suggestions.some(s => s.includes('AB#12345') && s.includes('Commit')),
    'suggestion should include prefix: ' + JSON.stringify(r.suggestions));
});
test('accepts sentence case after ignored prefix', () => {
  const r = ip.validate('AB#12345 Commit code here now');
  assert(r.valid, JSON.stringify(r.errors));
});
test('rejects past tense after ignored prefix', () => {
  const r = ip.validate('AB#12345 Added login screen');
  assert(!r.valid);
  assert(r.errors.some(e => e.includes('tense')), JSON.stringify(r.errors));
});
test('suggestion includes ignored prefix for tense fix', () => {
  const r = ip.validate('AB#12345 Added login screen');
  assert(r.suggestions.some(s => s.includes('AB#12345') && s.toLowerCase().includes('add')),
    'suggestion should include prefix: ' + JSON.stringify(r.suggestions));
});

const ipType = new CommitSentinel({
  requireType: true,
  allowedTypes: ['feat', 'fix', 'shared'],
  ignoredPrefixes: ['AB#\\d+'],
  tense: 'imperative',
  case: 'sentence',
});

test('strips type prefix + ignored prefix together', () => {
  const r = ipType.validate('SHARED: AB#12345 commit code here now');
  assert(!r.valid, 'should fail case: ' + JSON.stringify(r));
  assert(r.errors.some(e => e.includes('case')), JSON.stringify(r.errors));
});
test('suggestion includes type + ignored prefix', () => {
  const r = ipType.validate('SHARED: AB#12345 commit code here now');
  assert(r.suggestions.some(s => s.includes('SHARED:') && s.includes('AB#12345') && s.includes('Commit')),
    'suggestion should include full prefix: ' + JSON.stringify(r.suggestions));
});
test('accepts valid message after type + ignored prefix', () => {
  const r = ipType.validate('SHARED: AB#12345 Fix login for users');
  assert(r.valid, JSON.stringify(r.errors));
});
test('works with no matching prefix (no-op)', () => {
  const r = ip.validate('Fix the broken login screen');
  assert(r.valid, JSON.stringify(r.errors));
});

// Without requireType — both SHARED and ticket ref as ignoredPrefixes
const ipNoType = new CommitSentinel({
  tense: 'imperative',
  case: 'sentence',
  ignoredPrefixes: ['AB#\\d+', 'SHARED'],
});

test('strips SHARED: and ticket ref without requireType', () => {
  const r = ipNoType.validate('SHARED: AB#12345 commit code');
  assert(!r.valid, 'should fail case: ' + JSON.stringify(r));
  assert(r.errors.some(e => e.includes('case')), JSON.stringify(r.errors));
});
test('suggestion says "SHARED: AB#12345 Commit code" without requireType', () => {
  const r = ipNoType.validate('SHARED: AB#12345 commit code');
  const expected = 'SHARED: AB#12345 Commit code';
  assert(r.suggestions.some(s => s.includes(expected)),
    `expected suggestion containing "${expected}", got: ${JSON.stringify(r.suggestions)}`);
});
test('order of ignoredPrefixes does not matter', () => {
  const reversed = new CommitSentinel({
    tense: 'imperative',
    case: 'sentence',
    ignoredPrefixes: ['SHARED', 'AB#\\d+'],
  });
  const r = reversed.validate('SHARED: AB#12345 commit code');
  assert(!r.valid);
  assert(r.suggestions.some(s => s.includes('SHARED: AB#12345 Commit code')),
    JSON.stringify(r.suggestions));
});

console.log('\n── Suggestions ─────────────────────────────────────────\n');

test('suggests "Write" when "Wrote" is used', () => {
  const r = s.validate('Wrote new parser for JSON handling');
  assert(r.suggestions.some(s => s.toLowerCase().includes('write')), JSON.stringify(r.suggestions));
});
test('suggests "Build" when "Built" is used', () => {
  const r = s.validate('Built the Docker image pipeline');
  assert(r.suggestions.some(s => s.toLowerCase().includes('build')), JSON.stringify(r.suggestions));
});

// ===========================================================================
// Type-safety spot checks (these would be compile errors in TypeScript)
// ===========================================================================

console.log('\n── TypeScript type safety ───────────────────────────────\n');

test('SentinelConfig accepts valid tense values', () => {
  const modes: Array<'imperative' | 'past' | 'present' | null> = ['imperative', 'past', 'present', null];
  modes.forEach(tense => {
    const sentinel = new CommitSentinel({ tense });
    assert(sentinel instanceof CommitSentinel);
  });
});

test('SentinelConfig accepts valid case values', () => {
  const modes: Array<'sentence' | 'lower' | 'upper' | 'title' | 'camel' | null> =
    ['sentence', 'lower', 'upper', 'title', 'camel', null];
  modes.forEach(c => {
    const sentinel = new CommitSentinel({ case: c });
    assert(sentinel instanceof CommitSentinel);
  });
});

test('ValidationResult has correct shape', () => {
  const r = s.validate('Add something useful here');
  assert(typeof r.valid === 'boolean');
  assert(Array.isArray(r.errors));
  assert(Array.isArray(r.suggestions));
});

// ===========================================================================
// Results
// ===========================================================================

console.log(`\n  ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
