import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const artifactsDir = join(projectRoot, "artifacts", "android");

function fail(message) {
    throw new Error(message);
}

function filePath(value) {
    return isAbsolute(value) ? value : resolve(projectRoot, value);
}

function requireFile(path, description) {
    if (!existsSync(path) || !statSync(path).isFile()) fail(`${description} not found: ${path}`);
    return path;
}

function findBundle() {
    if (process.argv.length > 3) fail("Usage: npm run android:apk -- [path/to/bundle.aab]");
    if (process.argv[2]) {
        const path = filePath(process.argv[2]);
        if (!path.toLowerCase().endsWith(".aab")) fail(`Not an AAB file: ${path}`);
        return requireFile(path, "AAB");
    }
    if (!existsSync(artifactsDir)) fail("No AAB found. Build a release bundle first.");
    const candidates = readdirSync(artifactsDir)
        .filter(name => name.toLowerCase().endsWith(".aab"))
        .map(name => ({ name, path: join(artifactsDir, name) }))
        .filter(item => statSync(item.path).isFile())
        .sort((a, b) => statSync(b.path).mtimeMs - statSync(a.path).mtimeMs || b.name.localeCompare(a.name));
    if (candidates.length === 0) fail("No AAB files in artifacts/android/. Build an AAB first.");
    return candidates[0].path;
}

function findBundletool() {
    const specified = process.env.BUNDLETOOL_JAR?.trim();
    if (!specified) {
        fail("BUNDLETOOL_JAR is not set. Point it to a bundletool JAR downloaded from https://github.com/google/bundletool/releases");
    }
    return requireFile(filePath(specified), "BUNDLETOOL_JAR");
}

function jdkTool(name) {
    const home = process.env.JAVA_HOME?.trim();
    if (!home) fail("JAVA_HOME is not set. Point it to a complete JDK, as for the Android release build.");
    const executable = `${name}${process.platform === "win32" ? ".exe" : ""}`;
    return requireFile(join(resolve(home), "bin", executable), `JAVA_HOME ${name}`);
}

function run(command, args, cwd) {
    const result = spawnSync(command, args, { cwd, env: process.env, stdio: "inherit", windowsHide: true });
    if (result.error) fail(`${basename(command)}: ${result.error.message}`);
    if (result.status !== 0) fail(`${basename(command)} failed (exit code ${result.status ?? "unknown"})`);
}

let tmp = null;
try {
    const bundle = findBundle();
    const bundletool = findBundletool();
    const java = jdkTool("java");
    const jar = jdkTool("jar");
    const outputDir = dirname(bundle);
    const stem = basename(bundle).replace(/\.aab$/i, "");
    const apks = join(outputDir, `${stem}.apks`);
    const apk = join(outputDir, `${stem}.apk`);
    console.log(`Input:      ${relative(projectRoot, bundle)}`);
    console.log(`Bundletool: ${bundletool}`);
    console.log("Signing:    local debug key (not Google Play app signing key)");
    // Remove same-name artifacts to avoid mistaking old outputs for new ones.
    rmSync(apks, { force: true });
    rmSync(apk, { force: true });
    run(java, ["-jar", bundletool, "build-apks", `--bundle=${bundle}`, `--output=${apks}`, "--mode=universal"], projectRoot);
    requireFile(apks, "APK Set");
    tmp = mkdtempSync(join(tmpdir(), "calculator-comrade-apk-"));
    // `jar` is part of the JDK and works on Windows/Linux/macOS (unlike `unzip`).
    run(jar, ["xf", apks, "universal.apk"], tmp);
    const extracted = requireFile(join(tmp, "universal.apk"), "universal.apk in APK Set");
    if (statSync(extracted).size === 0) fail("Extracted universal.apk is empty");
    mkdirSync(outputDir, { recursive: true });
    copyFileSync(extracted, apk);
    console.log(`\nUniversal APK ready: ${apk}`);
    console.log(`APK Set:             ${apks}`);
    console.log(`Install via: adb install -r "${apk}"`);
    console.log("NOTE: Debug-signed APK cannot update a differently signed Google Play installation.");
} catch (error) {
    console.error(`\nAndroid APK generation failed: ${error.message}`);
    process.exitCode = 1;
} finally {
    if (tmp) rmSync(tmp, { force: true, recursive: true });
}
