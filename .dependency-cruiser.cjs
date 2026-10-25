/**
 * Architecture gate (AGENTS Multi-Stack Quality Gate Contract — JS/TS).
 *
 * Enforces the service-layer boundary in the dependency graph, not just by
 * review: raw axios and the raw apiClient may only be imported by the service
 * layer (services/, shared/services/, features/<domain>/<X>Service.js), and the
 * graph must be acyclic (a circular import is what crashed the app at runtime
 * via api -> useAuth -> AuthService -> BaseService -> api).
 */
const SERVICE_LAYER =
  "(^|/)src/(services|shared/services)/|(^|/)src/features/[^/]+/[A-Za-z]+Service\\.(js|ts)$";

module.exports = {
  forbidden: [
    {
      name: "no-circular",
      severity: "error",
      comment:
        "Circular dependencies cause runtime temporal-dead-zone crashes — break the cycle.",
      from: {},
      to: { circular: true },
    },
    {
      name: "axios-only-in-service-layer",
      severity: "error",
      comment:
        "Raw axios may only be imported by the service layer. UI/state must call a resource service.",
      from: { pathNot: SERVICE_LAYER },
      to: { path: "(^|/)node_modules/axios(/|$)" },
    },
    {
      name: "apiclient-only-in-service-layer",
      severity: "error",
      comment:
        "The raw apiClient (services/api) may only be used by the service layer or the axios plugin.",
      from: { pathNot: SERVICE_LAYER + "|(^|/)src/plugins/axios\\.js$" },
      to: { path: "(^|/)src/services/api\\.js$" },
    },
  ],
  options: {
    doNotFollow: { path: "(^|/)node_modules(/|$)" },
    exclude: { path: "\\.(spec|test)\\.(js|ts)$" },
    tsConfig: { fileName: "tsconfig.depcruise.json" },
    enhancedResolveOptions: {
      extensions: [".js", ".ts", ".vue", ".json"],
    },
  },
};
