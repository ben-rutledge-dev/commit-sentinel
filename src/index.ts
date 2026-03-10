/**
 * commit-sentinel — core validator
 */

import { detectTense, toImperative, toPresent, toPast } from './verb-tense';
import type {
  SentinelConfig,
  CommitConfig,
  BranchConfig,
  ScopeConfig,
  ValidationResult,
  TenseValidator,
  CaseValidator,
  TenseMode,
  CaseMode,
  NamingPattern,
  DeepPartial,
} from './types';

// ---------------------------------------------------------------------------
// Default config
// ---------------------------------------------------------------------------

export const DEFAULT_COMMIT_CONFIG: CommitConfig = {
  enabled:                      true,
  enforce:                      true,
  tense:                        'imperative',
  case:                         'sentence',
  minLength:                    10,
  maxLength:                    72,
  noTrailingPeriod:             true,
  noGenericMessages:            true,
  requireType:                  false,
  allowedTypes:                 ['feat','fix','docs','chore','refactor','test','style','perf','ci','build','revert'],
  forbiddenWords:               ['WIP', 'wip', 'fixup', 'FIXUP'],
  ignoredPrefixes:              [],
  requiredPatterns:             [],
  requireBlankLineAfterSubject: false,
  customPattern:                null,
};

export const DEFAULT_BRANCH_CONFIG: BranchConfig = {
  enabled:             true,
  enforce:             true,
  tense:               null,
  allowedPrefixes:     ['feature', 'bugfix', 'task', 'test', 'tests'],
  requireTicketNumber: true,
  ticketPattern:       '[0-9]{4,}',
  namingPattern:       'kebab-case',
  exempt:              ['main', 'rc', 'qa', 'production', 'release-*'],
};

export const DEFAULT_SCOPE_CONFIG: ScopeConfig = {
  enabled: false,
  enforce: true,
  rules:   [],
};

export const DEFAULT_CONFIG: SentinelConfig = {
  commits:  DEFAULT_COMMIT_CONFIG,
  branches: DEFAULT_BRANCH_CONFIG,
  scope:    DEFAULT_SCOPE_CONFIG,
};

// ---------------------------------------------------------------------------
// Tense validators
// ---------------------------------------------------------------------------

const TENSE_VALIDATORS: Record<TenseMode, TenseValidator> = {
  imperative: {
    test: (word, subject) => {
      const t = detectTense(word, subject);
      return t === 'imperative' || t === 'unknown';
    },
    description: 'imperative mood (e.g. "Add feature", "Fix bug", "Rewrite parser")',
    suggestion:  (word) => toImperative(word),
  },
  past: {
    test: (word, subject) => detectTense(word, subject) === 'past',
    description: 'past tense (e.g. "Added feature", "Fixed bug", "Rewrote parser")',
    suggestion:  (word) => toPast(word),
  },
  present: {
    test: (word, subject) => detectTense(word, subject) === 'present',
    description: 'present tense (e.g. "Adds feature", "Fixes bug", "Rewrites parser")',
    suggestion:  (word) => toPresent(word),
  },
};

// ---------------------------------------------------------------------------
// Case validators
// ---------------------------------------------------------------------------

const CASE_VALIDATORS: Record<CaseMode, CaseValidator> = {
  sentence: {
    test: (msg) => /^[A-Z]/.test(msg),
    fix:  (msg) => msg.charAt(0).toUpperCase() + msg.slice(1),
    description: 'Sentence case (first letter capitalised)',
  },
  lower: {
    test: (msg) => msg === msg.toLowerCase(),
    fix:  (msg) => msg.toLowerCase(),
    description: 'All lowercase',
  },
  upper: {
    test: (msg) => msg === msg.toUpperCase(),
    fix:  (msg) => msg.toUpperCase(),
    description: 'All UPPERCASE',
  },
  title: {
    test: (msg) => msg.split(' ').every(w => !w[0] || w[0] === w[0].toUpperCase()),
    fix:  (msg) => msg.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
    description: 'Title Case (Every Word Capitalised)',
  },
  camel: {
    test: (msg) => /^[a-z][a-zA-Z0-9]*$/.test(msg.split(' ')[0] ?? ''),
    fix:  (msg) => {
      const words = msg.split(' ');
      return (words[0]?.toLowerCase() ?? '') +
        words.slice(1).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');
    },
    description: 'camelCase',
  },
};

// ---------------------------------------------------------------------------
// Naming-pattern validators (for branch descriptions)
// ---------------------------------------------------------------------------

const NAMING_VALIDATORS: Record<NamingPattern, { test: (s: string) => boolean; description: string }> = {
  'kebab-case': {
    test: (s) => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(s),
    description: 'kebab-case (lowercase words separated by hyphens)',
  },
  'snake_case': {
    test: (s) => /^[a-z0-9]+(_[a-z0-9]+)*$/.test(s),
    description: 'snake_case (lowercase words separated by underscores)',
  },
};

// ---------------------------------------------------------------------------
// Glob matching helper (for branch exempt patterns)
// ---------------------------------------------------------------------------

function matchesGlob(text: string, pattern: string): boolean {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
  return new RegExp(`^${escaped}$`).test(text);
}

// ---------------------------------------------------------------------------
// CommitSentinel class
// ---------------------------------------------------------------------------

export class CommitSentinel {
  private readonly config: SentinelConfig;

  constructor(config: DeepPartial<SentinelConfig> = {}) {
    this.config = {
      commits:  { ...DEFAULT_COMMIT_CONFIG,  ...config.commits },
      branches: { ...DEFAULT_BRANCH_CONFIG, ...config.branches },
      scope:    { ...DEFAULT_SCOPE_CONFIG,   ...config.scope },
    };
  }

  /**
   * Validate a full commit message string.
   */
  validateCommit(rawMessage: string): ValidationResult {
    const cfg = this.config.commits;

    if (!cfg.enabled) {
      return { valid: true, enforced: cfg.enforce, errors: [], suggestions: [] };
    }

    const errors:      string[] = [];
    const suggestions: string[] = [];

    const lines   = rawMessage.trim().split('\n');
    const subject = lines[0].trim();

    // --- Custom pattern (short-circuit all other checks) ---
    if (cfg.customPattern) {
      const regex = new RegExp(cfg.customPattern);
      if (!regex.test(subject)) {
        errors.push(`Subject must match pattern: ${cfg.customPattern}`);
      }
      return { valid: errors.length === 0, enforced: cfg.enforce, errors, suggestions };
    }

    let workingSubject = subject;
    let strippedPrefix = '';

    // --- Ignored prefixes (ticket refs, team tags, etc.) ---
    if (cfg.ignoredPrefixes.length > 0) {
      let changed = true;
      while (changed) {
        changed = false;
        for (const pattern of cfg.ignoredPrefixes) {
          const match = workingSubject.match(new RegExp(`^(?:${pattern})[^a-zA-Z0-9]*`));
          if (match) {
            strippedPrefix += match[0];
            workingSubject = workingSubject.slice(match[0].length);
            changed = true;
          }
        }
      }
    }

    // --- Conventional Commits type prefix ---
    if (cfg.requireType) {
      const typeMatch = subject.match(/^([a-zA-Z]+)(\([^)]*\))?!?:\s(.+)$/);
      if (!typeMatch) {
        const types = cfg.allowedTypes.join(', ');
        errors.push(`Subject must start with a type prefix. Allowed types: ${types}`);
        suggestions.push(`Example: "feat: ${subject}" or "fix: ${subject}"`);
      } else {
        const typePrefix = typeMatch[1].toLowerCase();
        workingSubject   = typeMatch[3];
        strippedPrefix   = subject.slice(0, subject.length - typeMatch[3].length);

        if (!cfg.allowedTypes.includes(typePrefix)) {
          errors.push(`Unknown type "${typePrefix}". Allowed: ${cfg.allowedTypes.join(', ')}`);
        }
      }
    }

    // --- Length ---
    if (subject.length < cfg.minLength) {
      errors.push(`Subject too short (${subject.length} chars). Minimum: ${cfg.minLength}`);
    }
    if (subject.length > cfg.maxLength) {
      errors.push(`Subject too long (${subject.length} chars). Maximum: ${cfg.maxLength}`);
      suggestions.push(`Try: "${subject.slice(0, cfg.maxLength - 3)}..."`);
    }

    // --- No trailing period ---
    if (cfg.noTrailingPeriod && subject.endsWith('.')) {
      errors.push('Subject must not end with a period');
      suggestions.push(`Try: "${subject.slice(0, -1)}"`);
    }

    // --- Forbidden words ---
    for (const word of cfg.forbiddenWords) {
      if (subject.toLowerCase().includes(word.toLowerCase())) {
        errors.push(`Commit message contains forbidden word: "${word}"`);
      }
    }

    // --- Required patterns ---
    for (const entry of cfg.requiredPatterns) {
      const regex = new RegExp(entry.pattern);
      if (!regex.test(subject)) {
        const msg = entry.message ?? `Subject must match required pattern: ${entry.pattern}`;
        errors.push(msg);
      }
    }

    // --- Generic messages ---
    if (cfg.noGenericMessages) {
      const GENERIC = new Set(['update','fix','change','edit','stuff','things','misc','test','asdf','temp']);
      if (GENERIC.has(workingSubject.trim().toLowerCase())) {
        errors.push(`Commit message is too generic: "${workingSubject}". Be more descriptive.`);
      }
    }

    // --- Case ---
    // --- Tense ---
    // These are checked together so we can produce a single combined suggestion.
    let caseError  = false;
    let tenseError = false;
    let combinedFix = workingSubject;

    if (cfg.tense) {
      const firstWord = combinedFix.trim().split(/\s+/)[0] ?? '';
      if (firstWord && /^[a-zA-Z]/.test(firstWord)) {
        const tenseValidator = TENSE_VALIDATORS[cfg.tense];
        if (!tenseValidator.test(firstWord, workingSubject)) {
          const suggestedWord = tenseValidator.suggestion(firstWord);
          combinedFix = combinedFix.replace(firstWord, suggestedWord);
          errors.push(`Verb tense is wrong. Required: ${tenseValidator.description}`);
          tenseError = true;
        }
      }
    }

    if (cfg.case) {
      const caseValidator = CASE_VALIDATORS[cfg.case];
      if (!caseValidator.test(workingSubject)) {
        combinedFix = caseValidator.fix(combinedFix);
        errors.push(`Subject case is wrong. Required: ${caseValidator.description}`);
        caseError = true;
      }
    }

    if ((caseError || tenseError) && combinedFix !== workingSubject) {
      suggestions.push(`Try: "${strippedPrefix}${combinedFix}"`);
    }

    // --- Blank line after subject ---
    if (cfg.requireBlankLineAfterSubject && lines.length > 1) {
      if ((lines[1] ?? '').trim() !== '') {
        errors.push('There must be a blank line between the subject and body');
        suggestions.push(`Try:\n  ${lines[0]}\n  \n  ${lines.slice(1).join('\n  ')}`);
      }
    }

    return { valid: errors.length === 0, enforced: cfg.enforce, errors, suggestions };
  }

  /**
   * Validate a branch name against the configured rules.
   */
  validateBranch(branchName: string): ValidationResult {
    const cfg = this.config.branches;

    if (!cfg.enabled) {
      return { valid: true, enforced: cfg.enforce, errors: [], suggestions: [] };
    }

    const errors:      string[] = [];
    const suggestions: string[] = [];

    // Exempt branches bypass all checks
    if (cfg.exempt.some(pattern => matchesGlob(branchName, pattern))) {
      return { valid: true, enforced: cfg.enforce, errors: [], suggestions: [] };
    }

    // Parse prefix/remainder
    const slashIdx = branchName.indexOf('/');
    if (slashIdx === -1) {
      errors.push(
        `Branch "${branchName}" must use a prefix followed by "/". ` +
        `Allowed: ${cfg.allowedPrefixes.join(', ')}`,
      );
      return { valid: false, enforced: cfg.enforce, errors, suggestions };
    }

    const prefix    = branchName.slice(0, slashIdx);
    let   remainder = branchName.slice(slashIdx + 1);

    if (!cfg.allowedPrefixes.includes(prefix)) {
      errors.push(
        `Branch prefix "${prefix}" is not allowed. Allowed: ${cfg.allowedPrefixes.join(', ')}`,
      );
      suggestions.push(`Try: "${cfg.allowedPrefixes[0]}/${remainder}"`);
    }

    if (!remainder) {
      errors.push('Branch name must have content after the prefix');
      return { valid: errors.length === 0, enforced: cfg.enforce, errors, suggestions };
    }

    // Ticket number
    if (cfg.requireTicketNumber) {
      const ticketRegex = new RegExp(`^(${cfg.ticketPattern})`);
      const ticketMatch = remainder.match(ticketRegex);
      if (!ticketMatch) {
        errors.push(`Branch must include a ticket number matching: ${cfg.ticketPattern}`);
        suggestions.push(`Try: "${prefix}/1234-${remainder}"`);
      } else {
        remainder = remainder.slice(ticketMatch[0].length).replace(/^[-_/]/, '');
      }
    }

    // Naming pattern on the description segment
    if (cfg.namingPattern && remainder.length > 0) {
      const validator = NAMING_VALIDATORS[cfg.namingPattern];
      if (!validator.test(remainder)) {
        errors.push(`Branch description "${remainder}" must be ${validator.description}`);
      }
    }

    // Tense check on the first word of the description
    if (cfg.tense && remainder.length > 0) {
      const separator = cfg.namingPattern === 'snake_case' ? '_' : /[-_]/;
      const firstWord = remainder.split(separator)[0] ?? '';
      if (firstWord && /^[a-zA-Z]/.test(firstWord)) {
        const tenseValidator = TENSE_VALIDATORS[cfg.tense];
        if (!tenseValidator.test(firstWord)) {
          const suggested = tenseValidator.suggestion(firstWord);
          errors.push(`Branch description verb tense is wrong. Required: ${tenseValidator.description}`);
          suggestions.push(`First word "${firstWord}" should be "${suggested}"`);
        }
      }
    }

    return { valid: errors.length === 0, enforced: cfg.enforce, errors, suggestions };
  }

  /**
   * Validate a list of staged file paths against scope-isolation rules.
   * Each rule defines a path pattern that must not be mixed with other changes.
   */
  validateScope(files: string[]): ValidationResult {
    const cfg = this.config.scope;

    if (!cfg.enabled) {
      return { valid: true, enforced: cfg.enforce, errors: [], suggestions: [] };
    }

    const errors:      string[] = [];
    const suggestions: string[] = [];

    if (files.length === 0) {
      return { valid: true, enforced: cfg.enforce, errors: [], suggestions: [] };
    }

    for (const rule of cfg.rules) {
      const matching    = files.filter(f => matchesGlob(f, rule.path));
      const notMatching = files.filter(f => !matchesGlob(f, rule.path));

      if (matching.length > 0 && notMatching.length > 0) {
        const label = rule.name ?? rule.path;
        const msg = rule.message
          ?? `Files in "${label}" must be committed separately — do not mix with other changes`;
        errors.push(msg);
        suggestions.push(
          `Stage only the ${label} files, or commit the other changes first`,
        );
      }
    }

    return { valid: errors.length === 0, enforced: cfg.enforce, errors, suggestions };
  }

  /**
   * Format a human-readable terminal report for a commit validation result.
   */
  formatCommit(message: string, result: ValidationResult): string {
    return this._format('Commit', message.split('\n')[0], result);
  }

  /**
   * Format a human-readable terminal report for a branch validation result.
   */
  formatBranch(branchName: string, result: ValidationResult): string {
    return this._format('Branch', branchName, result);
  }

  /**
   * Format a human-readable terminal report for a scope validation result.
   */
  formatScope(files: string[], result: ValidationResult): string {
    const summary = `${files.length} staged file(s)`;
    return this._format('Scope', summary, result);
  }

  /** @internal */
  private _format(kind: string, label: string, result: ValidationResult): string {
    const lines: string[] = [''];
    if (result.valid) {
      lines.push(`  \u2705  ${kind} looks good!`);
    } else {
      const verb = result.enforced ? 'blocked' : 'warning';
      const icon = result.enforced ? '\u274C' : '\u26A0\uFE0F';
      lines.push(`  ${icon}  ${kind} ${verb} by commit-sentinel\n`);
      lines.push(`  ${kind}: "${label}"\n`);
      result.errors.forEach(e => lines.push(`  \u2022 ${e}`));
      if (result.suggestions.length > 0) {
        lines.push('\n  \uD83D\uDCA1 Suggestions:');
        result.suggestions.forEach(s => lines.push(`     ${s}`));
      }
      lines.push('');
      lines.push('  Run `commit-sentinel --help` for config options.');
    }
    lines.push('');
    return lines.join('\n');
  }
}

// Re-export types so consumers can import everything from one place
export type {
  SentinelConfig,
  CommitConfig,
  BranchConfig,
  ScopeConfig,
  ScopeRule,
  ValidationResult,
  RequiredPattern,
  VerbTense,
  TenseMode,
  CaseMode,
  NamingPattern,
  DeepPartial,
} from './types';
