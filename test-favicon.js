/**
 * Verifies favicon is configured for the app
 * Run: node test-favicon.js
 */
import fs from "fs";
import path from "path";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

try {
  const root = process.cwd();
  const indexPath = path.join(root, "index.html");
  const publicFaviconSvg = path.join(root, "public", "favicon.svg");
  const publicFaviconIco = path.join(root, "public", "favicon.ico");

  console.log("Checking index.html presence...");
  assert(fs.existsSync(indexPath), "index.html not found at project root");

  const html = fs.readFileSync(indexPath, "utf-8");
  console.log("Checking favicon link tag in index.html...");
  const hasSvgLink =
    /<link[^>]*rel=["']icon["'][^>]*href=["'][^"']*favicon\.svg["'][^>]*>/i.test(
      html,
    );
  assert(hasSvgLink, "index.html is missing a /favicon.svg <link rel=\"icon\"> tag");

  console.log("Checking public/favicon.svg exists...");
  assert(fs.existsSync(publicFaviconSvg), "public/favicon.svg does not exist");
  assert(fs.statSync(publicFaviconSvg).size > 0, "public/favicon.svg file is empty");

  console.log("Checking public/favicon.ico exists...");
  assert(fs.existsSync(publicFaviconIco), "public/favicon.ico does not exist");
  assert(fs.statSync(publicFaviconIco).size > 0, "public/favicon.ico file is empty");

  console.log("All favicon checks passed.");
} catch (err) {
  console.error("Favicon verification failed:", err.message);
  process.exit(1);
}
