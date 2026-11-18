import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { basename, isAbsolute, join, resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const adb = process.platform === "win32" ? "adb.exe" : "adb";

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

function parseArguments(args) {
    let serial = null;
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg === "--help" || arg === "-h") {
            console.log("Usage: npm run start:android -- [--serial DEVICE_SERIAL]");
            console.log("If multiple Android devices are connected, choose one interactively.");
            return null;
        }
        if (arg === "--serial" || arg === "-s") {
            if (serial !== null || !args[i + 1] || args[i + 1].startsWith("-")) fail(`Missing or duplicate value for ${arg}`);
            serial = args[++i];
        } else if (arg.startsWith("--serial=")) {
            if (serial !== null || !arg.slice("--serial=".length)) fail("Missing or duplicate --serial value");
            serial = arg.slice("--serial=".length);
        } else {
            fail(`Unknown option: ${arg}. Use --serial DEVICE_SERIAL or --help.`);
        }
    }
    return { serial: serial ?? process.env.ANDROID_SERIAL?.trim() ?? null };
}

function captureAdbDevices() {
    const result = spawnSync(adb, ["devices", "-l"], {
        cwd: projectRoot,
        encoding: "utf8",
        windowsHide: true,
    });
    if (result.error?.code === "ENOENT") fail("ADB not found in PATH. Install Android SDK Platform-Tools and add adb to PATH.");
    if (result.error) fail(`Cannot run adb: ${result.error.message}`);
    if (result.status !== 0) fail(`adb devices failed: ${result.stderr?.trim() || result.stdout?.trim() || "unknown error"}`);

    return result.stdout.split(/\r?\n/)
        .map(line => line.trim())
        .filter(line => line && !line.startsWith("List of devices attached") && !line.startsWith("*"))
        .map(line => {
            const match = /^(\S+)\s+(device|offline|unauthorized|recovery|sideload|bootloader|no permissions)(?=\s|$)/.exec(line);
            if (!match) return null;
            const model = /\bmodel:(\S+)/.exec(line)?.[1]?.replaceAll("_", " ");
            return { serial: match[1], state: match[2], label: model || (match[1].startsWith("emulator-") ? "Android emulator" : "Android device") };
        })
        .filter(Boolean);
}

async function selectDevice(devices, requestedSerial) {
    const online = devices.filter(device => device.state === "device");
    const listed = devices.length ? devices.map(device => `  ${device.serial}: ${device.state}`).join("\n") : "  (none)";

    if (requestedSerial) {
        const match = devices.find(device => device.serial === requestedSerial);
        if (!match || match.state !== "device") {
            fail(`Requested Android device '${requestedSerial}' is not connected and ready.\nADB devices:\n${listed}`);
        }
        return match;
    }
    if (online.length === 0) {
        fail(`No ready Android devices or emulators found.\nADB devices:\n${listed}\n` +
            "Connect a device, enable USB debugging, or start an Android emulator.");
    }
    if (online.length === 1) return online[0];
    if (!process.stdin.isTTY || !process.stdout.isTTY) {
        fail("Multiple Android devices are connected. Specify one with 'npm run start:android -- --serial DEVICE_SERIAL' or ANDROID_SERIAL.");
    }

    console.log("\nChoose the device to install and launch Calculator Comrade:");
    for (const [index, device] of online.entries()) {
        console.log(`  ${index + 1}. ${device.label} (${device.serial})`);
    }
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    try {
        while (true) {
            const answer = (await rl.question(`Device number (1-${online.length}): `)).trim();
            const number = Number(answer);
            if (/^[1-9]\d*$/.test(answer) && Number.isSafeInteger(number) && number <= online.length) {
                return online[number - 1];
            }
            console.log("Please enter a number from the list.");
        }
    } finally {
        rl.close();
    }
}

function releaseArtifacts() {
    const pkg = JSON.parse(readFileSync(join(projectRoot, "package.json"), "utf8"));
    const gradle = readFileSync(join(projectRoot, "android", "app", "build.gradle"), "utf8");
    const versionName = /^\s*versionName\s+"([^"]+)"/m.exec(gradle)?.[1];
    const versionCode = /^\s*versionCode\s+(\d+)\s*$/m.exec(gradle)?.[1];
    const applicationId = /^\s*applicationId\s+"([^"]+)"/m.exec(gradle)?.[1];
    if (!versionName || !versionCode || !applicationId || pkg.version !== versionName) {
        fail("Cannot determine matching Android release version from package.json and android/app/build.gradle.");
    }
    const stem = `calculator-comrade-${versionName}-${versionCode}`;
    return {
        bundle: join(projectRoot, "artifacts", "android", `${stem}.aab`),
        apk: join(projectRoot, "artifacts", "android", `${stem}.apk`),
        applicationId,
    };
}

function run(command, args, description) {
    const result = spawnSync(command, args, {
        cwd: projectRoot,
        env: process.env,
        stdio: "inherit",
        windowsHide: true,
    });
    if (result.error) fail(`${description}: ${result.error.message}`);
    if (result.status !== 0) fail(`${description} failed (exit code ${result.status ?? "unknown"})`);
}

function runScript(name, args = []) {
    console.log(`\n== ${name} ==`);
    run(process.execPath, [fileURLToPath(new URL(`./${name}.js`, import.meta.url)), ...args], name);
}

async function main() {
    const options = parseArguments(process.argv.slice(2));
    if (!options) return;

    // Fail quickly if we cannot build/install, before prompting for signing passwords.
    const toolJar = process.env.BUNDLETOOL_JAR?.trim();
    if (!toolJar) fail("BUNDLETOOL_JAR is not set. Point it to your bundletool JAR.");
    requireFile(filePath(toolJar), "BUNDLETOOL_JAR");
    if (!process.env.JAVA_HOME?.trim()) fail("JAVA_HOME is not set. Point it to a complete JDK.");

    const devices = captureAdbDevices();
    const device = await selectDevice(devices, options.serial);
    console.log(`Selected Android device: ${device.label} (${device.serial})`);

    const { bundle, apk, applicationId } = releaseArtifacts();
    runScript("build-android-aab");
    requireFile(bundle, "New release AAB");
    // This existing command is optional when Google Android CLI is not installed.
    runScript("analyze-android-aab", [bundle]);
    runScript("convert-android-aab-to-apk", [bundle]);
    requireFile(apk, "New universal APK");

    console.log(`\n== Installing ${basename(apk)} on ${device.serial} ==`);
    try {
        run(adb, ["-s", device.serial, "install", "-r", apk], "adb install");
    } catch (error) {
        throw new Error(`${error.message}. If the installed app was signed by Google Play or another key, ` +
            "Android will reject the update. Uninstall that app manually only if losing its local data is acceptable.");
    }

    console.log(`\n== Launching ${applicationId} ==`);
    run(adb, ["-s", device.serial, "shell", "am", "start", "-n", `${applicationId}/.MainActivity`], "adb shell am start");
    console.log(`\nCalculator Comrade installed and launched on ${device.serial}.`);
}

main().catch(error => {
    console.error(`\nAndroid device start failed: ${error.message}`);
    process.exitCode = 1;
});
