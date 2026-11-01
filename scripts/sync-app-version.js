import { readFileSync, writeFileSync } from "node:fs";

const appVersion = JSON.parse(
    readFileSync(new URL("../package.json", import.meta.url), "utf8"),
).version;

// npm version provides these variables when it runs the version lifecycle script.
// Manual version:sync runs only align version strings, without consuming a versionCode.
const isVersionBump = process.env.npm_lifecycle_event === "version"
    && typeof process.env.npm_old_version === "string"
    && typeof process.env.npm_new_version === "string"
    && process.env.npm_old_version !== process.env.npm_new_version;

if (isVersionBump && process.env.npm_new_version !== appVersion) {
    throw new Error("The npm version lifecycle does not match package.json");
}

function updatedVersionCode(current) {
    const code = Number(current);

    if (!Number.isSafeInteger(code) || code < 1 || code > 2_100_000_000) {
        throw new Error(`Invalid Android versionCode: ${current}`);
    }

    if (isVersionBump && code === 2_100_000_000) {
        throw new Error("Android versionCode exceeds the Google Play limit");
    }

    return String(isVersionBump ? code + 1 : code);
}

const targets = [
    {
        file: new URL("../src/app/appVersion.ts", import.meta.url),
        replacements: [
            {
                pattern: /(^export const APP_VERSION = ")[^"\r\n]+(";)/m,
                replace: (_match, prefix, suffix) => `${prefix}${appVersion}${suffix}`,
            },
        ],
    },
    {
        file: new URL("../android/app/build.gradle", import.meta.url),
        replacements: [
            {
                pattern: /(^[ \t]*versionName ")[^"\r\n]+(")/m,
                replace: (_match, prefix, suffix) => `${prefix}${appVersion}${suffix}`,
            },
            {
                pattern: /(^[ \t]*versionCode[ \t]+)(\d+)([ \t]*$)/m,
                replace: (_match, prefix, code, suffix) =>
                    `${prefix}${updatedVersionCode(code)}${suffix}`,
            },
        ],
    },
    {
        file: new URL("../src-tauri/Cargo.toml", import.meta.url),
        replacements: [
            {
                pattern: /(\[package\]\r?\nname = "calculator-comrade"\r?\nversion = ")[^"]+(")/,
                replace: (_match, prefix, suffix) => `${prefix}${appVersion}${suffix}`,
            },
        ],
    },
    {
        file: new URL("../src-tauri/Cargo.lock", import.meta.url),
        replacements: [
            {
                pattern: /(\[\[package\]\]\r?\nname = "calculator-comrade"\r?\nversion = ")[^"]+(")/,
                replace: (_match, prefix, suffix) => `${prefix}${appVersion}${suffix}`,
            },
        ],
    },
];

// Validate all files and replacements before writing any changes.
const changes = targets.map(({ file, replacements }) => {
    const content = readFileSync(file, "utf8");
    let updatedContent = content;

    for (const { pattern, replace } of replacements) {
        if (!pattern.test(updatedContent)) {
            throw new Error(`Cannot find Calculator Comrade version in ${file.pathname}`);
        }
        updatedContent = updatedContent.replace(pattern, replace);
    }

    return { file, content, updatedContent };
});

for (const { file, content, updatedContent } of changes) {
    if (updatedContent !== content) {
        writeFileSync(file, updatedContent);
    }
}
