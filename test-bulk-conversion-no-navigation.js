/**
 * Test: Bulk conversion should not navigate to Create page
 * - Confirms SourceArticles.vue shows info message and does not call router.push with multipleArticles query
 */
import fs from 'fs';
import path from 'path';

const filePath = path.resolve('./src/views/Admin/Articles/SourceArticles.vue');

function run() {
  console.log('=== Testing bulk conversion no-navigation behavior ===');
  if (!fs.existsSync(filePath)) {
    console.log('❌ FAIL: SourceArticles.vue not found at', filePath);
    return;
  }
  const content = fs.readFileSync(filePath, 'utf-8');

  // Check there is an info message about background generation
  const hasInfoMessage = content.includes("Articles are being generated") || content.includes("Please come back later");
  console.log('Check for info message phrase...');
  if (hasInfoMessage) {
    console.log('✅ PASS: Info message indicating background generation exists');
  } else {
    console.log('❌ FAIL: Missing info message indicating background generation');
  }

  // Ensure the old multiple navigation route is not present
  const hadMultipleNav = content.includes("multipleArticles: 'true'");
  console.log('Check that multipleArticles navigation is removed...');
  if (!hadMultipleNav) {
    console.log('✅ PASS: multipleArticles navigation block removed');
  } else {
    console.log('❌ FAIL: Found old multipleArticles navigation block');
  }

  // Try to ensure no router.push call directly follows the bulk conversion section
  // We will search near the convertSelectedArticles function area.
  const convertIndex = content.indexOf('const convertSelectedArticles = async () =>');
  if (convertIndex >= 0) {
    const snippet = content.slice(convertIndex, convertIndex + 400);
    const hasRouterPush = snippet.includes('router.push(');
    console.log('Check for router.push inside convertSelectedArticles...');
    if (!hasRouterPush) {
      console.log('✅ PASS: No router.push call inside convertSelectedArticles');
    } else {
      console.log('❌ FAIL: Found router.push inside convertSelectedArticles');
    }
  } else {
    console.log('❌ FAIL: Could not locate convertSelectedArticles function');
  }

  console.log('=== Test completed ===');
}

run();
