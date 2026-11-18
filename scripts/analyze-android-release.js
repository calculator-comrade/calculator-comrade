import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const artifactsDir = join(projectRoot, "artifacts", "android");
const cli = process.platform === "win32" ? "android.exe" : "android";

function fail(message) {
    throw new Error(message);
}

function runAndroid(args) {
    const result = spawnSync(cli, args, {
        cwd: projectRoot,
        encoding: "utf8",
        maxBuffer: 32 * 1024 * 1024,
        windowsHide: true,
    });
    if (result.error) fail(`Android CLI: ${result.error.message}`);
    if (result.status !== 0) {
        fail(`Android CLI failed (exit code ${result.status ?? "unknown"}): ${result.stderr?.trim() || result.stdout?.trim() || args.join(" ")}`);
    }
    return result;
}

function findBundles() {
    const inputs = process.argv.slice(2);
    if (inputs.length > 0) {
        return inputs.map(input => {
            const path = isAbsolute(input) ? input : resolve(projectRoot, input);
            if (!existsSync(path) || !statSync(path).isFile() || !path.toLowerCase().endsWith(".aab")) {
                fail(`AAB file does not exist: ${path}`);
            }
            return path;
        });
    }
    if (!existsSync(artifactsDir)) {
        fail(`No Android release artifacts found in ${relative(projectRoot, artifactsDir)}. Build an AAB first.`);
    }
    const candidates = readdirSync(artifactsDir)
        .filter(name => name.toLowerCase().endsWith(".aab"))
        .map(name => {
            const path = join(artifactsDir, name);
            return { path, name, stat: statSync(path) };
        })
        .filter(item => item.stat.isFile())
        .sort((a, b) => b.stat.mtimeMs - a.stat.mtimeMs || b.name.localeCompare(a.name));
    if (candidates.length === 0) fail("No .aab files found in artifacts/android. Build an AAB first.");
    return [candidates[0].path];
}

function pick(text, pattern) {
    return pattern.exec(text)?.[1] ?? null;
}

function extractMetrics(text) {
    const stats = /\bStats:\s*shrinking=([\d.]+)%,\s*optimization=([\d.]+)%,\s*obfuscation=([\d.]+)%/.exec(text);
    return {
        agpVersion: pick(text, /\bAGP Version:\s*([^\r\n]+)/),
        dexSize: pick(text, /\bUncompressed Dex Size:\s*([^\r\n]+)/),
        r8Version: pick(text, /\bR8 Version:\s*([^\r\n]+)/),
        r8Enabled: pick(text, /\bR8 Enabled=(true|false)/),
        shrinking: stats?.[1] ?? null,
        optimization: stats?.[2] ?? null,
        obfuscation: stats?.[3] ?? null,
        heuristicObfuscation: pick(text, /\bDex Heuristic Obfuscation:\s*([\d.]+%)/),
    };
}

function reportMarkdown(bundlePath, sha256, text, stderr) {
    const info = extractMetrics(text);
    const value = (x) => x ?? "Not reported";
    const relBundle = relative(projectRoot, bundlePath).replaceAll("\\", "/");
    const lines = [
        "# Calculator Comrade — Android DEX analysis",
        "",
        `- **AAB:** \`${relBundle}\``,
        `- **AAB SHA-256:** \`${sha256}\``,
        `- **Generated (UTC):** ${new Date().toISOString()}`,
        "- **Analyzer:** Google Android CLI (`android analyze --analysis=optimization`)",
        "",
        "## Optimization summary",
        "",
        "| Metric | Value |",
        "| --- | --- |",
        `| AGP version | ${value(info.agpVersion)} |`,
        `| Uncompressed DEX size | ${value(info.dexSize)} |`,
        `| R8 enabled | ${value(info.r8Enabled)} |`,
        `| R8 version | ${value(info.r8Version)} |`,
        `| Shrinking | ${info.shrinking === null ? "Not reported" : `${info.shrinking}%`} |`,
        `| Optimization | ${info.optimization === null ? "Not reported" : `${info.optimization}%`} |`,
        `| Obfuscation | ${info.obfuscation === null ? "Not reported" : `${info.obfuscation}%`} |`,
        `| Heuristic obfuscation | ${value(info.heuristicObfuscation)} |`,
        "",
        "Values above are copied from the official Android CLI output. Missing values are not assumed to be zero.",
        "",
        "## Full Android CLI output",
        "",
        "```text",
        text.trimEnd(),
        "```",
    ];
    if (stderr.trim()) lines.push("", "## CLI warnings / stderr", "", "```text", stderr.trimEnd(), "```");
    return lines.join("\n") + "\n";
}

try {
    // This tool is deliberately optional and does not affect release builds or CI.
    const probe = spawnSync(cli, ["--version"], { cwd: projectRoot, encoding: "utf8", windowsHide: true });
    if (probe.error?.code === "ENOENT") {
        console.log("Android CLI is not installed or is not in PATH. Skipping Android analysis.");
        console.log("Install it from https://developer.android.com/tools/agents/android-cli to enable npm run android:analyze.");
    } else if (probe.error || probe.status !== 0) {
        fail(`Cannot run Android CLI: ${probe.error?.message ?? probe.stderr?.trim() ?? "unknown error"}`);
    } else {
        const bundles = findBundles();
        for (const bundle of bundles) {
            console.log(`\nAnalyzing ${relative(projectRoot, bundle)} ...`);
            const textResult = runAndroid(["analyze", "--analysis=optimization", bundle]);
            const jsonResult = runAndroid(["analyze", "--analysis=optimization", "--format=json", bundle]);
            let json;
            try {
                json = JSON.parse(jsonResult.stdout);
            } catch {
                fail("Android CLI did not return valid JSON. Check the installed Android CLI version.");
            }
            if (json === null || typeof json !== "object") fail("Android CLI JSON result is not an object.");
            const sha256 = createHash("sha256").update(readFileSync(bundle)).digest("hex");
            const stem = basename(bundle).replace(/\.aab$/i, "");
            // Use the same directory as the analyzed AAB (not necessarily artifacts/android).
            const actualOutDir = dirname(bundle);
            mkdirSync(actualOutDir, { recursive: true });
            const reportPath = join(actualOutDir, `${stem}-analysis.md`);
            const jsonPath = join(actualOutDir, `${stem}-analysis.json`);
            writeFileSync(reportPath, reportMarkdown(bundle, sha256, textResult.stdout, textResult.stderr || ""));
            writeFileSync(jsonPath, JSON.stringify(json, null, 2) + "\n");
            console.log(textResult.stdout.trim());
            console.log(`Report: ${relative(projectRoot, reportPath)}`);
            console.log(`JSON:   ${relative(projectRoot, jsonPath)}`);
        }
    }
} catch (error) {
    console.error(`\nAndroid analysis failed: ${error.message}`);
    process.exitCode = 1;
}
