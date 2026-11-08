// Route definitions shared by the application and the GitHub Pages build.
// Paths are relative to the deployment base URL.
export const siteBaseUrl = "https://calculator-comrade.github.io/calculator-comrade/";
export const openGraphImagePath = "screenshots/screenshot-wide.png";

type RouteDefinition = {
    path: string;
    title: string;
    description: string;
    indexable: boolean;
};

export const routeDefinitions = {
    home: {
        path: "",
        title: "Calculator Comrade — Free Classic 8-Digit Calculator",
        description: "Calculator Comrade is a free, open-source replica of a classic 8-digit pocket calculator. Authentic calculator behavior, no ads or in-app purchases.",
        indexable: true,
    },
    calculator: {
        path: "calculator/",
        title: "Online 8-Digit Calculator | Calculator Comrade",
        description: "Use Calculator Comrade online: a free replica of a classic 8-digit pocket calculator with memory operations and authentic arithmetic behavior.",
        indexable: true,
    },
    calculatorSettings: {
        path: "calculator/settings/",
        title: "Calculator Settings | Calculator Comrade",
        description: "Configure sound, vibration, and other Calculator Comrade preferences.",
        indexable: false,
    },
    privacy: {
        path: "privacy-policy/",
        title: "Privacy Policy | Calculator Comrade",
        description: "Learn how Calculator Comrade handles privacy, locally saved settings, and calculator state.",
        indexable: true,
    },
    terms: {
        path: "terms-of-use/",
        title: "Terms of Use | Calculator Comrade",
        description: "Read the terms of use for Calculator Comrade, a free, non-commercial calculator application.",
        indexable: true,
    },
    license: {
        path: "license/",
        title: "Open Source Licenses | Calculator Comrade",
        description: "Read the Calculator Comrade MIT License and the notices for third-party open-source components.",
        indexable: true,
    },
    tips: {
        path: "tips-n-tricks/",
        title: "Calculator Tips & Tricks | Calculator Comrade",
        description: "Explore keyboard shortcuts and classic pocket calculator tricks: repeated operations, memory functions, percentages, and more.",
        indexable: true,
    },
} as const satisfies Record<string, RouteDefinition>;

// Preserve the simple path lookup used by the application.
export const routePaths = Object.fromEntries(
    Object.entries(routeDefinitions).map(([key, definition]) => [key, definition.path]),
) as { [K in keyof typeof routeDefinitions]: (typeof routeDefinitions)[K]["path"] };
