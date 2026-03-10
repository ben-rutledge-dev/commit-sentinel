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

export type NamingPattern = 'kebab-case' | 'snake_case';

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
// Deep-partial utility (for consumer-facing config input)
// ---------------------------------------------------------------------------

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends (infer U)[]
    ? U[]
    : T[P] extends object
      ? DeepPartial<T[P]>
      : T[P];
};

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export interface CommitConfig {
  /** When false, all commit message checks are skipped. @default true */
  enabled: boolean;
  /** When false, checks run and print feedback but do not block the commit. @default true */
  enforce: boolean;
  /** Required verb tense for the first word. null = skip. @default 'imperative' */
  tense: TenseMode | null;
  /** Required casing. null = skip. @default 'sentence' */
  case: CaseMode | null;
  /** Minimum subject length. @default 10 */
  minLength: number;
  /** Maximum subject length. @default 72 */
  maxLength: number;
  /** Disallow trailing period. @default true */
  noTrailingPeriod: boolean;
  /** Block generic one-word messages like "fix" or "update". @default true */
  noGenericMessages: boolean;
  /** Require a Conventional Commits type prefix. @default false */
  requireType: boolean;
  /** Allowed type prefixes (when requireType is true). @default ['feat','fix',...] */
  allowedTypes: ConventionalCommitType[];
  /** Words/phrases that must not appear in the message. @default ['WIP','wip','fixup','FIXUP'] */
  forbiddenWords: string[];
  /** Regex patterns that are stripped from the subject before checks (ticket IDs, team tags, etc.). @default [] */
  ignoredPrefixes: string[];
  /** Regex patterns that must each match somewhere in the subject. @default [] */
  requiredPatterns: RequiredPattern[];
  /** Require a blank line between subject and body. @default false */
  requireBlankLineAfterSubject: boolean;
  /** Custom regex the subject must match (overrides other checks). @default null */
  customPattern: string | null;
}

export interface BranchConfig {
  /** When false, all branch name checks are skipped. @default true */
  enabled: boolean;
  /** When false, checks run and print feedback but do not block. @default true */
  enforce: boolean;
  /** Required verb tense for the first word of the description. null = skip. @default null */
  tense: TenseMode | null;
  /** Allowed branch prefixes (the part before /). @default ['feature','bugfix','task','test','tests'] */
  allowedPrefixes: string[];
  /** Whether a ticket number is required after the prefix. @default true */
  requireTicketNumber: boolean;
  /** Regex for matching the ticket portion of the branch name. @default '[0-9]{4,}' */
  ticketPattern: string;
  /** Naming convention for the description segment. null = skip. @default 'kebab-case' */
  namingPattern: NamingPattern | null;
  /** Branch names or glob patterns that bypass all checks. @default ['main','rc','qa','production','release-*'] */
  exempt: string[];
}

export interface ScopeRule {
  /** Glob or path prefix to match staged files against. */
  path: string;
  /** Human-readable label for this scope (used in error messages). @default the path */
  name?: string;
  /** Custom error message shown when files from this scope are mixed with others. */
  message?: string;
}

export interface ScopeConfig {
  /** When false, all scope checks are skipped. @default false */
  enabled: boolean;
  /** When false, checks run and print feedback but do not block the commit. @default true */
  enforce: boolean;
  /** Paths that must be committed in isolation (not mixed with other changes). @default [] */
  rules: ScopeRule[];
}

export interface SentinelConfig {
  commits: CommitConfig;
  branches: BranchConfig;
  scope: ScopeConfig;
}

// ---------------------------------------------------------------------------
// Validation result
// ---------------------------------------------------------------------------

export interface ValidationResult {
  /** Whether the check passed all configured rules. */
  valid: boolean;

  /** Whether failures should block the operation (config enforce = true). */
  enforced: boolean;

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

export interface RequiredPattern {
  /** Regex string to test against the commit subject. */
  pattern: string;
  /** Custom error message shown when the pattern does not match. */
  message?: string;
}

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
