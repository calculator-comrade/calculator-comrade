import { StrictMode } from "react";
import { renderToString } from "react-dom/server";
import { routeDefinitions } from "../shared/routeDefinitions.ts";
import { SiteContent, type SiteContentPage } from "./SiteContent.tsx";

// Build-time only: never import CalculatorApp or browser/platform APIs here.
export function renderSitePage(page: SiteContentPage): string {
    if (!routeDefinitions[page].prerender) {
        throw new Error(`Route cannot be prerendered: ${page}`);
    }

    return renderToString(
        <StrictMode>
            <SiteContent page={page} />
        </StrictMode>,
    );
}
