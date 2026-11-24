const CACHE_PREFIX = "calculator-comrade-";
const CACHE_NAME = `${CACHE_PREFIX}v5`;
const BASE_PATH = new URL(self.registration.scope).pathname;
const ASSET_MANIFEST_PATH = "asset-manifest.json";

self.addEventListener("install", (event) => {
    event.waitUntil(
        (async () => {
            const cache = await caches.open(CACHE_NAME);

            const assetManifest = await getAssetManifest();
            const staticAssets = [
                toScopedUrl(ASSET_MANIFEST_PATH),
                toScopedUrl("calculator/"),
                ...assetManifest.precache.map(toScopedUrl),
            ];

            await cacheAssets(cache, staticAssets);

            const buildAssets = await getBuildAssetsFromIndex();
            await cacheAssets(cache, buildAssets);

            await self.skipWaiting();
        })(),
    );
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        (async () => {
            const cacheNames = await caches.keys();

            await Promise.all(
                cacheNames
                    .filter((cacheName) => cacheName.startsWith(CACHE_PREFIX) && cacheName !== CACHE_NAME)
                    .map((cacheName) => caches.delete(cacheName)),
            );

            await self.clients.claim();
        })(),
    );
});

self.addEventListener("fetch", (event) => {
    if (event.request.method !== "GET") {
        return;
    }

    const requestUrl = new URL(event.request.url);

    if (requestUrl.origin !== self.location.origin) {
        return;
    }

    event.respondWith(handleFetch(event.request));
});

function toScopedUrl(path) {
    const normalizedPath = path.startsWith("/") ? path.slice(1) : path;

    return `${BASE_PATH}${normalizedPath}`;
}

async function getAssetManifest() {
    try {
        const response = await fetch(toScopedUrl(ASSET_MANIFEST_PATH), {
            cache: "no-cache",
        });

        if (!response.ok) {
            console.warn("Asset manifest was not loaded:", response.status);
            return createEmptyAssetManifest();
        }

        const manifest = await response.json();

        return {
            precache: normalizeAssetPathList(manifest.precache),
        };
    } catch (error) {
        console.warn("Asset manifest was not loaded:", error);
        return createEmptyAssetManifest();
    }
}

function createEmptyAssetManifest() {
    return {
        precache: [],
    };
}

function normalizeAssetPathList(value) {
    if (!Array.isArray(value)) {
        return [];
    }

    return value.filter((path) => typeof path === "string");
}

async function handleFetch(request) {
    // HTML navigation is network-first so newly deployed SSG pages cannot
    // remain stale indefinitely. Static assets keep the original cache-first
    // behavior, including the calculator's offline resources.
    if (request.mode === "navigate") {
        try {
            const response = await fetch(request, { cache: "no-cache" });

            if (response.ok) {
                const cache = await caches.open(CACHE_NAME);
                await cache.put(request, response.clone());
            }

            return response;
        } catch (error) {
            const fallback =
                await findCachedResponse(request) ??
                await findCachedResponse(toScopedUrl("index.html"));

            if (fallback) {
                return fallback;
            }

            console.warn("Offline navigation was not found in cache:", request.url);
            throw error;
        }
    }

    const cachedResponse = await findCachedResponse(request);

    if (cachedResponse) {
        return cachedResponse;
    }

    try {
        const response = await fetch(request);

        if (response.ok) {
            const cache = await caches.open(CACHE_NAME);
            await cache.put(request, response.clone());
        }

        return response;
    } catch (error) {
        console.warn("Offline request was not found in cache:", request.url);
        throw error;
    }
}

async function findCachedResponse(request) {
    const requestUrl =
        typeof request === "string"
            ? new URL(request, self.location.origin)
            : new URL(request.url);

    const cache = await caches.open(CACHE_NAME);

    return (
        await cache.match(request) ??
        await cache.match(requestUrl.href) ??
        await cache.match(requestUrl.pathname)
    );
}

async function cacheAssets(cache, urls) {
    await Promise.all(
        urls.map(async (url) => {
            try {
                const request = new Request(url, { cache: "no-cache" });
                const response = await fetch(request);

                if (response.ok) {
                    await cache.put(request, response);
                } else {
                    console.warn("Asset was not cached:", url, response.status);
                }
            } catch (error) {
                console.warn("Asset was not cached:", url, error);
            }
        }),
    );
}

async function getBuildAssetsFromIndex() {
    try {
        const response = await fetch(toScopedUrl("index.html"), { cache: "no-cache" });

        if (!response.ok) {
            return [];
        }

        const html = await response.text();
        const assetUrls = new Set();

        const assetRegex = /(?:src|href)="([^"]*\/assets\/[^"]+\.(?:js|css))"/g;

        for (const match of html.matchAll(assetRegex)) {
            const url = new URL(match[1], self.location.origin).href;
            assetUrls.add(url);
        }

        return [...assetUrls];
    } catch (error) {
        console.warn("Build assets were not detected:", error);
        return [];
    }
}
