import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { routePaths } from "../src/shared/routePaths.ts";

const distDir = resolve("dist");
const indexHtml = resolve(distDir, "index.html");
const notFoundHtml = resolve(distDir, "404.html");

if (!existsSync(indexHtml)) {
    throw new Error("dist/index.html was not found. Run Vite build first.");
}

copyFileSync(indexHtml, notFoundHtml);

// GitHub Pages does not support SPA rewrites. Generate an index.html for
// every known route so direct navigation returns HTTP 200 instead of 404.
for (const route of Object.values(routePaths)) {
    if (!route) continue; // The home page already has dist/index.html.

    const routeDir = resolve(distDir, route);
    mkdirSync(routeDir, { recursive: true });
    copyFileSync(indexHtml, resolve(routeDir, "index.html"));
}
