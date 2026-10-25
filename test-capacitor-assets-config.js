/**
 * Test script to verify Capacitor assets generation uses LaudiumLogo.png
 */

import fs from 'fs';

function testCapacitorAssetsConfig() {
  console.log('Testing Capacitor assets configuration...');
  const pkgPath = './package.json';
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));

  const scripts = pkg.scripts || {};
  const init = scripts['assets:init'] || '';
  const generate = scripts['assets:generate'] || '';

  const expectedPath = 'logo/LaudiumLogo.png';

  const initHasIcon = init.includes(`--icon "${expectedPath}"`) || init.includes(`--icon '${expectedPath}'`) || init.includes(`--icon ${expectedPath}`);
  const genHasIcon = generate.includes(`--icon "${expectedPath}"`) || generate.includes(`--icon '${expectedPath}'`) || generate.includes(`--icon ${expectedPath}`);

  let passed = 0;
  let failed = 0;

  if (initHasIcon) {
    console.log(`✅ PASS: assets:init uses ${expectedPath}`);
    passed++;
  } else {
    console.log('❌ FAIL: assets:init does not reference the correct --icon path');
    console.log('   Script:', init);
    failed++;
  }

  if (genHasIcon) {
    console.log(`✅ PASS: assets:generate uses ${expectedPath}`);
    passed++;
  } else {
    console.log('❌ FAIL: assets:generate does not reference the correct --icon path');
    console.log('   Script:', generate);
    failed++;
  }

  console.log(`\nTotal tests: 2`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);

  // Exit with non-zero code if any failed
  if (failed > 0) {
    process.exit(1);
  }
}

// Run the test
try {
  testCapacitorAssetsConfig();
} catch (e) {
  console.error('Test encountered an error:', e);
  process.exit(1);
}
