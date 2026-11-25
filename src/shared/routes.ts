import { assetUrl } from "./assetUrl.ts";
import { routePaths } from "./routeDefinitions.ts";

// Keep route construction compatible with Android WebView 69.
export const routes = Object.entries(routePaths).reduce<Record<string, string>>(
    (resolvedRoutes, [key, path]) => {
        resolvedRoutes[key] = assetUrl(path);
        return resolvedRoutes;
    },
    {},
) as { [K in keyof typeof routePaths]: string };

export type RouteKey = keyof typeof routes;
