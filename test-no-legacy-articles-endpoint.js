/**
 * Guard test to ensure the legacy Laudiumbiz articles endpoint is not referenced in source/config files.
 * Run: node test-no-legacy-articles-endpoint.js
 */
import fs from 'fs';
import path from 'path';

const LEGACY_DOMAIN = 'https://lna.abc.co.zm/Laudiumbiz/';
const LEGACY_ARTICLES = 'https://lna.abc.co.zm/Laudiumbiz/api/v1/articles';

const EXCLUDE_DIRS = new Set([
  'node_modules',
  'dist',
  'dev-dist',
  'android',
  'ios',
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
      if (!EXCLUDE_DIRS.has(entry.name)) walk(full, matches);
    } else if (entry.isFile()) {
      if (!shouldScanFile(full)) continue;
      const content = fs.readFileSync(full, 'utf-8');
      if (content.includes(LEGACY_ARTICLES) || content.includes(LEGACY_DOMAIN)) {
        matches.push(full);
      }
    }
  }
}

(function main() {
  const root = process.cwd();
  const matches = [];
  walk(root, matches);

  if (matches.length) {
    console.error('Found legacy Laudiumbiz articles endpoint/domain in files:');
    for (const m of matches) console.error(' -', path.relative(root, m));
    process.exit(1);
  }

  console.log('No legacy Laudiumbiz articles endpoint/domain found in source/config files.');
})();
