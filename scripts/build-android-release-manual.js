import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { emitKeypressEvents } from "node:readline";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const propertiesFile = join(projectRoot, "android", "keystore.properties");
const secretPropertyNames = ["storePassword", "keyPassword"];

function signingEnvironmentVariables() {
    if (!existsSync(propertiesFile)) {
        throw new Error("Missing android/keystore.properties (see docs/android-release.md)");
    }

    // Match the simple properties format used by our release build script.
    // Both literal passwords and ${env:NAME} references remain supported.
    const properties = new Map();
    for (const line of readFileSync(propertiesFile, "utf8").split(/\r?\n/)) {
        if (!line.trim() || /^\s*[#!]/.test(line)) continue;
        const match = /^\s*([^=:\s]+)\s*[=:]\s*(.*)$/.exec(line);
        if (match) properties.set(match[1], match[2].trim());
    }

    const prompts = new Map();
    for (const name of secretPropertyNames) {
        const value = properties.get(name);
        if (!value) throw new Error(`Missing '${name}' in android/keystore.properties`);
        const match = /^\$\{env:([A-Za-z_][A-Za-z0-9_]*)\}$/.exec(value);
        if (match) {
            // Prompt once even if both passwords reference the same variable.
            if (!prompts.has(match[1])) prompts.set(match[1], name);
        } else if (value.startsWith("${env:")) {
            throw new Error(`Invalid environment reference for '${name}' in android/keystore.properties`);
        }
    }
    return prompts;
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
    if (!process.stdin.isTTY || !process.stdout.isTTY || typeof process.stdin.setRawMode !== "function") {
        throw new Error("Interactive build requires a terminal. Use 'npm run android:bundle:release' in CI/CD.");
    }
    const npmCli = process.env.npm_execpath;
    if (!npmCli || !existsSync(npmCli)) {
        throw new Error("Run this script via 'npm run android:bundle:release:manual'.");
    }

    const variables = signingEnvironmentVariables();
    const childEnv = { ...process.env };
    emitKeypressEvents(process.stdin);
    for (const [variable, property] of variables) {
        childEnv[variable] = await readSecret(`${property} (${variable})`);
    }

    // Invoke the existing CI-compatible command, using npm's JavaScript CLI
    // rather than npm.cmd: this works on Windows, Linux, and macOS without a shell.
    const result = spawnSync(process.execPath, [npmCli, "run", "android:bundle:release"], {
        cwd: projectRoot,
        env: childEnv,
        stdio: "inherit",
    });
    // Do not put secrets into the current shell or process.env.
    for (const variable of variables.keys()) delete childEnv[variable];
    if (result.error) throw new Error(`Cannot launch npm: ${result.error.message}`);
    if (result.signal) {
        throw new Error(`Release build terminated by signal ${result.signal}`);
    }
    process.exitCode = result.status ?? 1;
}

main().catch((error) => {
    console.error(`\nInteractive Android release build failed: ${error.message}`);
    process.exitCode = 1;
});
