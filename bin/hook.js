#!/usr/bin/env node
'use strict';

/**
 * commit-sentinel-hook
 * Called by git as the commit-msg hook.
 * Usage: node hook.js <path-to-commit-msg-file>
 */

const fs = require('node:fs');
const path = require('node:path');
const { CommitSentinel } = require('../dist/index');
const { loadConfig } = require('../dist/config-loader');

const msgFile = process.argv[2];

if (!msgFile) {
  console.error('commit-sentinel: no commit message file provided');
  process.exit(1);
}

const message = fs.readFileSync(msgFile, 'utf8').trim();

// Strip comment lines (lines starting with #)
const cleanMessage = message
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
const result = sentinel.validate(cleanMessage);

if (!result.valid) {
  const report = sentinel.format(cleanMessage, result);

  // Use chalk if available for colour, otherwise plain
  try {
    const chalk = require('chalk');
    const coloured = report
      .replace(/❌/g, chalk.red('❌'))
      .replace(/✅/g, chalk.green('✅'))
      .replace(/💡/g, chalk.yellow('💡'))
      .replace(/• (.+)/g, (_, m) => `• ${chalk.red(m)}`)
      .replace(/Try: "(.+)"/g, (_, m) => `Try: "${chalk.green(m)}"`);
    process.stderr.write(coloured + '\n');
  } catch {
    process.stderr.write(report + '\n');
  }

  process.exit(1);
}

process.exit(0);
