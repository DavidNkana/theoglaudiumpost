/**
 * Ensures no runtime/config source files reference the legacy Laudiumbiz domain.
 * Run: node test-no-legacy-laudiumbiz-url.js
 */
import fs from 'fs';
import path from 'path';

const LEGACY = 'https://lna.abc.co.zm/Laudiumbiz/';

const EXCLUDE_DIRS = new Set([
  'node_modules',
  'dist',
  'dev-dist',
  'android', // contains built web assets for Capacitor
  'ios',     // may contain built assets
]);

const INCLUDE_EXTS = new Set(['.js', '.ts', '.vue', '.json', '.env', '.md', '.html', '.mjs', '.cjs']);

function shouldScanFile(file) {
  const ext = path.extname(file).toLowerCase();
  return INCLUDE_EXTS.has(ext) || ext === '';
}

function walk(dir, matches) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!EXCLUDE_DIRS.has(entry.name)) {
        walk(full, matches);
      }
    } else if (entry.isFile()) {
      if (shouldScanFile(full)) {
        const content = fs.readFileSync(full, 'utf-8');
        if (content.includes(LEGACY)) {
          matches.push(full);
        }
      }
    }
  }
}

(function main() {
  const root = process.cwd();
  const matches = [];
  walk(root, matches);

  if (matches.length > 0) {
    console.error('Found legacy Laudiumbiz URL in the following files:');
    for (const m of matches) console.error(' -', path.relative(root, m));
    process.exit(1);
  }

  console.log('No legacy Laudiumbiz URLs found in source/config files.');
})();
