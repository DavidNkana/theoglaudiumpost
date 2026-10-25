// LCP #712 focused validation: router and env corrections
// Verifies:
// 1. /admin/prompts redirect → /admin/articles/prompts
// 2. /admin/articles/prompts route exists
// 3. /admin auth-preserving logic intact
// 4. Production domains allowed; localhost gated by dev mode

const fs = require('fs');

const routerPath = './src/router/index.js';
const mainJsPath = './src/main.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log('  PASS:', message);
    passed++;
  } else {
    console.error('  FAIL:', message);
    failed++;
  }
}

console.log('\n=== LCP #712 FOCUSED VALIDATION ===\n');

// 1. Parse router/index.js
const routerCode = fs.readFileSync(routerPath, 'utf8');

console.log('1. Router validation:');
// Check /admin/prompts redirect exists
const adminPromptsRedirect = /path:\s*['"]\/admin\/prompts['"]/.test(routerCode) &&
                               /redirect:\s*['"]\/admin\/articles\/prompts['"]/.test(routerCode);
assert(adminPromptsRedirect, '/admin/prompts redirect to /admin/articles/prompts');

// Check /admin/articles/prompts route exists (as child of articles, path "prompts")
const articlesPromptsRoute = /name:\s*['"]ManagePrompts['"]/.test(routerCode) &&
                               /path:\s*['"]prompts['"]/.test(routerCode);
assert(articlesPromptsRoute, '/admin/articles/prompts route (ManagePrompts) still exists');

// Check /admin auth layout preserved (AdminLayout parent with requiresAuth)
const adminLayoutRoute = /path:\s*['"]\/admin['"]\s*,\s*component:\s*AdminLayout/.test(routerCode);
assert(adminLayoutRoute, '/admin auth-preserving AdminLayout preserved');

// Check admin login route has publicRoute meta
const adminLoginPublic = /path:\s*['"]\/admin\/login['"]/.test(routerCode) &&
                           /publicRoute:\s*true/.test(routerCode);
assert(adminLoginPublic, '/admin/login has publicRoute:true meta (auth-preserving)');

// 2. Parse main.js
const mainJsCode = fs.readFileSync(mainJsPath, 'utf8');

console.log('\n2. main.js env validation:');

// Check Vite import.meta.env.MODE used (not process.env.NODE_ENV)
const usesViteMode = /import\.meta\.env\.MODE/.test(mainJsCode);
assert(usesViteMode, 'Uses import.meta.env.MODE for Vite env check');

const noProcessEnvNodeEnv = !/process\.env\.NODE_ENV/.test(mainJsCode);
assert(noProcessEnvNodeEnv, 'No process.env.NODE_ENV references remaining');

// Check production domains
const productionDomains = [
  'https://laudiumpost.co.za',
  'https://www.laudiumpost.co.za'
];
const prodDomainChecks = productionDomains.every(d => mainJsCode.includes(d));
assert(prodDomainChecks, 'All production domains still allowed');

// Check localhost gated by development mode
const localhostGated = /isDevOrigin\s*=\s*\(/.test(mainJsCode) &&
                        /localhost.*517[34].*&&.*import\.meta\.env\.MODE.*development/s.test(mainJsCode);
assert(localhostGated, 'localhost origins gated by development mode');

// Check OneSignal initialization is conditional on allowedDomain
const onesignalConditional = /if\s*\(\s*isAllowedDomain\s*\)/.test(mainJsCode);
assert(onesignalConditional, 'OneSignal initialization gated on isAllowedDomain');

// Summary
console.log(`\n=== RESULTS: ${passed} passed, ${failed} failed ===`);
process.exit(failed > 0 ? 1 : 0);
