import { assetUrl } from "./assetUrl.ts";
import { routePaths } from "./routePaths.ts";

export const routes = Object.fromEntries(
    Object.entries(routePaths).map(([key, path]) => [key, assetUrl(path)]),
) as { [K in keyof typeof routePaths]: string };

export type RouteKey = keyof typeof routes;
