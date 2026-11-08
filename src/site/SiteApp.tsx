import { useEffect, useState } from "react";
import { CalculatorApp } from "../app/CalculatorApp.tsx";
import { routes } from "../shared/routes.ts";
import { goBackOrReplace, subscribeToNavigationChanges } from "../platforms/web/webNavigation.ts";
import { isAndroidApp, isStandaloneApp } from "../platforms/appEnvironment.ts";
import { App as CapacitorApp } from "@capacitor/app";
import { HomePage } from "./pages/HomePage.tsx";
import { TipsAndTricksPage } from "./pages/TipsAndTricksPage.tsx";
import { LicensePage } from "./pages/LicensePage.tsx";
import { PrivacyPolicyPage } from "./pages/PrivacyPolicyPage.tsx";
import { TermsOfUsePage } from "./pages/TermsOfUsePage.tsx";
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

function getPageLinkClassName(page: SitePage, currentPage: SitePage, baseClassName: string): string {
    return page === currentPage ? `${baseClassName} ${baseClassName}--active` : baseClassName;
}

function getAriaCurrent(page: SitePage, currentPage: SitePage): "page" | undefined {
    return page === currentPage ? "page" : undefined;
}

function isStandalonePage(page: SitePage): boolean {
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

    return (
        <div className="site-shell">
            <header className="site-header">
                <a className="site-title" href={routes.home}>Calculator Comrade</a>
                <nav className="site-nav" aria-label="Main navigation">
                    <a
                        className={getPageLinkClassName("home", currentPage, "site-nav__link")}
                        aria-current={getAriaCurrent("home", currentPage)}
                        href={routes.home}
                    >
                        Home
                    </a>
                    <a className="site-nav__link" href={routes.calculator}>Calculator</a>
                    <a
                        className={getPageLinkClassName("tips", currentPage, "site-nav__link")}
                        aria-current={getAriaCurrent("tips", currentPage)}
                        href={routes.tips}
                    >
                        Tips & Tricks
                    </a>
                </nav>
            </header>

            <main className="site-main">
                {currentPage === "home" && <HomePage />}
                {currentPage === "tips" && <TipsAndTricksPage />}
                {currentPage === "privacy" && <PrivacyPolicyPage />}
                {currentPage === "terms" && <TermsOfUsePage />}
                {currentPage === "license" && <LicensePage />}
            </main>

            <footer className="site-footer">
                <nav className="site-footer__nav" aria-label="Legal navigation">
                    <a
                        className={getPageLinkClassName("privacy", currentPage, "site-footer__link")}
                        aria-current={getAriaCurrent("privacy", currentPage)}
                        href={routes.privacy}
                    >
                        Privacy Policy
                    </a>
                    <a
                        className={getPageLinkClassName("terms", currentPage, "site-footer__link")}
                        aria-current={getAriaCurrent("terms", currentPage)}
                        href={routes.terms}
                    >
                        Terms of Use
                    </a>
                    <a
                        className={getPageLinkClassName("license", currentPage, "site-footer__link")}
                        aria-current={getAriaCurrent("license", currentPage)}
                        href={routes.license}
                    >
                        License
                    </a>
                </nav>
            </footer>
        </div>
    );
}
