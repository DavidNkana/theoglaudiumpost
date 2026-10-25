/****
 * Cloudflare Worker to serve the Vite-built Vue SPA from /dist
 * - Serves static assets via ASSETS binding
 * - Provides SPA fallback: for navigation requests (HTML) that 404, returns /index.html
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // First try to serve the static asset directly
    let response = await env.ASSETS.fetch(request);

    // If it's a navigation request and we got 404, serve index.html for SPA routing
    if (response.status === 404 && acceptsHtml(request)) {
      const indexUrl = new URL("/index.html", url.origin);
      response = await env.ASSETS.fetch(new Request(indexUrl.toString(), request));
    }

    return response;
  },
};

function acceptsHtml(request) {
  const accept = request.headers.get("Accept") || "";
  const method = request.method || "GET";
  // Check if the request is likely a document navigation
  return method === "GET" && accept.includes("text/html");
}
