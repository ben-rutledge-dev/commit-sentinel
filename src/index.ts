/**
 * commit-sentinel — core validator
 */

import { detectTense, toImperative, toPresent, toPast } from './verb-tense';
import type {
  SentinelConfig,
  ValidationResult,
  TenseValidator,
  CaseValidator,
  TenseMode,
  CaseMode,
} from './types';

// ---------------------------------------------------------------------------
// Default config
// ---------------------------------------------------------------------------

export const DEFAULT_CONFIG: SentinelConfig = {
  tense:                        'imperative',
  case:                         'sentence',
  minLength:                    10,
  maxLength:                    72,
  noTrailingPeriod:             true,
  noGenericMessages:            true,
  requireType:                  false,
  allowedTypes:                 ['feat','fix','docs','chore','refactor','test','style','perf','ci','build','revert'],
  scopePattern:                 null,
  forbiddenWords:               ['WIP', 'wip', 'fixup', 'FIXUP'],
  ignoredPrefixes:              [],
  requireBlankLineAfterSubject: false,
  customPattern:                null,
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
// CommitSentinel class
// ---------------------------------------------------------------------------

export class CommitSentinel {
  private readonly config: SentinelConfig;

  constructor(config: Partial<SentinelConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Validate a full commit message string.
   */
  validate(rawMessage: string): ValidationResult {
    const errors:      string[] = [];
    const suggestions: string[] = [];

    const lines   = rawMessage.trim().split('\n');
    const subject = lines[0].trim();

    // --- Custom pattern (short-circuit all other checks) ---
    if (this.config.customPattern) {
      const regex = new RegExp(this.config.customPattern);
      if (!regex.test(subject)) {
        errors.push(`Subject must match pattern: ${this.config.customPattern}`);
      }
      return { valid: errors.length === 0, errors, suggestions };
    }

    let workingSubject = subject;
    let typePrefix: string | null = null;
    let strippedPrefix = '';                // accumulates type + ignored prefix text

    // --- Conventional Commits type prefix ---
    if (this.config.requireType) {
      const typeMatch = subject.match(/^([a-zA-Z]+)(\([^)]*\))?!?:\s(.+)$/);
      if (!typeMatch) {
        const types = this.config.allowedTypes.join(', ');
        errors.push(`Subject must start with a type prefix. Allowed types: ${types}`);
        suggestions.push(`Example: "feat: ${subject}" or "fix: ${subject}"`);
      } else {
        typePrefix     = typeMatch[1].toLowerCase();
        const scope    = typeMatch[2];
        workingSubject = typeMatch[3];
        strippedPrefix = subject.slice(0, subject.length - typeMatch[3].length);

        if (!this.config.allowedTypes.includes(typePrefix)) {
          errors.push(`Unknown type "${typePrefix}". Allowed: ${this.config.allowedTypes.join(', ')}`);
        }

        if (this.config.scopePattern && scope) {
          const scopeContent = scope.slice(1, -1);
          if (!new RegExp(this.config.scopePattern).test(scopeContent)) {
            errors.push(`Scope "${scopeContent}" must match pattern: ${this.config.scopePattern}`);
          }
        }
      }
    }

    // --- Ignored prefixes (ticket refs, team tags, etc.) ---
    // Loops until no pattern matches, so config order doesn't matter.
    // After each match, trailing non-alphanumeric chars (: - / etc.) are
    // consumed so patterns don't need to include delimiters.
    if (this.config.ignoredPrefixes.length > 0) {
      let changed = true;
      while (changed) {
        changed = false;
        for (const pattern of this.config.ignoredPrefixes) {
          const match = workingSubject.match(new RegExp(`^(?:${pattern})[^a-zA-Z0-9]*`));
          if (match) {
            strippedPrefix += match[0];
            workingSubject = workingSubject.slice(match[0].length);
            changed = true;
          }
        }
      }
    }

    // --- Length ---
    const subjectLength = subject.length;
    if (subjectLength < this.config.minLength) {
      errors.push(`Subject too short (${subjectLength} chars). Minimum: ${this.config.minLength}`);
    }
    if (subjectLength > this.config.maxLength) {
      errors.push(`Subject too long (${subjectLength} chars). Maximum: ${this.config.maxLength}`);
      suggestions.push(`Try: "${subject.slice(0, this.config.maxLength - 3)}..."`);
    }

    // --- No trailing period ---
    if (this.config.noTrailingPeriod && subject.endsWith('.')) {
      errors.push('Subject must not end with a period');
      suggestions.push(`Try: "${subject.slice(0, -1)}"`);
    }

    // --- Forbidden words ---
    for (const word of this.config.forbiddenWords) {
      if (subject.toLowerCase().includes(word.toLowerCase())) {
        errors.push(`Commit message contains forbidden word: "${word}"`);
      }
    }

    // --- Generic messages ---
    if (this.config.noGenericMessages) {
      const GENERIC = new Set(['update','fix','change','edit','stuff','things','misc','test','asdf','temp']);
      if (GENERIC.has(workingSubject.trim().toLowerCase())) {
        errors.push(`Commit message is too generic: "${workingSubject}". Be more descriptive.`);
      }
    }

    // --- Case ---
    if (this.config.case) {
      const caseValidator = CASE_VALIDATORS[this.config.case];
      if (!caseValidator.test(workingSubject)) {
        errors.push(`Subject case is wrong. Required: ${caseValidator.description}`);
        suggestions.push(`Try: "${strippedPrefix}${caseValidator.fix(workingSubject)}"`);
      }
    }

    // --- Tense ---
    if (this.config.tense) {
      const firstWord = workingSubject.trim().split(/\s+/)[0] ?? '';
      if (firstWord && /^[a-zA-Z]/.test(firstWord)) {
        const tenseValidator = TENSE_VALIDATORS[this.config.tense];
        if (!tenseValidator.test(firstWord, workingSubject)) {
          const suggestedWord  = tenseValidator.suggestion(firstWord);
          const fixedSubject   = workingSubject.replace(firstWord, suggestedWord);
          errors.push(`Verb tense is wrong. Required: ${tenseValidator.description}`);
          suggestions.push(`Try: "${strippedPrefix}${fixedSubject}"`);
        }
      }
    }

    // --- Blank line after subject ---
    if (this.config.requireBlankLineAfterSubject && lines.length > 1) {
      if ((lines[1] ?? '').trim() !== '') {
        errors.push('There must be a blank line between the subject and body');
        suggestions.push(`Try:\n  ${lines[0]}\n  \n  ${lines.slice(1).join('\n  ')}`);
      }
    }

    return { valid: errors.length === 0, errors, suggestions };
  }

  /**
   * Format a human-readable terminal report for a validation result.
   */
  format(message: string, result: ValidationResult): string {
    const lines: string[] = [''];
    if (result.valid) {
      lines.push('  ✅  Commit message looks good!');
    } else {
      lines.push('  ❌  Commit blocked by commit-sentinel\n');
      lines.push(`  Message: "${message.split('\n')[0]}"\n`);
      result.errors.forEach(e => lines.push(`  • ${e}`));
      if (result.suggestions.length > 0) {
        lines.push('\n  💡 Suggestions:');
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
export type { SentinelConfig, ValidationResult, VerbTense, TenseMode, CaseMode } from './types';
