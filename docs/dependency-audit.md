# Dependency audit scope

The production dependency audit is clean:

```text
npm audit --omit=dev --audit-level=high
found 0 vulnerabilities
```

The Capacitor CLI used by the application is pinned to the compatible 7.6.9
line and resolves `tar@7.5.22`, which is outside the reported path-traversal
ranges. The remaining full-tree `tar` finding is isolated to the native asset
generator: `@capacitor/assets@3.0.5` (a development-only tool) pins its own
`@capacitor/cli@5.7.8`, which in turn pins `tar@6.2.1`.

`@capacitor/assets@3.0.5` is the latest published release, so removing that
finding requires replacing the asset-generation workflow or a future
Capacitor asset-tool migration. It is not installed in production and is not
used by the web build. The same development-only scope applies to the
unfixed `sharp` finding under the asset generators; no UI or runtime bundle
includes either tool.
