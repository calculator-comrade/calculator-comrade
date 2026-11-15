import type { RouteKey } from "../shared/routes.ts";
import { routes } from "../shared/routes.ts";
import { HomePage } from "./pages/HomePage.tsx";
import { TipsAndTricksPage } from "./pages/TipsAndTricksPage.tsx";
import { LicensePage } from "./pages/LicensePage.tsx";
import { PrivacyPolicyPage } from "./pages/PrivacyPolicyPage.tsx";
import { TermsOfUsePage } from "./pages/TermsOfUsePage.tsx";

export type SiteContentPage = Exclude<RouteKey, "calculator" | "calculatorSettings">;

function getPageLinkClassName(page: SiteContentPage, currentPage: SiteContentPage, baseClassName: string): string {
    return page === currentPage ? `${baseClassName} ${baseClassName}--active` : baseClassName;
}

function getAriaCurrent(page: SiteContentPage, currentPage: SiteContentPage): "page" | undefined {
    return page === currentPage ? "page" : undefined;
}

export function SiteContent({ page }: { page: SiteContentPage }) {
    return (
        <div className="site-shell">
            <header className="site-header">
                <a className="site-title" href={routes.home}>Calculator Comrade</a>
                <nav className="site-nav" aria-label="Main navigation">
                    <a
                        className={getPageLinkClassName("home", page, "site-nav__link")}
                        aria-current={getAriaCurrent("home", page)}
                        href={routes.home}
                    >
                        Home
                    </a>
                    <a className="site-nav__link" href={routes.calculator}>Calculator</a>
                    <a
                        className={getPageLinkClassName("tips", page, "site-nav__link")}
                        aria-current={getAriaCurrent("tips", page)}
                        href={routes.tips}
                    >
                        Tips & Tricks
                    </a>
                </nav>
            </header>

            <main className="site-main">
                {page === "home" && <HomePage />}
                {page === "tips" && <TipsAndTricksPage />}
                {page === "privacy" && <PrivacyPolicyPage />}
                {page === "terms" && <TermsOfUsePage />}
                {page === "license" && <LicensePage />}
            </main>

            <footer className="site-footer">
                <nav className="site-footer__nav" aria-label="Legal navigation">
                    <a
                        className={getPageLinkClassName("privacy", page, "site-footer__link")}
                        aria-current={getAriaCurrent("privacy", page)}
                        href={routes.privacy}
                    >
                        Privacy Policy
                    </a>
                    <a
                        className={getPageLinkClassName("terms", page, "site-footer__link")}
                        aria-current={getAriaCurrent("terms", page)}
                        href={routes.terms}
                    >
                        Terms of Use
                    </a>
                    <a
                        className={getPageLinkClassName("license", page, "site-footer__link")}
                        aria-current={getAriaCurrent("license", page)}
                        href={routes.license}
                    >
                        License
                    </a>
                </nav>
            </footer>
        </div>
    );
}
