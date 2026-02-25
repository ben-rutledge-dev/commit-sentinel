#!/usr/bin/env node
'use strict';

/**
 * commit-sentinel branch hook
 * Called by git as the post-checkout hook.
 *
 * post-checkout receives three args:
 *   $1 = previous HEAD ref
 *   $2 = new HEAD ref
 *   $3 = checkout type flag (1 = branch checkout, 0 = file checkout)
 *
 * We only validate on branch checkouts (flag === '1').
 *
 * Note: git may redirect stdout/stderr during hook execution, so all
 * output is written directly to /dev/tty to ensure visibility.
 */

const fs = require('node:fs');
const readline = require('node:readline');
const { execSync } = require('node:child_process');
const { CommitSentinel } = require('../dist/index');
const { loadConfig } = require('../dist/config-loader');

// Try to use chalk
let chalk;
try { chalk = require('chalk'); } catch { chalk = null; }

const checkoutFlag = process.argv[4]; // $3 from git

// Only run on branch checkouts, not file checkouts
if (checkoutFlag !== '1') {
  process.exit(0);
}

let branchName;
try {
  branchName = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
} catch {
  process.exit(0);
}

if (!branchName || branchName === 'HEAD') {
  process.exit(0);
}

const config = loadConfig();
const sentinel = new CommitSentinel(config);

const result = sentinel.validateBranch(branchName);

if (result.valid) {
  process.exit(0);
}

// Open /dev/tty for all output — git hooks may not have stdout/stderr
// connected to the terminal.
let tty;
try {
  tty = fs.openSync('/dev/tty', 'w');
} catch {
  // No TTY (CI, non-interactive) — fall back to stderr
  tty = null;
}

function writeOut(text) {
  if (tty !== null) {
    fs.writeSync(tty, text);
  } else {
    process.stderr.write(text);
  }
}

printReport(sentinel.formatBranch(branchName, result));

if (result.enforced) {
  const msg = chalk
    ? `  ${chalk.red('!')}  Rename this branch before committing: ${chalk.cyan('git branch -m <new-name>')}\n`
    : '  !  Rename this branch before committing: git branch -m <new-name>\n';
  writeOut(msg);
  promptRename().then(() => {
    if (tty !== null) fs.closeSync(tty);
    process.exit(0);
  }).catch(() => {
    if (tty !== null) fs.closeSync(tty);
    process.exit(0);
  });
} else {
  promptRename().then(() => {
    if (tty !== null) fs.closeSync(tty);
    process.exit(0);
  }).catch(() => {
    if (tty !== null) fs.closeSync(tty);
    process.exit(0);
  });
}

/**
 * Ask the user for a new branch name, validate it, and perform the rename.
 * Loops until the name is valid or the user cancels.
 */
function promptRename() {
  return new Promise((resolve, reject) => {
    let ttyIn;
    try {
      ttyIn = fs.createReadStream('/dev/tty', { encoding: 'utf8' });
    } catch {
      return reject(new Error('No TTY available'));
    }

    const ttyOut = fs.createWriteStream('/dev/tty');
    const rl = readline.createInterface({ input: ttyIn, output: ttyOut });

    function askName() {
      const prompt = chalk
        ? `  ${chalk.yellow('?')}  Enter new branch name ${chalk.gray('(leave empty to skip)')}${chalk.yellow(':')} `
        : '  ?  Enter new branch name (leave empty to skip): ';

      rl.question(prompt, (answer) => {
        const newName = (answer || '').trim();

        if (!newName) {
          rl.close();
          ttyIn.destroy();
          ttyOut.destroy();
          return resolve();
        }

        // Validate the proposed name
        const check = sentinel.validateBranch(newName);
        if (!check.valid) {
          writeOut('\n');
          printReport(sentinel.formatBranch(newName, check));
          askName(); // ask again
          return;
        }

        // Perform the rename
        try {
          execSync(`git branch -m "${newName}"`, { stdio: 'pipe' });
          const msg = chalk
            ? `\n  ${chalk.green('✔')}  Branch renamed to ${chalk.cyan(newName)}\n`
            : `\n  ✔  Branch renamed to ${newName}\n`;
          writeOut(msg);
        } catch (err) {
          const msg = chalk
            ? `\n  ${chalk.red('✖')}  Failed to rename: ${err.message}\n`
            : `\n  ✖  Failed to rename: ${err.message}\n`;
          writeOut(msg);
        }

        rl.close();
        ttyIn.destroy();
        ttyOut.destroy();
        resolve();
      });
    }

    askName();
  });
}

function printReport(report) {
  let text = report;
  if (chalk) {
    try {
      text = report
        .replace(/❌/g, chalk.red('❌'))
        .replace(/⚠️/g, chalk.yellow('⚠️'))
        .replace(/✅/g, chalk.green('✅'))
        .replace(/💡/g, chalk.yellow('💡'))
        .replace(/• (.+)/g, (_, m) => `• ${chalk.red(m)}`)
        .replace(/Try: "(.+)"/g, (_, m) => `Try: "${chalk.green(m)}"`);
    } catch { /* use uncoloured */ }
  }
  writeOut(text + '\n');
}
