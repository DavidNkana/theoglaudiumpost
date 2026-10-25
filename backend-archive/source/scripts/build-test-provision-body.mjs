#!/usr/bin/env node
/**
 * Pipeline CLI: write backend POST /provision JSON (keep in sync with src/pipelines/build-test-provision-body.mjs).
 *
 * Usage:
 *   node scripts/build-test-provision-body.mjs --output path.json
 *
 * Env:
 *   PR_ID, BUILD_IMAGE, TEST_DATABASE_URL, TEST_RUNTIME_ENV_VARS, TEST_CONTAINER_PORT
 */

import { writeFileSync } from 'node:fs';

function parseArgs(argv) {
  const args = { output: null };
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === '--output' && argv[i + 1]) {
      args.output = argv[i + 1];
      i += 1;
    }
  }
  return args;
}

function parseRuntimeEnvVars(raw) {
  if (!raw) return {};
  const parsed = JSON.parse(String(raw));
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('TEST_RUNTIME_ENV_VARS must be a JSON object');
  }
  return parsed;
}

function buildBody() {
  const prId = process.env.PR_ID || process.env.SYSTEM_PULLREQUEST_PULLREQUESTID;
  const image = process.env.BUILD_IMAGE;
  if (!image) throw new Error('BUILD_IMAGE is required');
  if (!prId) throw new Error('PR_ID is required');

  const envVars = parseRuntimeEnvVars(process.env.TEST_RUNTIME_ENV_VARS);
  if (process.env.TEST_DATABASE_URL) {
    envVars.SPRING_DATASOURCE_URL = String(process.env.TEST_DATABASE_URL);
  }

  const containerPort = parseInt(process.env.TEST_CONTAINER_PORT || '8000', 10);

  return {
    component: 'backend',
    prId: parseInt(String(prId), 10),
    image: String(image),
    env: 'pr-preview',
    containerPort: Number.isInteger(containerPort) && containerPort > 0 ? containerPort : 8000,
    envVars,
  };
}

const { output } = parseArgs(process.argv);
if (!output) {
  console.error('Usage: node scripts/build-test-provision-body.mjs --output <path>');
  process.exit(1);
}

const body = buildBody();
writeFileSync(output, `${JSON.stringify(body)}\n`, 'utf8');