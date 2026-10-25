import { fileURLToPath, URL } from "node:url";

import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { VitePWA } from "vite-plugin-pwa";
import vueDevTools from "vite-plugin-vue-devtools";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    // Custom plugin to handle markdown files in development mode
    {
      name: "markdown-docs",
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          // Only handle requests for markdown files in the docs directory
          if (req.url.startsWith("/docs/") && req.url.endsWith(".md")) {
            const fs = require("fs");
            const path = require("path");

            // Get the file path relative to the project root
            const filePath = path.join(__dirname, req.url);

            // Check if the file exists
            if (fs.existsSync(filePath)) {
              // Set the content type to text/markdown
              res.setHeader("Content-Type", "text/markdown");
              // Read the file and send it as the response
              const content = fs.readFileSync(filePath, "utf-8");
              res.end(content);
              return;
            }
          }
          next();
        });
      },
    },
    VitePWA({
      registerType: "autoUpdate",
      disable: process.env.NODE_ENV === "development",
      includeAssets: [
        "favicon.ico",
        "favicon.svg",
        "apple-touch-icon-180x180.png",
        "maskable-icon-512x512.png",
      ],
      manifest: {
        name: "Laudium POST",
        short_name: "Laudium POST",
        description: "News Platform for Laudium Community",
        theme_color: "#2c3e50",
        icons: [
          // {
          //   src: "favicon-96x96.png",
          //   sizes: "64x64",
          //   type: "image/png",
          // },
          {
            src: "pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "pwa-64x64.png",
            sizes: "64x64",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "maskable-icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      devOptions: {
        enabled: true,
      },
      workbox: {
        // Admin screens must always load the current server app shell. Caching
        // their navigation fallback can strand authenticated users on a stale
        // release after a production deployment.
        navigateFallbackDenylist: [/^\/admin(?:\/|$)/],
        runtimeCaching: [
          {
            urlPattern: ({ request }) =>
              request.destination === "style" ||
              request.destination === "script" ||
              request.destination === "worker",
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "static-resources",
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
              },
            },
          },
          {
            urlPattern: ({ request }) => request.destination === "image",
            handler: "CacheFirst",
            options: {
              cacheName: "images",
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 24 * 60 * 60, // 60 days
              },
            },
          },
        ],
      },
    }),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  // server: {
  //   host: "0.0.0.0",
  //   // allowedHosts: ["3ac5-216-234-213-254.ngrok-free.app"],
  //   // allowedHosts: "all",
  // },
});
