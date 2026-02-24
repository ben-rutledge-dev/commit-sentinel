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

function install() {
  const gitRoot = findGitRoot();
  if (!gitRoot) {
    console.error(chalk.red('✖  Not inside a git repository.'));
    process.exit(1);
  }

  const hooksDir = path.join(gitRoot, '.git', 'hooks');
  if (!fs.existsSync(hooksDir)) fs.mkdirSync(hooksDir, { recursive: true });

  const hookPath = path.join(hooksDir, 'commit-msg');
  const hookBin = path.resolve(__dirname, 'hook.js');

  // Preserve any existing hook by chaining
  let hookContent;
  if (fs.existsSync(hookPath)) {
    const existing = fs.readFileSync(hookPath, 'utf8');
    if (existing.includes('commit-sentinel')) {
      console.log(chalk.yellow('⚠  commit-sentinel hook already installed.'));
      return;
    }
    // Chain after existing hook
    hookContent = existing.trimEnd() + `\n\nnode "${hookBin}" "$1"\n`;
  } else {
    hookContent = `#!/bin/sh\nnode "${hookBin}" "$1"\n`;
  }

  fs.writeFileSync(hookPath, hookContent, { mode: 0o755 });
  console.log(chalk.green('✔  commit-sentinel hook installed at: ') + hookPath);
  console.log(chalk.gray('   Every commit message will now be validated.'));
}

function uninstall() {
  const gitRoot = findGitRoot();
  if (!gitRoot) { console.error(chalk.red('✖  Not inside a git repository.')); process.exit(1); }

  const hookPath = path.join(gitRoot, '.git', 'hooks', 'commit-msg');
  if (!fs.existsSync(hookPath)) {
    console.log(chalk.yellow('⚠  No commit-msg hook found.'));
    return;
  }

  const content = fs.readFileSync(hookPath, 'utf8');
  if (!content.includes('commit-sentinel')) {
    console.log(chalk.yellow('⚠  commit-sentinel is not installed in the current hook.'));
    return;
  }

  // Remove sentinel lines
  const lines = content.split('\n');
  const filtered = lines.filter(l => !l.includes('commit-sentinel'));
  const newContent = filtered.join('\n').trim();

  if (newContent === '#!/bin/sh' || newContent === '') {
    fs.unlinkSync(hookPath);
  } else {
    fs.writeFileSync(hookPath, newContent + '\n');
  }

  console.log(chalk.green('✔  commit-sentinel hook removed.'));
}

function validate(message) {
  if (!message) { console.error(chalk.red('✖  Please provide a message to validate.')); process.exit(1); }
  const config = loadConfig();
  const sentinel = new CommitSentinel(config);
  const result = sentinel.validate(message);
  const report = sentinel.format(message, result);

  if (result.valid) {
    console.log(chalk.green(report));
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
${chalk.bold('commit-sentinel')} — Enforce commit message conventions via git hooks

${chalk.bold('COMMANDS')}
  ${chalk.cyan('install')}              Install the commit-msg git hook in this repo
  ${chalk.cyan('uninstall')}            Remove the commit-sentinel hook
  ${chalk.cyan('validate')} ${chalk.gray('"message"')}   Manually validate a commit message
  ${chalk.cyan('init')}                 Create a default .commit-sentinel.json config file
  ${chalk.cyan('--help')}               Show this help

${chalk.bold('CONFIG')} (.commit-sentinel.json or package.json → "commitSentinel")
  ${chalk.yellow('tense')}              "imperative" | "past" | "present" | null
  ${chalk.yellow('case')}               "sentence" | "lower" | "upper" | "title" | "camel" | null
  ${chalk.yellow('minLength')}          Minimum subject length (default: 10)
  ${chalk.yellow('maxLength')}          Maximum subject length (default: 72)
  ${chalk.yellow('noTrailingPeriod')}   Disallow trailing period (default: true)
  ${chalk.yellow('noGenericMessages')}  Block generic messages like "fix" (default: true)
  ${chalk.yellow('requireType')}        Enforce conventional-commits type prefix (default: false)
  ${chalk.yellow('allowedTypes')}       Array of allowed type prefixes
  ${chalk.yellow('scopePattern')}       Regex string for scope validation
  ${chalk.yellow('forbiddenWords')}     Array of forbidden words/phrases
  ${chalk.yellow('requireBlankLineAfterSubject')} Enforce blank line before body
  ${chalk.yellow('customPattern')}      Custom regex the subject must match

${chalk.bold('EXAMPLE CONFIG')}
  {
    "tense": "imperative",
    "case": "sentence",
    "maxLength": 72,
    "requireType": true,
    "allowedTypes": ["feat", "fix", "docs", "chore"]
  }
`);
}

switch (command) {
  case 'install':   install(); break;
  case 'uninstall': uninstall(); break;
  case 'validate':  validate(args.join(' ')); break;
  case 'init':      init(); break;
  case '--help':
  case '-h':
  case undefined:   help(); break;
  default:
    console.error(chalk.red(`✖  Unknown command: ${command}`));
    help();
    process.exit(1);
}
