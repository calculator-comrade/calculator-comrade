// Route paths without the deployment base URL.
// Shared by the application router and the GitHub Pages build script.
export const routePaths = {
    home: "",
    calculator: "calculator/",
    calculatorSettings: "calculator/settings/",
    privacy: "privacy-policy/",
    terms: "terms-of-use/",
    license: "license/",
    tips: "tips-n-tricks/",
} as const;
