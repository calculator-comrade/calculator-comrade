import { useEffect, useState } from "react";
import { CalculatorApp } from "../app/CalculatorApp.tsx";
import { routes } from "../shared/routes.ts";
import { goBackOrReplace, subscribeToNavigationChanges } from "../platforms/web/webNavigation.ts";
import { isAndroidApp, isStandaloneApp } from "../platforms/appEnvironment.ts";
import { App as CapacitorApp } from "@capacitor/app";
import { SiteContent } from "./SiteContent.tsx";
import { markAppStartupReady } from "../app/startup/appStartupCover.ts";

type SitePage =
    | "home"
    | "calculator"
    | "calculatorSettings"
    | "tips"
    | "privacy"
    | "terms"
    | "license";

function getCurrentPage(): SitePage {
    // routes.home is the normalized Vite base path (including the trailing slash).
    const basePath = routes.home;
    let path = window.location.pathname;

    if (basePath !== "/" && path.startsWith(basePath)) {
        path = `/${path.slice(basePath.length)}`;
    }

    if (path === "/calculator/settings" || path === "/calculator/settings/") {
        return "calculatorSettings";
    }

    if (path === "/calculator" || path === "/calculator/") {
        return "calculator";
    }

    if (path === "/tips-n-tricks" || path === "/tips-n-tricks/") {
        return "tips";
    }

    if (path === "/privacy-policy" || path === "/privacy-policy/") {
        return "privacy";
    }

    if (path === "/terms-of-use" || path === "/terms-of-use/") {
        return "terms";
    }

    if (path === "/license" || path === "/license/") {
        return "license";
    }

    return "home";
}

function isStandalonePage(page: SitePage): page is "calculator" | "calculatorSettings" {
    return page === "calculator" || page === "calculatorSettings";
}

function getCurrentAppPage(): SitePage {
    const currentPage = getCurrentPage();

    if (!isStandaloneApp) {
        return currentPage;
    }

    if (currentPage === "calculator" || currentPage === "calculatorSettings") {
        return currentPage;
    }

    return "calculator";
}

export function SiteApp() {
    const [currentPage, setCurrentPage] = useState(getCurrentAppPage);

    useEffect(() => {
        return subscribeToNavigationChanges(() => {
            setCurrentPage(getCurrentAppPage());
        });
    }, []);

    useEffect(() => {
        if (isStandalonePage(currentPage)) {
            return;
        }

        window.requestAnimationFrame(() => {
            markAppStartupReady();
        });
    }, [currentPage]);

    useEffect(() => {
        if (!isAndroidApp) {
            return undefined;
        }

        let listenerRemoved = false;
        let removeListener: (() => void) | null = null;

        void CapacitorApp.addListener("backButton", () => {
            if (currentPage === "calculatorSettings") {
                goBackOrReplace(routes.calculator);
                return;
            }

            void CapacitorApp.minimizeApp();
        }).then((listenerHandle) => {
            if (listenerRemoved) {
                void listenerHandle.remove();
                return;
            }

            removeListener = () => {
                void listenerHandle.remove();
            };
        });

        return () => {
            listenerRemoved = true;
            removeListener?.();
        };
    }, [currentPage]);

    if (isStandalonePage(currentPage)) {
        return <CalculatorApp settingsDialogOpen={currentPage === "calculatorSettings"} />;
    }

    return <SiteContent page={currentPage} />;
}
