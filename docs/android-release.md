# Build a signed Android App Bundle for Google Play

The Android application ID is `ru.robotmitya.comrade`. Google Play releases use
an **upload key**, not the key Google Play uses to sign APKs delivered to users.

1. Keep `release_keystore.jks` and `upload_certificate.pem` in a safe location
   outside this Git repository. Make sure the certificate corresponds to the
   **Upload key certificate** listed in Play Console (not App signing certificate).
2. Copy `android/keystore.properties.example` to `android/keystore.properties`.
   Fill in the keystore/certificate paths and key alias. For passwords, use
   environment-variable references (recommended):

   ```properties
   storePassword=${env:CC_ANDROID_STORE_PASSWORD}
   keyPassword=${env:CC_ANDROID_KEY_PASSWORD}
   ```

   Both Gradle and the npm release script resolve these references from their
   process environment. Literal passwords remain supported for compatibility.
   A standard `.properties` file does *not* interpolate environment variables
   without this project-specific handling. The local file is Git-ignored; on
   Linux use `chmod 600 android/keystore.properties`.

   Set the environment variables in the shell that starts the build. For
   Bash (Linux/macOS), prompt without displaying the password:

   ```bash
   read -rsp 'Keystore password: ' CC_ANDROID_STORE_PASSWORD; echo
   export CC_ANDROID_STORE_PASSWORD
   read -rsp 'Key password: ' CC_ANDROID_KEY_PASSWORD; echo
   export CC_ANDROID_KEY_PASSWORD
   ```

   For PowerShell (Windows), use:

   ```powershell
   $env:CC_ANDROID_STORE_PASSWORD = Read-Host 'Keystore password'
   $env:CC_ANDROID_KEY_PASSWORD = Read-Host 'Key password'
   ```

   These variables only need to exist for the release build process;
   Android Studio Gradle Sync and debug builds do not require them. To build a
   release from Android Studio instead, launch Studio with the variables in its
   environment. Do not store actual passwords in shell scripts, shell history,
   or the repository.
   Build output and error messages must not reveal the password values.
3. Bump the version using `npm version ...`. The existing version hook updates
   the Android `versionName` and increments `versionCode`. Confirm the new
   `versionCode` exceeds every bundle previously uploaded to Google Play.
4. From the repository root, run:

   ```bash
   npm run android:bundle:release
   ```

The command performs `npm run cap:sync:android`, builds `:app:bundleRelease`
with the local upload key, verifies the AAB's JAR signature using `jarsigner`,
and compares its signer SHA-256 against `upload_certificate.pem` using `keytool`.
It then copies the validated result to:

```text
artifacts/android/calculator-comrade-VERSION-VERSION_CODE.aab
```

Both `artifacts/` and `android/keystore.properties` are Git-ignored. Neither
private keys nor passwords are passed as command-line flags. Do not publish
these files or put credentials in CI logs. An AAB is intended for Play Console,
not for direct installation with `adb`; use an APK or a testing track to test
on actual devices.

## Manual interactive signing (recommended for local releases)

Once `android/keystore.properties` points at the upload keystore and uses
`${env:...}` references for the passwords, run from the repository root:

```bash
npm run android:bundle:release:manual
```

The wrapper prompts for each distinct referenced environment variable with
**no password echo**, then invokes the existing `android:bundle:release` npm
script with those variables set **only in its child process environment**.
This behaves the same way in interactive Linux, macOS, and Windows terminals.
It requires a real terminal and cannot be used in noninteractive CI/CD.

The existing command remains unchanged for CI/CD:

```bash
npm run android:bundle:release
```

It reads the password environment variables supplied by the CI secret store.
The wrapper never saves passwords to files, shell history, or the calling
shell's environment. As with any environment variables, secrets remain
accessible to the build process (and potentially other processes with
sufficient privileges), so use a trusted local machine and do not enable
verbose logging of the build environment. Press Ctrl+C or Escape to cancel
during password entry.

## Isolated frontend build output

`npm run build:android` writes its Vite assets to `dist/android/`.
`npm run cap:sync:android` syncs this directory because
`capacitor.config.ts` sets `webDir: "dist/android"`.

The other builds are isolated: `dist/web/`, `dist/pages/`, and
`dist/desktop/`. Running a subsequent web, Pages, or desktop build does not
replace the Android frontend, and a new Android build does not invalidate the
last Pages preview. The signed release AAB/APK files still go to
`artifacts/android/`, unchanged.

## Java used for Android release builds

Set `JAVA_HOME` in your OS or CI configuration to the root directory of a
**complete JDK**, not just a JRE. The release script does **not** search for a
specific Java version or change the system default. It checks that `JAVA_HOME`
is set and that `java`, `javac`, `keytool` and `jarsigner` are present, then
passes that JDK to Gradle and other child processes. Both the manual and
CI/CD release commands use this same setting.

The project's current Gradle Wrapper is **8.14.3** and Android Gradle Plugin is
**8.13.0**, matching Capacitor 8's recommended configuration. JDK **21** is a
known working choice for this project; do not point `JAVA_HOME` at an
incompatible newer runtime (for example Java 25 with Gradle 8.14.3).

Examples of setting `JAVA_HOME` persistently:

- **Linux:** configure `JAVA_HOME` in your usual shell/session environment,
  such as `/usr/lib/jvm/java-21-openjdk-amd64` on Ubuntu; reopen the shell
  after changing the configuration.
- **Windows:** configure `JAVA_HOME` in System Properties → Environment
  Variables, pointing to the JDK installation folder (not its `bin` folder);
  reopen the terminal after changing it.
- **macOS:** configure `JAVA_HOME` to the JDK's `Contents/Home` directory, for
  example via `/usr/libexec/java_home -v 21` in your shell startup script.
- **CI/CD:** use the Java setup action for your CI provider (e.g.
  `actions/setup-java`) to establish `JAVA_HOME` before the npm build command.

Check your configuration from the same terminal where you build:

```bash
# Linux/macOS
"$JAVA_HOME/bin/java" -version
"$JAVA_HOME/bin/javac" -version

# Windows PowerShell
& "$env:JAVA_HOME\bin\java.exe" -version
& "$env:JAVA_HOME\bin\javac.exe" -version
```

After installing a JDK while an existing Gradle Daemon is running, you may
need to run `gradlew --stop` once so Gradle re-detects the compiler.

## R8 DEX optimization (release only)

`android/app/build.gradle` enables R8 for `release` builds:

- `minifyEnabled true` performs native Java/Kotlin/DEX shrinking, code
  optimization and obfuscation.
- `proguard-android-optimize.txt` permits code optimization; the older
  `proguard-android.txt` file disables important R8 optimizations.
- Android resource shrinking remains disabled until runtime-only resource
  references have been checked. This setting does not disable DEX code shrinking.
- `android/app/proguard-rules.pro` keeps Capacitor annotation types used
  through reflection in Capacitor 8.4.3. Do not broadly keep the entire app,
  Capacitor, or AndroidX packages, as this would defeat R8 optimization.

The release script requires an R8 `mapping.txt` and saves a versioned copy
alongside the signed AAB in `artifacts/android/`. Keep that mapping file with
its corresponding release for retracing obfuscated native stack traces.
The AAB also contains Google Play's native-code mapping metadata.

To inspect the optimization metadata in a newly built AAB (when present):

```bash
unzip -p artifacts/android/calculator-comrade-VERSION-VERSION_CODE.aab \
  BUNDLE-METADATA/com.android.tools/r8.json
```

**Test the release variant on a device before uploading it.** Debug builds
have R8 disabled and will not reveal reflection/annotation issues. In particular,
verify Calculator startup, sounds/haptics, Settings, and Rate App / Share App.

Google Play reserves previously uploaded version codes. This source snapshot is at `2.0.0-rc.1` / code `18`. Before uploading a newer
AAB, increase to a versionCode not previously uploaded to Play Console (for
example via `npm version prerelease --preid=rc`).

## Local DEX optimization analysis (optional)

Install the official [Android CLI](https://developer.android.com/tools/agents/android-cli)
if you want optimization metrics without uploading the AAB to Google Play.
The analyzer is **not** required for building or signing releases.

Run from the repository root:

```bash
# Analyze the newest AAB in artifacts/android/
npm run android:analyze

# Analyze a specific AAB, without changing its versionCode
npm run android:analyze -- artifacts/android/calculator-comrade-2.0.0-rc.1-18.aab

# Compare versions: write a separate report for each AAB
npm run android:analyze -- artifacts/android/calculator-comrade-2.0.0-rc.0-17.aab artifacts/android/calculator-comrade-2.0.0-rc.1-18.aab
```

For each AAB, the script executes Google's `android analyze --analysis=optimization`
in both human-readable and JSON modes. It prints the official human-readable output
and saves these adjacent to the analyzed AAB:

```text
calculator-comrade-VERSION-VERSION_CODE-analysis.md
calculator-comrade-VERSION-VERSION_CODE-analysis.json
```

The Markdown report includes AGP/R8 versions, DEX size, shrinking, optimization,
obfuscation, heuristic obfuscation when reported, full tool output, and the AAB
SHA-256. The JSON file contains the **original analyzer data** formatted for
readability (its schema is owned by the Android CLI). If R8 is disabled, the
corresponding metrics remain *Not reported* rather than being invented.

If `android` is not found in `PATH`, the command prints a notice and returns
success without producing reports. If Android CLI is installed but analysis
fails, the command exits with an error. This is separate from the release build.

## Generate a test APK from an existing AAB

Install [bundletool](https://github.com/google/bundletool/releases) once.
Set the environment variable `BUNDLETOOL_JAR` to the JAR path (absolute, or
relative to the project root). This is the only supported configuration method.
The script does not pin a bundletool version or download executables automatically.
It uses `JAVA_HOME` for Java and JDK `jar` on Windows/Linux/macOS.

```bash
# Uses the most recently modified AAB in artifacts/android/
npm run android:apk

# Or explicitly select an AAB, without bumping versionCode
npm run android:apk -- artifacts/android/calculator-comrade-2.0.0-rc.1-18.aab
```

For an input `calculator-comrade-VERSION-CODE.aab`, the command writes:

```text
artifacts/android/calculator-comrade-VERSION-CODE.apks
artifacts/android/calculator-comrade-VERSION-CODE.apk
```

The APK is a **universal APK** generated from the release AAB through bundletool,
so it contains the same R8-optimized native code. bundletool automatically signs
it with a **debug key**, since no release signing information is provided.
No upload-keystore passwords are requested. Install it with:

```bash
adb install -r artifacts/android/calculator-comrade-VERSION-CODE.apk
```

An APK with this debug signature **cannot update** a Google Play installation
(or another APK signed with a different certificate). On a test device, uninstall
the existing `ru.robotmitya.comrade` package first if signatures differ; this
removes its local app data. Google Play delivers APKs signed with Google's
**app signing key**, which can differ from the upload key used for our AAB.
For testing the actual Play-signed APK and in-store features, use a Play
testing track. This command never uploads to Google Play or modifies the AAB.
