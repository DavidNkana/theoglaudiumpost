/**
 * Test to ensure app does not draw behind system bars or camera cutouts.
 * Verifies Capacitor config values.
 */

import fs from 'fs';

function testNoFullscreenConfig() {
  console.log('Testing no-fullscreen configuration in capacitor.config.json...');
  const cfg = JSON.parse(fs.readFileSync('./capacitor.config.json', 'utf-8'));

  const splash = cfg.plugins?.SplashScreen || {};
  const statusBar = cfg.plugins?.StatusBar || {};

  const expectations = [
    { key: 'SplashScreen.splashFullScreen', value: splash.splashFullScreen, expected: false },
    { key: 'SplashScreen.splashImmersive', value: splash.splashImmersive, expected: false },
    { key: 'StatusBar.overlaysWebView', value: statusBar.overlaysWebView, expected: false },
    { key: 'StatusBar.androidOverlaysWebView', value: statusBar.androidOverlaysWebView, expected: false },
  ];

  let passed = 0;
  let failed = 0;

  for (const item of expectations) {
    const ok = item.value === item.expected;
    if (ok) {
      console.log(`✅ PASS: ${item.key} === ${JSON.stringify(item.expected)}`);
      passed++;
    } else {
      console.log(`❌ FAIL: ${item.key} expected ${JSON.stringify(item.expected)} but got ${JSON.stringify(item.value)}`);
      failed++;
    }
  }

  console.log(`\nTotal checks: ${expectations.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);

  if (failed > 0) process.exit(1);
}

try {
  testNoFullscreenConfig();
} catch (e) {
  console.error('Test encountered an error:', e);
  process.exit(1);
}
