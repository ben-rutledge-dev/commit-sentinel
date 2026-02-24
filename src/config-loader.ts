import fs   from 'node:fs';
import path from 'node:path';

import type { SentinelConfig } from './types';

/**
 * Walk up the directory tree from `startDir`, looking for:
 *   1. .commit-sentinel.json
 *   2. The "commitSentinel" key inside package.json
 *
 * Returns a partial config (merged with defaults inside CommitSentinel).
 */
export function loadConfig(startDir: string = process.cwd()): Partial<SentinelConfig> {
  let dir = startDir;

  while (true) {
    const configPath = path.join(dir, '.commit-sentinel.json');
    if (fs.existsSync(configPath)) {
      const raw = fs.readFileSync(configPath, 'utf8');
      return JSON.parse(raw) as Partial<SentinelConfig>;
    }

    const pkgPath = path.join(dir, 'package.json');
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8')) as Record<string, unknown>;
        if (pkg['commitSentinel']) {
          return pkg['commitSentinel'] as Partial<SentinelConfig>;
        }
      } catch {
        // malformed package.json — keep walking
      }
    }

    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  return {};
}
