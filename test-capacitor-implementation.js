/**
 * Test script to validate Capacitor implementation
 * Run: node test-capacitor-implementation.js
 */
import fs from 'fs';
import path from 'path';

function assert(cond, message) {
  if (!cond) throw new Error(message);
}

function readJson(p) {
  const text = fs.readFileSync(p, 'utf-8');
  return JSON.parse(text);
}

(async function main() {
  console.log('Validating Capacitor implementation...');

  const root = process.cwd();
  const pkgPath = path.join(root, 'package.json');
  const capConfigPath = path.join(root, 'capacitor.config.json');

  assert(fs.existsSync(pkgPath), 'package.json not found');
  assert(fs.existsSync(capConfigPath), 'capacitor.config.json not found');

  const pkg = readJson(pkgPath);
  const cap = readJson(capConfigPath);

  // 1) Dependencies
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  const requiredDeps = ['@capacitor/core', '@capacitor/cli', '@capacitor/android', '@capacitor/ios'];
  for (const d of requiredDeps) {
    assert(deps && deps[d], `Missing dependency: ${d}`);
  }

  // 2) Scripts
  const scripts = pkg.scripts || {};
  assert(typeof scripts['cap:bootstrap:android'] === 'string', 'Missing script: cap:bootstrap:android');
  assert(typeof scripts['cap:bootstrap:ios'] === 'string', 'Missing script: cap:bootstrap:ios');
  assert(typeof scripts['assets:init'] === 'string', 'Missing script: assets:init');
  assert(typeof scripts['assets:generate'] === 'string', 'Missing script: assets:generate');

  // 3) Config basics
  assert(cap.webDir === 'dist', 'capacitor.config.json webDir should be "dist"');
  assert(cap.appId && typeof cap.appId === 'string', 'appId missing');
  assert(cap.appName && typeof cap.appName === 'string', 'appName missing');

  // 4) Ensure splash path used by assets:init exists
  const assetsInit = scripts['assets:init'];
  const splashMatch = assetsInit.match(/--splash\s+\"([^\"]+)\"/);
  if (splashMatch) {
    const splashRel = splashMatch[1];
    const splashAbs = path.join(root, splashRel);
    assert(fs.existsSync(splashAbs), `Splash image not found at ${splashRel}`);
  } else {
    throw new Error('Could not parse splash path from assets:init');
  }

  // 5) Android platform folder existence is optional; presence indicates bootstrap
  const androidDir = path.join(root, 'android');
  if (fs.existsSync(androidDir)) {
    console.log('Android platform folder detected.');
  } else {
    console.log('Android platform folder not detected yet (will be created by cap:bootstrap:android).');
  }

  // 6) iOS platform folder existence is optional; will be created by bootstrap
  const iosDir = path.join(root, 'ios');
  if (fs.existsSync(iosDir)) {
    console.log('iOS platform folder detected.');
  } else {
    console.log('iOS platform folder not detected yet (will be created by cap:bootstrap:ios).');
  }

  console.log('All Capacitor checks passed.');
})().catch(err => {
  console.error('Validation failed:', err.message);
  process.exit(1);
});
