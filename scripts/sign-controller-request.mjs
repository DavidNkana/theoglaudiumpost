#!/usr/bin/env node
/**
 * sign-controller-request.mjs
 *
 * Single source of truth for Ed25519-signed controller requests.
 * Usage: node scripts/sign-controller-request.mjs <project-name> <method> <path> <body-file> <timestamp>
 *
 * Emits a JSON object on stdout with the signed headers.
 */
import { sign } from 'node:crypto';
import { readFileSync } from 'node:fs';

const [projectName, method, path, bodyFile, timestamp] = process.argv.slice(2);
const body = bodyFile ? readFileSync(bodyFile, 'utf8') : '';
let privateKeyPem = process.env.TEST_ED25519_PRIVATE_KEY;
if (process.env.TEST_ED25519_PRIVATE_KEY_B64) {
  privateKeyPem = Buffer.from(process.env.TEST_ED25519_PRIVATE_KEY_B64, 'base64').toString('utf8');
}
if (!privateKeyPem) { console.error('TEST_ED25519_PRIVATE_KEY is not set'); process.exit(1); }

const message = `${method}\n${path}\n${body}\n${timestamp}`;
const sig = sign(null, Buffer.from(message, 'utf8'), privateKeyPem);
const sigB64 = Buffer.from(sig).toString('base64');

console.log(JSON.stringify({
  'X-Timestamp': timestamp,
  'X-Project-Id': projectName,
  'Authorization': `Sig ${sigB64}`,
}));
