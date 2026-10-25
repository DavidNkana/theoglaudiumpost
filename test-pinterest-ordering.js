/**
 * Test Pinterest ordering logic ensures latest-first
 * Run: node test-pinterest-ordering.js
 */

function sortArticlesLatestFirst(items) {
  const getTimestamp = (a) => {
    const d = a?.published_at || a?.created_at || a?.updated_at || a?.date || null;
    const t = d ? new Date(d).getTime() : NaN;
    return Number.isFinite(t) ? t : NaN;
  };
  return [...items].sort((a, b) => {
    const tb = getTimestamp(b);
    const ta = getTimestamp(a);
    if (Number.isNaN(tb) && Number.isNaN(ta)) {
      return (b?.id || 0) - (a?.id || 0);
    }
    if (Number.isNaN(tb)) return 1;
    if (Number.isNaN(ta)) return -1;
    return tb - ta;
  });
}

(function main() {
  const now = new Date('2025-10-19T20:57:00Z').getTime();
  const mk = (offsetMin, id, fields = {}) => ({
    id,
    title: `A${id}`,
    created_at: new Date(now + offsetMin * 60 * 1000).toISOString(),
    ...fields,
  });

  const input = [
    mk(-60, 1), // 60 min ago
    mk(-5, 2),  // 5 min ago
    mk(-120, 3),
    mk(-30, 4),
  ];

  const out = sortArticlesLatestFirst(input);

  const ids = out.map(a => a.id);
  const expected = [2, 4, 1, 3];
  const pass = JSON.stringify(ids) === JSON.stringify(expected);

  console.log('Sorted IDs:', ids);
  if (!pass) {
    console.error('❌ FAIL: Expected order', expected, 'got', ids);
    process.exit(1);
  }

  // Fallback: missing dates use id desc
  const input2 = [
    { id: 10 },
    { id: 5 },
    { id: 20 },
  ];
  const out2 = sortArticlesLatestFirst(input2);
  const ids2 = out2.map(a => a.id);
  const expected2 = [20, 10, 5];
  const pass2 = JSON.stringify(ids2) === JSON.stringify(expected2);
  console.log('Sorted IDs (no dates):', ids2);
  if (!pass2) {
    console.error('❌ FAIL: Expected order', expected2, 'got', ids2);
    process.exit(1);
  }

  console.log('✅ Pinterest ordering tests passed.');
})();
