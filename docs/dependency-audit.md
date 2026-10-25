# Dependency audit scope

## Snapshot

Audit results below were captured on **2026-10-25 (UTC)** from commit
`69d4364`, using Node `v22.23.2` and npm `10.9.8` with the checked-in
`package-lock.json`:

```sh
npm audit --omit=dev
```

```text
found 0 vulnerabilities
```

This is the production/runtime scope: `npm audit --omit=dev` is clean.

The full dependency tree was checked separately, without weakening the audit:

```sh
npm audit
```

```text
41 vulnerabilities (2 low, 10 moderate, 23 high, 6 critical)
```

The 41 findings are in development, build, test, native-project, and asset
generation tooling; they are not a claim that the production dependency tree
is vulnerable. The affected package families and their scopes are:

- **Native and image-asset tooling:** `@capacitor/assets@3.0.5` brings a
  nested `@capacitor/cli@5.7.8` and `tar@6.2.1` (critical), and vulnerable
  `sharp` versions; `@vite-pwa/assets-generator@1.0.1` also brings vulnerable
  `sharp` (high). These are development-only asset generators.
- **Test tooling:** `vitest@2.1.9`, `@vitest/coverage-istanbul`,
  `@vitest/coverage-v8`, `@vitest/mocker`, `vite-node`, and `tinypool`
  (including critical findings) are used only by the test/coverage toolchain.
- **Build and development tooling:** `vite` (including its nested Vite
  version), `esbuild`, `rollup`, `@rollup/plugin-terser`, `workbox-build`,
  `serialize-javascript`, `browserslist`, `@vue/devtools`' `nanoid`, and
  related `picomatch`/`glob` paths are development/build dependencies.
- **Native-project and XML tooling:** `@trapezedev/project`, `xcode`,
  `@xmldom/xmldom`, `mergexml`, and `uuid` occur through native project
  tooling and are not shipped in the web/runtime bundle.
- **Other transitive development tooling:** `@babel/core`,
  `@babel/plugin-transform-modules-systemjs`, `@isaacs/brace-expansion`,
  `ajv`, `brace-expansion`, `defu`, `diff`, `fast-uri`, `handlebars`,
  `immutable`, `minimatch`, `replace`, `tmp`, and `undici` are reported only
  in the full development tree.

The production Capacitor CLI is `@capacitor/cli@7.6.9` and resolves
`tar@7.5.22`, outside the reported vulnerable range. The vulnerable nested
`tar@6.2.1` belongs to the development-only `@capacitor/assets` path; it is
not the only full-tree finding.

## Remediation status

No dependency or UI changes were made as part of this documentation update,
and no audit fix was applied. npm reports a non-breaking `npm audit fix` path
for many transitive findings, while the Vitest-related findings require
`npm audit fix --force`, which would upgrade Vitest to `5.0.5` and is a
breaking change. npm reports **no fix available** for the vulnerable `sharp`
path and marks the direct `@capacitor/assets` path as not automatically
fixable. Those findings remain open for a deliberate tooling migration or
replacement; they are outside production installation and the web runtime.

Re-run both commands above after any dependency/tooling change. The full-tree
audit is intentionally retained as a visible development/native-tooling
blocker; the clean production result does not waive it.
