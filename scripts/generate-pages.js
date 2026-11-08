import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { openGraphImagePath, routeDefinitions, siteBaseUrl } from "../src/shared/routeDefinitions.ts";

const distDir = resolve("dist");
const indexHtml = resolve(distDir, "index.html");

if (!existsSync(indexHtml)) {
    throw new Error("dist/index.html was not found. Run Vite build first.");
}

// Vite has already substituted the Pages base URL and hashed asset filenames.
// Reuse that HTML for every route, changing only its page metadata.
const templateHtml = readFileSync(indexHtml, "utf8").replace(
    /\s*<!-- BEGIN GENERATED SEO -->[\s\S]*?<!-- END GENERATED SEO -->/g,
    "",
);
const imageUrl = new URL(openGraphImagePath, siteBaseUrl).href;

function escapeHtml(value) {
    return value.replaceAll("&", "&amp;")
        .replaceAll('"', "&quot;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");
}

function renderPage(definition, canonicalUrl) {
    const meta = [
        "    <!-- BEGIN GENERATED SEO -->",
        `    <meta name="description" content="${escapeHtml(definition.description)}" />`,
    ];

    if (!definition.indexable) {
        meta.push('    <meta name="robots" content="noindex, follow" />');
    }

    if (canonicalUrl) {
        meta.push(
            `    <link rel="canonical" href="${escapeHtml(canonicalUrl)}" />`,
            `    <meta property="og:title" content="${escapeHtml(definition.title)}" />`,
            `    <meta property="og:description" content="${escapeHtml(definition.description)}" />`,
            '    <meta property="og:type" content="website" />',
            '    <meta property="og:site_name" content="Calculator Comrade" />',
            `    <meta property="og:url" content="${escapeHtml(canonicalUrl)}" />`,
            `    <meta property="og:image" content="${escapeHtml(imageUrl)}" />`,
            '    <meta property="og:image:type" content="image/png" />',
            '    <meta property="og:image:width" content="1280" />',
            '    <meta property="og:image:height" content="720" />',
            '    <meta property="og:image:alt" content="Calculator Comrade classic 8-digit calculator" />',
        );
    }

    meta.push("    <!-- END GENERATED SEO -->");

    const titlePattern = /<title>[\s\S]*?<\/title>/i;
    if (!titlePattern.test(templateHtml)) {
        throw new Error("The built index.html does not contain a <title> tag.");
    }
    const htmlWithTitle = templateHtml.replace(
        titlePattern,
        `<title>${escapeHtml(definition.title)}</title>`,
    );
    if (!htmlWithTitle.includes("</head>")) {
        throw new Error("The built index.html does not contain a </head> tag.");
    }

    return htmlWithTitle.replace("</head>", `${meta.join("\n")}\n  </head>`);
}

const sitemapUrls = [];

for (const definition of Object.values(routeDefinitions)) {
    const canonicalUrl = new URL(definition.path, siteBaseUrl).href;
    const outputDir = resolve(distDir, definition.path);
    mkdirSync(outputDir, { recursive: true });
    writeFileSync(resolve(outputDir, "index.html"), renderPage(definition, canonicalUrl));

    if (definition.indexable) {
        sitemapUrls.push(canonicalUrl);
    }
}

// GitHub Pages uses 404.html as an SPA fallback for unknown routes.
// Do not give those unknown URLs the canonical URL of the home page.
writeFileSync(resolve(distDir, "404.html"), renderPage({
    title: "Page Not Found | Calculator Comrade",
    description: "The requested Calculator Comrade page could not be found.",
    indexable: false,
}, null));

const sitemap = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...sitemapUrls.map((url) => `  <url><loc>${escapeHtml(url)}</loc></url>`),
    '</urlset>',
    '',
].join("\n");
writeFileSync(resolve(distDir, "sitemap.xml"), sitemap);
