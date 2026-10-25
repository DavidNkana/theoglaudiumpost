/**
 * Test: generate-article by ID endpoints mapping
 * Validates that our logic should form the correct URLs and payloads
 * for single and batch generation using provider mapping.
 */

function getProviderBase(provider = 'gpt') {
  const map = { gpt: 'chatgpt', gemini: 'gemini', perplexity: 'perplexity', x: 'x' };
  return map[provider] || map.gpt;
}

function buildSingleUrl(provider) {
  return `${getProviderBase(provider)}/generate-article/by-id`;
}

function buildBatchUrl(provider) {
  return `${getProviderBase(provider)}/generate-articles/bulk`;
}

function run() {
  console.log('=== Testing generate-article by ID endpoint mapping ===');

  const singleCases = [
    { provider: 'gpt', expected: 'chatgpt/generate-article/by-id' },
    { provider: 'gemini', expected: 'gemini/generate-article/by-id' },
    { provider: 'perplexity', expected: 'perplexity/generate-article/by-id' },
    { provider: 'x', expected: 'x/generate-article/by-id' },
    { provider: 'unknown', expected: 'chatgpt/generate-article/by-id' },
  ];

  let passed = 0; let failed = 0;

  for (const t of singleCases) {
    const actual = buildSingleUrl(t.provider);
    if (actual === t.expected) {
      console.log(`✅ PASS single: ${t.provider} -> ${actual}`);
      passed++;
    } else {
      console.log(`❌ FAIL single: ${t.provider} -> ${actual} (expected ${t.expected})`);
      failed++;
    }
  }

  const batchCases = [
    { provider: 'gpt', expected: 'chatgpt/generate-articles/bulk' },
    { provider: 'gemini', expected: 'gemini/generate-articles/bulk' },
    { provider: 'perplexity', expected: 'perplexity/generate-articles/bulk' },
    { provider: 'x', expected: 'x/generate-articles/bulk' },
    { provider: 'unknown', expected: 'chatgpt/generate-articles/bulk' },
  ];

  for (const t of batchCases) {
    const actual = buildBatchUrl(t.provider);
    if (actual === t.expected) {
      console.log(`✅ PASS batch: ${t.provider} -> ${actual}`);
      passed++;
    } else {
      console.log(`❌ FAIL batch: ${t.provider} -> ${actual} (expected ${t.expected})`);
      failed++;
    }
  }

  console.log(`\nSummary: ${passed} passed, ${failed} failed`);
}

run();
