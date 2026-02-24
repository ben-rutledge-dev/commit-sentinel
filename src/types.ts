/**
 * commit-sentinel — shared types
 */

// ---------------------------------------------------------------------------
// Tense / form detection
// ---------------------------------------------------------------------------

export type VerbTense = 'imperative' | 'past' | 'present' | 'gerund' | 'unknown';

export type TenseMode = 'imperative' | 'past' | 'present';

export type CaseMode =
  | 'sentence'
  | 'lower'
  | 'upper'
  | 'title'
  | 'camel';

export type ConventionalCommitType =
  | 'feat'
  | 'fix'
  | 'docs'
  | 'chore'
  | 'refactor'
  | 'test'
  | 'style'
  | 'perf'
  | 'ci'
  | 'build'
  | 'revert'
  | string; // allow custom types

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export interface SentinelConfig {
  /**
   * Required verb tense for the first word of the commit subject.
   * Set to null to skip tense checking entirely.
   * @default 'imperative'
   */
  tense: TenseMode | null;

  /**
   * Required casing for the subject line (or the part after the type prefix).
   * Set to null to skip case checking.
   * @default 'sentence'
   */
  case: CaseMode | null;

  /**
   * Minimum allowed length for the subject line (including any type prefix).
   * @default 10
   */
  minLength: number;

  /**
   * Maximum allowed length for the subject line.
   * The widely-accepted git convention is 72 characters.
   * @default 72
   */
  maxLength: number;

  /**
   * Whether to disallow a trailing period on the subject line.
   * @default true
   */
  noTrailingPeriod: boolean;

  /**
   * Whether to reject single-word generic messages like "fix", "update", "stuff".
   * @default true
   */
  noGenericMessages: boolean;

  /**
   * When true, the subject must start with a Conventional Commits type prefix
   * e.g. "feat: ", "fix(scope): ", "chore!: ".
   * @default false
   */
  requireType: boolean;

  /**
   * The set of allowed type prefixes. Only relevant when requireType is true.
   * @default ['feat','fix','docs','chore','refactor','test','style','perf','ci','build','revert']
   */
  allowedTypes: ConventionalCommitType[];

  /**
   * A regex string the scope must match (e.g. "^[a-z-]+$").
   * Only checked when requireType is true and a scope is present.
   * @default null
   */
  scopePattern: string | null;

  /**
   * Words or phrases that must not appear anywhere in the commit message.
   * @default ['WIP', 'wip', 'fixup', 'FIXUP']
   */
  forbiddenWords: string[];

  /**
   * Regex patterns for prefixes to strip from the subject before running
   * case / tense checks. Each pattern is matched at the start of the
   * working subject (after any Conventional Commits type has been removed)
   * and stripped left-to-right.
   *
   * Useful for ticket references, team tags, etc.
   * e.g. ["AB#\\d+\\s*"] strips "AB#12345 " from the front.
   * @default []
   */
  ignoredPrefixes: string[];

  /**
   * When true, a blank line is required between the subject and the body.
   * @default false
   */
  requireBlankLineAfterSubject: boolean;

  /**
   * Regex patterns that must each match somewhere in the commit subject.
   * Useful for enforcing version numbers, ticket IDs, etc.
   *
   * Each entry is an object with:
   *   - `pattern`: a regex string to test against the subject
   *   - `message`: (optional) custom error message shown on failure
   *
   * e.g. [{ "pattern": "[A-Z]+-\\d+", "message": "Must include a Jira ticket (e.g. PROJ-123)" }]
   * @default []
   */
  requiredPatterns: RequiredPattern[];

  /**
   * A custom regex string the subject line must match. When provided, all
   * other checks except forbiddenWords are bypassed.
   * @default null
   */
  customPattern: string | null;
}

// ---------------------------------------------------------------------------
// Validation result
// ---------------------------------------------------------------------------

export interface ValidationResult {
  /** Whether the commit message passed all configured rules. */
  valid: boolean;

  /** Human-readable descriptions of each rule violation. */
  errors: string[];

  /**
   * Suggested corrected versions of the message.
   * There may be zero, one, or several suggestions.
   */
  suggestions: string[];
}

// ---------------------------------------------------------------------------
// Internal verb-tense types
// ---------------------------------------------------------------------------

export interface IrregularVerbForms {
  past: string;
  pp: string;   // past participle
  p3: string;   // third-person singular present
}

export interface ReverseLookupEntry {
  base: string;
  form: 'past' | 'present';
}

export interface TenseValidator {
  test: (word: string, subject?: string) => boolean;
  description: string;
  suggestion: (word: string) => string;
}

export interface CaseValidator {
  test: (msg: string) => boolean;
  fix: (msg: string) => string;
  description: string;
}

export interface RequiredPattern {
  /** Regex string to test against the commit subject. */
  pattern: string;
  /** Custom error message shown when the pattern does not match. */
  message?: string;
}
