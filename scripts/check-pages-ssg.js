import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { openGraphImagePath, routeDefinitions, siteBaseUrl } from "../src/shared/routeDefinitions.ts";

const distDir = resolve("dist", "pages");
const imageUrl = new URL(openGraphImagePath, siteBaseUrl).href;

function escapeHtml(value) {
    return value.replaceAll("&", "&amp;")
        .replaceAll('"', "&quot;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");
}

for (const [routeKey, route] of Object.entries(routeDefinitions)) {
    const html = readFileSync(resolve(distDir, route.path, "index.html"), "utf8");
    const canonicalUrl = new URL(route.path, siteBaseUrl).href;

    assert.ok(html.includes(`<title>${escapeHtml(route.title)}</title>`), `${routeKey}: title missing`);
    assert.ok(html.includes(`<link rel="canonical" href="${canonicalUrl}"`), `${routeKey}: canonical missing`);
    assert.ok(html.includes(`<meta property="og:url" content="${canonicalUrl}"`), `${routeKey}: og:url missing`);
    assert.ok(html.includes(`<meta property="og:image" content="${imageUrl}"`), `${routeKey}: og:image missing`);
    assert.equal((html.match(/<meta name="description"/g) ?? []).length, 1,
        `${routeKey}: duplicate or missing description`);
    assert.equal((html.match(/<link rel="canonical"/g) ?? []).length, 1,
        `${routeKey}: duplicate or missing canonical`);
    assert.equal((html.match(/<meta property="og:url"/g) ?? []).length, 1,
        `${routeKey}: duplicate or missing og:url`);
    assert.equal(html.includes('name="robots" content="noindex, follow"'), !route.indexable,
        `${routeKey}: robots metadata incorrect`);

    if (route.prerender) {
        assert.ok(html.includes(`<div id="root" data-ssg-path="${new URL(canonicalUrl).pathname}">`),
            `${routeKey}: prerendered #root marker missing`);
        assert.match(html, /<main class="site-main">[\s\S]*?<h1[\s>]/,
            `${routeKey}: no static heading within main`);
        assert.match(html, /<p[\s>]/, `${routeKey}: no static paragraphs`);
        assert.match(html, /<a\s[^>]*href=/, `${routeKey}: no static links`);
        assert.ok(!html.includes('id="app-startup-cover"'),
            `${routeKey}: startup cover hides content without JavaScript`);
        assert.ok(!html.includes('class="javascript-required"'),
            `${routeKey}: JavaScript warning must not appear on prerendered pages`);
    } else {
        assert.match(html, /<div id="root">\s*<noscript>[\s\S]*?class="javascript-required"/,
            `${routeKey}: no-JavaScript message missing`);
        assert.ok(html.includes('JavaScript is required'), `${routeKey}: no-JavaScript text missing`);
        assert.ok(html.includes('id="app-startup-cover"'), `${routeKey}: client startup cover missing`);
    }
}

const fallback = readFileSync(resolve(distDir, "404.html"), "utf8");
assert.ok(fallback.includes('name="robots" content="noindex, follow"'), "404: noindex missing");
assert.ok(!fallback.includes('rel="canonical"'), "404: canonical must be absent");
assert.ok(!fallback.includes("data-ssg-path"), "404: must not be prerendered");
assert.match(fallback, /<div id="root">\s*<noscript>/, "404: client fallback root missing");

const sitemap = readFileSync(resolve(distDir, "sitemap.xml"), "utf8");
const expectedUrls = Object.values(routeDefinitions)
    .filter((route) => route.indexable)
    .map((route) => `<loc>${new URL(route.path, siteBaseUrl).href}</loc>`);
assert.equal((sitemap.match(/<loc>/g) ?? []).length, expectedUrls.length,
    "Sitemap: URL count mismatch");
for (const url of expectedUrls) {
    assert.ok(sitemap.includes(url), `Sitemap: missing ${url}`);
}

console.log(`SSG checks passed: ${Object.values(routeDefinitions).filter((route) => route.prerender).length} static pages, 2 client routes, 404, sitemap.`);
