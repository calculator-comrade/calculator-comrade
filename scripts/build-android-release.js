import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { basename, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const androidDir = join(projectRoot, "android");
const propertiesFile = join(androidDir, "keystore.properties");
const gradleFile = join(androidDir, "app", "build.gradle");
const bundlePath = join(androidDir, "app", "build", "outputs", "bundle", "release", "app-release.aab");
const expectedApplicationId = "ru.robotmitya.comrade";

function fail(message) {
    throw new Error(message);
}

function run(command, args, options = {}) {
    const child = spawnSync(command, args, {
        cwd: projectRoot,
        stdio: "inherit",
        env: process.env,
        ...options,
    });
    if (child.error) fail(`${command}: ${child.error.message}`);
    if (child.status !== 0) fail(`${command} failed (exit code ${child.status ?? "unknown"})`);
}

function capture(command, args) {
    const child = spawnSync(command, args, {
        cwd: projectRoot,
        encoding: "utf8",
        env: { ...process.env, LC_ALL: "C" },
    });
    if (child.error) fail(`${command}: ${child.error.message}`);
    if (child.status !== 0) fail(`${command}: ${child.stderr?.trim() || "failed"}`);
    return child.stdout;
}

function readProperties(path) {
    // Only simple (non-secret) property values are needed by this script.
    // Gradle/Java Properties handles the passwords; these are never logged.
    const props = new Map();
    for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
        if (/^\s*[#!]/.test(line) || !line.trim()) continue;
        const match = /^\s*([^=:\s]+)\s*[=:]\s*(.*)$/.exec(line);
        if (match) props.set(match[1], match[2].trim());
    }
    return props;
}

function checkSigningSecret(name, props) {
    const value = props.get(name);
    if (!value) fail(`Missing '${name}' in android/keystore.properties`);
    const match = /^\$\{env:([A-Za-z_][A-Za-z0-9_]*)\}$/.exec(value);
    if (match) {
        if (!process.env[match[1]]) {
            fail(`Environment variable '${match[1]}' for '${name}' is not set`);
        }
    } else if (value.startsWith("${env:")) {
        fail(`Invalid environment reference for '${name}' in android/keystore.properties`);
    }
}

function propertyPath(name, props) {
    const value = props.get(name);
    if (!value || value.startsWith("/absolute/path/")) {
        fail(`Set '${name}' in android/keystore.properties`);
    }
    const path = isAbsolute(value) ? value : resolve(androidDir, value);
    if (!existsSync(path) || !statSync(path).isFile()) {
        fail(`File for '${name}' does not exist: ${path}`);
    }
    return path;
}

function gradleValue(text, regex, field) {
    const match = regex.exec(text);
    if (!match) fail(`Cannot find ${field} in android/app/build.gradle`);
    return match[1];
}

function sha256Fingerprint(output, origin) {
    const match = /\bSHA256:\s*([a-f\d:]{59,})/i.exec(output);
    if (!match) fail(`Cannot read certificate SHA-256 from ${origin}`);
    return match[1].replaceAll(":", "").toUpperCase();
}

try {
    if (!existsSync(propertiesFile)) {
        fail("Missing android/keystore.properties. See android/keystore.properties.example and docs/android-release.md");
    }
    const properties = readProperties(propertiesFile);
    for (const name of ["storeFile", "storePassword", "keyAlias", "keyPassword", "uploadCertificate"]) {
        if (!properties.get(name)) fail(`Missing '${name}' in android/keystore.properties`);
    }
    checkSigningSecret("storePassword", properties);
    checkSigningSecret("keyPassword", properties);
    const keystore = propertyPath("storeFile", properties);
    const expectedCertificate = propertyPath("uploadCertificate", properties);
    if (keystore === expectedCertificate) fail("Keystore and certificate cannot be the same file");

    const pkg = JSON.parse(readFileSync(join(projectRoot, "package.json"), "utf8"));
    const gradle = readFileSync(gradleFile, "utf8");
    const applicationId = gradleValue(gradle, /^\s*applicationId\s+"([^"]+)"/m, "applicationId");
    const versionName = gradleValue(gradle, /^\s*versionName\s+"([^"]+)"/m, "versionName");
    const versionCode = Number(gradleValue(gradle, /^\s*versionCode\s+(\d+)\s*$/m, "versionCode"));
    if (applicationId !== expectedApplicationId) fail(`Unexpected applicationId: ${applicationId}`);
    if (versionName !== pkg.version) fail(`Version mismatch: package.json=${pkg.version}, Gradle=${versionName}`);
    if (!Number.isSafeInteger(versionCode) || versionCode < 1) fail(`Invalid versionCode: ${versionCode}`);

    // Invalidate the previous same-version release before doing any new work.
    const outDir = join(projectRoot, "artifacts", "android");
    const outputFile = join(outDir, `calculator-comrade-${versionName}-${versionCode}.aab`);
    rmSync(outputFile, { force: true });

    // Use the JDK selected by the user's environment or CI.
    // Gradle reads JAVA_HOME directly; use absolute paths for JDK signing tools.
    const javaHomeSetting = process.env.JAVA_HOME?.trim();
    if (!javaHomeSetting) {
        fail("JAVA_HOME is not set. Set it to the root of a supported JDK.");
    }
    const javaHome = resolve(javaHomeSetting);
    const javaBin = join(javaHome, "bin");
    const exe = process.platform === "win32" ? ".exe" : "";
    for (const tool of ["java", "javac", "keytool", "jarsigner"]) {
        const toolPath = join(javaBin, `${tool}${exe}`);
        if (!existsSync(toolPath) || !statSync(toolPath).isFile()) {
            fail(`Invalid JAVA_HOME: missing ${toolPath}. A complete JDK is required.`);
        }
    }
    const keytool = join(javaBin, `keytool${exe}`);
    const jarsigner = join(javaBin, `jarsigner${exe}`);
    console.log(`Using JAVA_HOME: ${javaHome}`);

    const expectedFingerprint = sha256Fingerprint(
        capture(keytool, ["-printcert", "-file", expectedCertificate]),
        basename(expectedCertificate),
    );
    console.log(`Building Calculator Comrade ${versionName} (${versionCode}) for Google Play...`);
    // npm_execpath is set by npm for its scripts; invoking the JS CLI directly
    // avoids Windows .cmd execution pitfalls and does not require a shell.
    const npmCli = process.env.npm_execpath;
    if (npmCli && existsSync(npmCli)) {
        run(process.execPath, [npmCli, "run", "cap:sync:android"]);
    } else if (process.platform === "win32") {
        run(process.env.ComSpec || "cmd.exe", ["/d", "/s", "/c", "npm.cmd run cap:sync:android"]);
    } else {
        run("npm", ["run", "cap:sync:android"]);
    }

    // Remove a previous output so stale artifacts can never be mistaken for a successful build.
    rmSync(bundlePath, { force: true });
    if (process.platform === "win32") {
        // Batch wrappers require cmd.exe; the command is constant, not user input.
        run(process.env.ComSpec || "cmd.exe", ["/d", "/s", "/c", "gradlew.bat :app:bundleRelease"], {
            cwd: androidDir,
        });
    } else {
        run("./gradlew", [":app:bundleRelease"], { cwd: androidDir });
    }
    if (!existsSync(bundlePath) || statSync(bundlePath).size === 0) fail("Gradle did not produce a release AAB");

    run(jarsigner, ["-verify", bundlePath]);
    const signedFingerprint = sha256Fingerprint(
        capture(keytool, ["-printcert", "-jarfile", bundlePath]),
        basename(bundlePath),
    );
    if (signedFingerprint !== expectedFingerprint) {
        fail(`AAB signed with WRONG certificate! Expected SHA-256: ${expectedFingerprint}, actual: ${signedFingerprint}`);
    }

    mkdirSync(outDir, { recursive: true });
    copyFileSync(bundlePath, outputFile);
    const sha = createHash("sha256").update(readFileSync(outputFile)).digest("hex");
    console.log(`\nSigned AAB ready: ${outputFile}`);
    console.log(`Version: ${versionName}; versionCode: ${versionCode}; applicationId: ${applicationId}`);
    console.log(`Upload certificate SHA-256: ${signedFingerprint}`);
    console.log(`AAB file SHA-256: ${sha}`);
} catch (error) {
    console.error(`\nAndroid release build failed: ${error.message}`);
    process.exitCode = 1;
}
