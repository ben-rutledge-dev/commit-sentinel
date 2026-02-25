#!/usr/bin/env node
'use strict';

/**
 * commit-sentinel-hook
 * Called by git as the commit-msg hook.
 * Usage: node hook.js <path-to-commit-msg-file>
 */

const fs = require('node:fs');
const readline = require('node:readline');
const { execSync } = require('node:child_process');
const { CommitSentinel } = require('../dist/index');
const { loadConfig } = require('../dist/config-loader');

// Try to use chalk
let chalk;
try { chalk = require('chalk'); } catch { chalk = null; }

const msgFile = process.argv[2];

if (!msgFile) {
  console.error('commit-sentinel: no commit message file provided');
  process.exit(1);
}

const rawMessage = fs.readFileSync(msgFile, 'utf8');

// Strip comment lines (lines starting with #)
const cleanMessage = rawMessage
  .split('\n')
  .filter(line => !line.startsWith('#'))
  .join('\n')
  .trim();

if (!cleanMessage) {
  console.error('commit-sentinel: empty commit message');
  process.exit(1);
}

const config = loadConfig();
const sentinel = new CommitSentinel(config);

let blocked  = false;
let commitWarning = null;   // { result, subject, suggestedMsg }

// --- Commit message validation ---
const commitResult = sentinel.validateCommit(cleanMessage);
if (!commitResult.valid) {
  printReport(sentinel.formatCommit(cleanMessage, commitResult));
  if (commitResult.enforced) {
    blocked = true;
  }

  // Extract the suggested message from suggestions (format: Try: "...")
  const subject = cleanMessage.split('\n')[0].trim();
  const suggestedMsg = extractSuggestion(commitResult.suggestions, subject);

  commitWarning = { result: commitResult, subject, suggestedMsg };
}

// --- Branch name validation ---
try {
  const branchName = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
  if (branchName && branchName !== 'HEAD') {
    const branchResult = sentinel.validateBranch(branchName);
    if (!branchResult.valid) {
      printReport(sentinel.formatBranch(branchName, branchResult));
      if (branchResult.enforced) blocked = true;
    }
  }
} catch {
  // Could not determine branch name — skip branch checks
}

// If any enforced check failed and there's no suggestion to offer, block
if (blocked && (!commitWarning || !commitWarning.suggestedMsg)) {
  process.exit(1);
}

// If there's a commit issue (enforced or not), show interactive options
if (commitWarning) {
  promptCommitAction(commitWarning).then(action => {
    if (action === 'suggested') {
      // Rewrite the commit message file with the suggestion
      const newContent = rawMessage.replace(commitWarning.subject, commitWarning.suggestedMsg);
      fs.writeFileSync(msgFile, newContent);
      const msg = chalk
        ? `\n  ${chalk.green('✔')}  Commit message updated to: ${chalk.cyan(commitWarning.suggestedMsg)}\n`
        : `\n  ✔  Commit message updated to: ${commitWarning.suggestedMsg}\n`;
      process.stderr.write(msg);
      process.exit(0);
    } else if (action === 'original') {
      process.exit(0);
    } else {
      process.exit(1);
    }
  }).catch(() => {
    // No TTY (CI) — let the commit through if not enforced, block if enforced
    process.exit(blocked ? 1 : 0);
  });
} else {
  process.exit(0);
}

/**
 * Extract the best suggested commit message from the suggestions array.
 * Looks for entries matching `Try: "..."` and returns the quoted content.
 */
function extractSuggestion(suggestions, originalSubject) {
  for (const s of suggestions) {
    const match = s.match(/^Try: "(.+)"$/);
    if (match && match[1] !== originalSubject) {
      return match[1];
    }
  }
  return null;
}

/**
 * Present numbered options to the user and return the chosen action.
 * Returns: 'suggested' | 'original' | 'abort'
 */
function promptCommitAction({ result, subject, suggestedMsg }) {
  return new Promise((resolve, reject) => {
    let ttyIn;
    try {
      ttyIn = fs.createReadStream('/dev/tty', { encoding: 'utf8' });
    } catch {
      return reject(new Error('No TTY available'));
    }

    const ttyOut = fs.createWriteStream('/dev/tty');
    const rl = readline.createInterface({ input: ttyIn, output: ttyOut });

    // Build options
    const options = [];
    if (suggestedMsg) {
      const label = chalk
        ? `Commit with suggested message ${chalk.green(`"${suggestedMsg}"`)}`
        : `Commit with suggested message "${suggestedMsg}"`;
      options.push({ label, action: 'suggested' });
    }
    if (!result.enforced) {
      const label = chalk
        ? `Commit with original message ${chalk.yellow(`"${subject}"`)}`
        : `Commit with original message "${subject}"`;
      options.push({ label, action: 'original' });
    }
    options.push({
      label: chalk ? chalk.red('Abort commit') : 'Abort commit',
      action: 'abort',
    });

    // Print options
    ttyOut.write('\n');
    options.forEach((opt, i) => {
      const num = chalk ? chalk.cyan(`${i + 1}`) : `${i + 1}`;
      ttyOut.write(`  ${num}) ${opt.label}\n`);
    });
    ttyOut.write('\n');

    const prompt = chalk
      ? `  ${chalk.yellow('?')}  Choose an option ${chalk.gray(`[1-${options.length}]`)}: `
      : `  ?  Choose an option [1-${options.length}]: `;

    rl.question(prompt, (answer) => {
      rl.close();
      ttyIn.destroy();
      ttyOut.destroy();

      const choice = parseInt((answer || '').trim(), 10);
      if (choice >= 1 && choice <= options.length) {
        resolve(options[choice - 1].action);
      } else {
        // Invalid input — treat as abort
        resolve('abort');
      }
    });
  });
}

function printReport(report) {
  if (chalk) {
    try {
      const coloured = report
        .replace(/❌/g, chalk.red('❌'))
        .replace(/⚠️/g, chalk.yellow('⚠️'))
        .replace(/✅/g, chalk.green('✅'))
        .replace(/💡/g, chalk.yellow('💡'))
        .replace(/• (.+)/g, (_, m) => `• ${chalk.red(m)}`)
        .replace(/Try: "(.+)"/g, (_, m) => `Try: "${chalk.green(m)}"`);
      process.stderr.write(coloured + '\n');
      return;
    } catch { /* fall through */ }
  }
  process.stderr.write(report + '\n');
}
