import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { emitKeypressEvents } from "node:readline";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const propertiesFile = join(projectRoot, "android", "keystore.properties");
const coreScript = fileURLToPath(new URL("./build-android-aab-core.js", import.meta.url));
const secretPropertyNames = ["storePassword", "keyPassword"];

function missingSigningEnvironmentVariables() {
    if (!existsSync(propertiesFile)) {
        throw new Error("Missing android/keystore.properties (see docs/android-release.md)");
    }

    // Match the simple properties format used by the core release builder.
    // Literal passwords are supported; ${env:NAME} references are preferred.
    const properties = new Map();
    for (const line of readFileSync(propertiesFile, "utf8").split(/\r?\n/)) {
        if (!line.trim() || /^\s*[#!]/.test(line)) continue;
        const match = /^\s*([^=:\s]+)\s*[=:]\s*(.*)$/.exec(line);
        if (match) properties.set(match[1], match[2].trim());
    }

    const missing = new Map();
    for (const name of secretPropertyNames) {
        const value = properties.get(name);
        if (!value) throw new Error(`Missing '${name}' in android/keystore.properties`);
        const match = /^\$\{env:([A-Za-z_][A-Za-z0-9_]*)\}$/.exec(value);
        if (match) {
            // One prompt per distinct variable, and only when not already set.
            const variable = match[1];
            if (!process.env[variable] && !missing.has(variable)) {
                missing.set(variable, name);
            }
        } else if (value.startsWith("${env:")) {
            throw new Error(`Invalid environment reference for '${name}' in android/keystore.properties`);
        }
    }
    return missing;
}

function readSecret(prompt) {
    return new Promise((resolve, reject) => {
        let secret = "";
        const previouslyRaw = process.stdin.isRaw === true;
        const finish = (error) => {
            process.stdin.removeListener("keypress", onKeypress);
            process.stdin.setRawMode(previouslyRaw);
            process.stdin.pause();
            process.stdout.write("\n");
            if (error) reject(error);
            else resolve(secret);
        };
        const onKeypress = (characters, key) => {
            if ((key?.ctrl && key?.name === "c") || key?.name === "escape") {
                finish(new Error("Cancelled"));
            } else if (key?.name === "return" || key?.name === "enter") {
                finish(secret.length === 0 ? new Error("Password cannot be empty") : null);
            } else if (key?.name === "backspace" || key?.name === "delete") {
                secret = Array.from(secret).slice(0, -1).join("");
            } else if (!key?.ctrl && !key?.meta && typeof characters === "string") {
                // Raw terminal input is not echoed; handle typing and pasting.
                secret += characters.replace(/[\r\n]/g, "");
            }
        };

        process.stdin.on("keypress", onKeypress);
        process.stdin.setRawMode(true);
        process.stdin.resume();
        // Enable no-echo mode before displaying the prompt to avoid an input race.
        process.stdout.write(`${prompt}: `);
    });
}

async function main() {
    const missing = missingSigningEnvironmentVariables();
    if (missing.size > 0) {
        if (!process.stdin.isTTY || !process.stdout.isTTY || typeof process.stdin.setRawMode !== "function") {
            throw new Error(
                `Missing signing environment variable(s): ${[...missing.keys()].join(", ")}. ` +
                "Set them in CI/CD or run 'npm run build:android:aab' in an interactive terminal.",
            );
        }
        emitKeypressEvents(process.stdin);
    }

    const childEnv = { ...process.env };
    try {
        for (const [variable, property] of missing) {
            childEnv[variable] = await readSecret(`${property} (${variable})`);
        }

        // No public CI/manual distinction: call the core directly via Node.
        // Secrets are passed only in the child process environment, never as arguments.
        const result = spawnSync(process.execPath, [coreScript], {
            cwd: projectRoot,
            env: childEnv,
            stdio: "inherit",
            windowsHide: true,
        });
        if (result.error) throw new Error(`Cannot launch Android AAB builder: ${result.error.message}`);
        if (result.signal) throw new Error(`Android AAB build terminated by signal ${result.signal}`);
        process.exitCode = result.status ?? 1;
    } finally {
        // Do not mutate the parent shell or process.env; discard only prompted secrets.
        for (const variable of missing.keys()) delete childEnv[variable];
    }
}

main().catch((error) => {
    console.error(`\nAndroid AAB build failed: ${error.message}`);
    process.exitCode = 1;
});
