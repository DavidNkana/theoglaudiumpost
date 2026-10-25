#!/usr/bin/env node
/**
 * Poll backend-test for a succeeded build on the same source branch and write build metadata.
 */

import { writeFileSync } from 'node:fs';

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

async function adoGet(url, token) {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`ADO_GET_FAILED ${response.status}: ${text}`);
  }
  return text ? JSON.parse(text) : null;
}

const args = parseArgs(process.argv);
const token = process.env.SYSTEM_ACCESSTOKEN;
const collectionUri = process.env.SYSTEM_COLLECTIONURI;
const teamProject = process.env.SYSTEM_TEAMPROJECT;
const pipelineName = args['pipeline-name'];
const sourceBranch = args['source-branch']
  || process.env.SYSTEM_PULLREQUEST_SOURCEBRANCH
  || process.env.BUILD_SOURCEBRANCH;
const outputFile = args['output-file'];
const maxAttempts = parseInt(process.env.BACKEND_WAIT_ATTEMPTS || '60', 10);
const sleepMs = parseInt(process.env.BACKEND_WAIT_SLEEP_MS || '10000', 10);

if (!token || !collectionUri || !teamProject || !pipelineName || !sourceBranch || !outputFile) {
  console.error('Missing required env/args for wait-for-backend-preview');
  process.exit(1);
}

const apiBase = `${collectionUri.replace(/\/+$/, '')}/${encodeURIComponent(teamProject)}/_apis`;
const branchName = sourceBranch.startsWith('refs/') ? sourceBranch : `refs/heads/${sourceBranch}`;

const definition = await adoGet(
  `${apiBase}/build/definitions?name=${encodeURIComponent(pipelineName)}&api-version=7.1`,
  token,
);
const definitionId = definition?.value?.[0]?.id;
if (!definitionId) {
  console.error(`Pipeline definition not found: ${pipelineName}`);
  process.exit(1);
}

let build = null;
for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
  const builds = await adoGet(
    `${apiBase}/build/builds?definitions=${definitionId}` +
    `&branchName=${encodeURIComponent(branchName)}` +
    '&resultFilter=succeeded&statusFilter=completed&$top=1&api-version=7.1',
    token,
  );
  build = builds?.value?.[0] ?? null;
  if (build) break;
  console.log(`Waiting for ${pipelineName} on ${branchName} (attempt ${attempt}/${maxAttempts})`);
  await new Promise((resolve) => setTimeout(resolve, sleepMs));
}

if (!build) {
  console.error(`No succeeded ${pipelineName} build on ${branchName}`);
  process.exit(1);
}

writeFileSync(
  outputFile,
  `${JSON.stringify({ buildId: build.id, branchName, pipelineName })}\n`,
  'utf8',
);
console.log(`Backend-test build ${build.id} succeeded on ${branchName}`);