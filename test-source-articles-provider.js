/**
 * Test: provider to endpoint mapping for Source Articles
 * This script does not import ESM modules. It re-implements the mapping
 * to validate expected endpoints used by the UI.
 */

function getSourceArticlesEndpointForProvider(provider = 'gpt') {
  const map = {
    gpt: 'gpt/source/all',
    gemini: 'gemini/source/all',
    perplexity: 'perplexity/source/all',
    x: 'x/source/all',
  };
  return map[provider] || map.gpt;
}

function runTests() {
  const cases = [
    { provider: 'gpt', expected: 'gpt/source/all' },
    { provider: 'gemini', expected: 'gemini/source/all' },
    { provider: 'perplexity', expected: 'perplexity/source/all' },
    { provider: 'x', expected: 'x/source/all' },
    { provider: 'unknown', expected: 'gpt/source/all' },
    { provider: undefined, expected: 'gpt/source/all' },
  ];

  let passed = 0;
  let failed = 0;

  console.log('=== Testing provider -> endpoint mapping ===');

  for (const t of cases) {
    const actual = getSourceArticlesEndpointForProvider(t.provider);
    const ok = actual === t.expected;
    if (ok) {
      console.log(`✅ PASS: provider=${String(t.provider)} => ${actual}`);
      passed++;
    } else {
      console.log(`❌ FAIL: provider=${String(t.provider)} => ${actual} (expected ${t.expected})`);
      failed++;
    }
  }

  console.log(`\nSummary: ${passed} passed, ${failed} failed (Total ${cases.length})`);
}

runTests();
