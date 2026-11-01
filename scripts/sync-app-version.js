import { readFileSync, writeFileSync } from "node:fs";

const appVersion = JSON.parse(
    readFileSync(new URL("../package.json", import.meta.url), "utf8"),
).version;

const targets = [
    {
        file: new URL("../src/app/appVersion.ts", import.meta.url),
        pattern: /(^export const APP_VERSION = ")[^"\r\n]+(";)/m,
    },
    {
        file: new URL("../android/app/build.gradle", import.meta.url),
        pattern: /(^[ \t]*versionName ")[^"\r\n]+(")/m,
    },
    {
        file: new URL("../src-tauri/Cargo.toml", import.meta.url),
        pattern: /(\[package\]\r?\nname = "calculator-comrade"\r?\nversion = ")[^"]+(")/,
    },
    {
        file: new URL("../src-tauri/Cargo.lock", import.meta.url),
        pattern: /(\[\[package\]\]\r?\nname = "calculator-comrade"\r?\nversion = ")[^"]+(")/,
    },
];

const changes = targets.map(({ file, pattern }) => {
    const content = readFileSync(file, "utf8");

    if (!pattern.test(content)) {
        throw new Error(`Cannot find Calculator Comrade version in ${file.pathname}`);
    }

    const updatedContent = content.replace(
        pattern,
        (_match, prefix, suffix) => `${prefix}${appVersion}${suffix}`,
    );

    return { file, content, updatedContent };
});

for (const { file, content, updatedContent } of changes) {
    if (updatedContent !== content) {
        writeFileSync(file, updatedContent);
    }
}
