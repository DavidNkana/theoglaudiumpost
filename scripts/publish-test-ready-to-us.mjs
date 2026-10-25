#!/usr/bin/env node
/**
 * Pipeline CLI: PATCH US test URLs + Ready for Human Test via System.AccessToken.
 * Keep in sync with src/wrappers/publish-test-ready-to-us.mjs.
 */

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    const key = argv[i];
    const value = argv[i + 1];
    if (!key.startsWith('--') || !value) continue;
    args[key.slice(2)] = value;
    i += 1;
  }
  return args;
}

function parseUsId({ usId, sourceBranch }) {
  if (usId) {
    const numeric = parseInt(String(usId), 10);
    if (Number.isInteger(numeric) && numeric > 0) return numeric;
  }
  if (!sourceBranch) return null;
  const branch = sourceBranch.startsWith('refs/heads/')
    ? sourceBranch.slice('refs/heads/'.length)
    : sourceBranch;
  const match = /(?:^|\/)wi-(\d+)-/.exec(branch) ?? /^wi-(\d+)$/.exec(branch);
  if (!match) return null;
  const parsed = parseInt(match[1], 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function normalizeContainerIds(raw) {
  if (!raw) return '';
  return [...new Set(String(raw).split(',').map((s) => s.trim()).filter(Boolean))].join(',');
}

const args = parseArgs(process.argv);
const accessToken = process.env.SYSTEM_ACCESSTOKEN;
if (!accessToken) {
  console.error('SYSTEM_ACCESSTOKEN is required');
  process.exit(1);
}

const collectionUri = args['collection-uri'] || process.env.SYSTEM_COLLECTIONURI;
const project = args.project || process.env.SYSTEM_TEAMPROJECT;
const testBackendUrl = args['test-backend-url'];
const testFrontendUrl = args['test-frontend-url'];
const sourceBranch = args['source-branch'] || process.env.BUILD_SOURCEBRANCH;
const usId = parseUsId({ usId: args['us-id'], sourceBranch });

if (!collectionUri || !project || !testBackendUrl || !testFrontendUrl || !usId) {
  console.error('collection-uri, project, test-backend-url, test-frontend-url, and wi branch are required');
  process.exit(1);
}

const patch = [
  { op: 'add', path: '/fields/Custom.TestBackEnd', value: testBackendUrl },
  { op: 'add', path: '/fields/Custom.TestFrontEnd', value: testFrontendUrl },
  { op: 'add', path: '/fields/Microsoft.VSTS.TCM.AutomationStatus', value: 'Ready for Human Test' },
];

const containerIds = normalizeContainerIds(args['container-ids']);
if (containerIds) {
  patch.push({ op: 'add', path: '/fields/Custom.TestContainerIds', value: containerIds });
}

const base = collectionUri.replace(/\/+$/, '');
const url = `${base}/${encodeURIComponent(project)}/_apis/wit/workitems/${usId}?api-version=7.1`;

const response = await fetch(url, {
  method: 'PATCH',
  headers: {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json-patch+json',
  },
  body: JSON.stringify(patch),
});

const text = await response.text();
if (!response.ok) {
  console.error(`ADO_PATCH_FAILED: ${response.status} ${text}`);
  process.exit(1);
}

console.log(`Published Ready for Human Test on US ${usId}`);