#!/usr/bin/env node
'use strict';

/**
 * commit-sentinel CLI
 * 
 * Commands:
 *   commit-sentinel install        — installs the commit-msg git hook
 *   commit-sentinel uninstall      — removes the hook
 *   commit-sentinel validate "msg" — manually validate a message
 *   commit-sentinel init           — create a default .commit-sentinel.json
 *   commit-sentinel --help         — show help
 */

const fs = require('node:fs');
const path = require('node:path');
const { CommitSentinel, DEFAULT_CONFIG } = require('../dist/index');
const { loadConfig } = require('../dist/config-loader');

// Try to use chalk
let chalk;
try { chalk = require('chalk'); } catch { chalk = { green: s => s, red: s => s, yellow: s => s, bold: s => s, cyan: s => s, gray: s => s }; }

const [,, command, ...args] = process.argv;

function findGitRoot(startDir = process.cwd()) {
  let dir = startDir;
  while (true) {
    if (fs.existsSync(path.join(dir, '.git'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

/**
 * Resolve the git hooks directory, respecting core.hooksPath if configured.
 * Falls back to .git/hooks if not set.
 */
function resolveHooksDir(gitRoot) {
  try {
    const { execSync } = require('node:child_process');
    const hooksPath = execSync('git config core.hooksPath', { cwd: gitRoot, encoding: 'utf8' }).trim();
    if (hooksPath) {
      // hooksPath can be absolute or relative to gitRoot
      return path.isAbsolute(hooksPath) ? hooksPath : path.join(gitRoot, hooksPath);
    }
  } catch {
    // core.hooksPath not set — use default
  }
  return path.join(gitRoot, '.git', 'hooks');
}

function install() {
  const gitRoot = findGitRoot();
  if (!gitRoot) {
    console.error(chalk.red('✖  Not inside a git repository.'));
    process.exit(1);
  }

  const hooksDir = resolveHooksDir(gitRoot);
  if (!fs.existsSync(hooksDir)) fs.mkdirSync(hooksDir, { recursive: true });

  // --- commit-msg hook ---
  const commitHookPath = path.join(hooksDir, 'commit-msg');
  const commitHookBin  = path.resolve(__dirname, 'hook.js');

  installHook(commitHookPath, commitHookBin, '"$1"', 'commit-msg');

  // --- post-checkout hook (branch validation) ---
  const checkoutHookPath = path.join(hooksDir, 'post-checkout');
  const branchHookBin    = path.resolve(__dirname, 'branch-hook.js');

  installHook(checkoutHookPath, branchHookBin, '"$1" "$2" "$3"', 'post-checkout');

  console.log(chalk.gray('   Commits and branch names will now be validated.'));
}

function installHook(hookPath, hookBin, argsStr, hookName) {
  let hookContent;
  if (fs.existsSync(hookPath)) {
    const existing = fs.readFileSync(hookPath, 'utf8');
    if (existing.includes('commit-sentinel')) {
      console.log(chalk.yellow(`⚠  commit-sentinel ${hookName} hook already installed.`));
      return;
    }
    hookContent = existing.trimEnd() + `\n\nnode "${hookBin}" ${argsStr}\n`;
  } else {
    hookContent = `#!/bin/sh\nnode "${hookBin}" ${argsStr}\n`;
  }

  fs.writeFileSync(hookPath, hookContent, { mode: 0o755 });
  console.log(chalk.green(`✔  commit-sentinel ${hookName} hook installed at: `) + hookPath);
}

function uninstall() {
  const gitRoot = findGitRoot();
  if (!gitRoot) { console.error(chalk.red('✖  Not inside a git repository.')); process.exit(1); }

  const hooksDir = resolveHooksDir(gitRoot);

  let removed = false;
  for (const hookName of ['commit-msg', 'post-checkout']) {
    const hookPath = path.join(hooksDir, hookName);
    if (!fs.existsSync(hookPath)) continue;

    const content = fs.readFileSync(hookPath, 'utf8');
    if (!content.includes('commit-sentinel')) continue;

    const lines = content.split('\n');
    const filtered = lines.filter(l => !l.includes('commit-sentinel'));
    const newContent = filtered.join('\n').trim();

    if (newContent === '#!/bin/sh' || newContent === '') {
      fs.unlinkSync(hookPath);
    } else {
      fs.writeFileSync(hookPath, newContent + '\n');
    }

    console.log(chalk.green(`✔  commit-sentinel ${hookName} hook removed.`));
    removed = true;
  }

  if (!removed) {
    console.log(chalk.yellow('⚠  commit-sentinel is not installed in any hooks.'));
  }
}

function validate(message) {
  if (!message) { console.error(chalk.red('✖  Please provide a message to validate.')); process.exit(1); }
  const config = loadConfig();
  const sentinel = new CommitSentinel(config);
  const result = sentinel.validateCommit(message);
  const report = sentinel.formatCommit(message, result);

  if (result.valid) {
    console.log(chalk.green(report));
  } else if (!result.enforced) {
    console.log(chalk.yellow(report));
  } else {
    console.error(chalk.red(report));
    process.exit(1);
  }
}

function validateBranch(branchName) {
  if (!branchName) { console.error(chalk.red('✖  Please provide a branch name to validate.')); process.exit(1); }
  const config = loadConfig();
  const sentinel = new CommitSentinel(config);
  const result = sentinel.validateBranch(branchName);
  const report = sentinel.formatBranch(branchName, result);

  if (result.valid) {
    console.log(chalk.green(report));
  } else if (!result.enforced) {
    console.log(chalk.yellow(report));
  } else {
    console.error(chalk.red(report));
    process.exit(1);
  }
}

function init() {
  const configPath = path.join(process.cwd(), '.commit-sentinel.json');
  if (fs.existsSync(configPath)) {
    console.log(chalk.yellow('⚠  .commit-sentinel.json already exists.'));
    return;
  }
  fs.writeFileSync(configPath, JSON.stringify(DEFAULT_CONFIG, null, 2) + '\n');
  console.log(chalk.green('✔  Created .commit-sentinel.json with default config.'));
  console.log(chalk.gray('   Edit it to customise your commit message rules.'));
}

function help() {
  console.log(`
${chalk.bold('commit-sentinel')} — Enforce commit & branch conventions via git hooks

${chalk.bold('COMMANDS')}
  ${chalk.cyan('install')}              Install the commit-msg git hook in this repo
  ${chalk.cyan('uninstall')}            Remove the commit-sentinel hook
  ${chalk.cyan('validate')} ${chalk.gray('"message"')}   Manually validate a commit message
  ${chalk.cyan('validate-branch')} ${chalk.gray('"name"')} Manually validate a branch name
  ${chalk.cyan('init')}                 Create a default .commit-sentinel.json config file
  ${chalk.cyan('--help')}               Show this help

${chalk.bold('CONFIG')} (.commit-sentinel.json or package.json → "commitSentinel")

  ${chalk.bold('commits:')}
    ${chalk.yellow('enabled')}            Skip all commit checks when false (default: true)
    ${chalk.yellow('enforce')}            Block commit on failure when true, warn when false (default: true)
    ${chalk.yellow('tense')}              "imperative" | "past" | "present" | null
    ${chalk.yellow('case')}               "sentence" | "lower" | "upper" | "title" | "camel" | null
    ${chalk.yellow('minLength')}          Minimum subject length (default: 10)
    ${chalk.yellow('maxLength')}          Maximum subject length (default: 72)
    ${chalk.yellow('noTrailingPeriod')}   Disallow trailing period (default: true)
    ${chalk.yellow('noGenericMessages')}  Block generic messages like "fix" (default: true)
    ${chalk.yellow('requireType')}        Enforce conventional-commits type prefix (default: false)
    ${chalk.yellow('allowedTypes')}       Array of allowed type prefixes
    ${chalk.yellow('forbiddenWords')}     Array of forbidden words/phrases
    ${chalk.yellow('requireBlankLineAfterSubject')} Enforce blank line before body
    ${chalk.yellow('customPattern')}      Custom regex the subject must match

  ${chalk.bold('branches:')}
    ${chalk.yellow('enabled')}            Skip all branch checks when false (default: true)
    ${chalk.yellow('enforce')}            Block on failure when true, warn when false (default: true)
    ${chalk.yellow('allowedPrefixes')}    Allowed branch prefixes (default: ["feature","bugfix",...])
    ${chalk.yellow('requireTicketNumber')} Require a ticket number after the prefix (default: true)
    ${chalk.yellow('ticketPattern')}      Regex for matching the ticket number (default: "[0-9]{4,}")
    ${chalk.yellow('namingPattern')}      "kebab-case" | "snake_case" | null
    ${chalk.yellow('exempt')}             Branch names/globs that skip checks (default: ["main","rc",...])
`);
}

switch (command) {
  case 'install':         install(); break;
  case 'uninstall':       uninstall(); break;
  case 'validate':        validate(args.join(' ')); break;
  case 'validate-branch': validateBranch(args.join(' ')); break;
  case 'init':            init(); break;
  case '--help':
  case '-h':
  case undefined:         help(); break;
  default:
    console.error(chalk.red(`✖  Unknown command: ${command}`));
    help();
    process.exit(1);
}
