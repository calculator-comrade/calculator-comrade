# Quick start

A short checklist for developing, testing, and releasing Calculator Comrade.
For platform-specific setup and signing details, see the main [README](README.md)
and [Android build guide](docs/android-release.md).

## 1. Install dependencies

Use **Node.js 24 or newer** and install the versions from the lockfile:

```bash
npm ci
```

## 2. Configure Android tools (one-time setup)

Install the Android SDK/ADB, JDK 21, and Google's `bundletool`. Set these
environment variables (example for Bash; use your actual paths):

```bash
export JAVA_HOME=/path/to/jdk-21
export BUNDLETOOL_JAR=/path/to/bundletool-all.jar
```

Copy `android/keystore.properties.example` to `android/keystore.properties`, then
configure the upload keystore path, key alias, and certificate path. The signing
password variables `CC_ANDROID_STORE_PASSWORD` and `CC_ANDROID_KEY_PASSWORD`
are optional for interactive builds: the AAB command prompts for missing values.
Set them in the environment for unattended builds. Do not commit secrets.

The Google Android CLI is optional; without it, DEX optimization analysis is
skipped. See the [Android build guide](docs/android-release.md) for details.

## 3. Prepare a release version

Update `CHANGELOG.md` **before** changing the version:

```bash
npm version prerelease
```

The project's `.npmrc` already specifies `preid=rc` and
`git-tag-version=false`: no extra flags are needed, and npm does **not** create
a Git commit or tag. The `version` hook synchronizes app versions and
increments Android `versionCode`. Check the resulting changes before publishing.
Skip this step for ordinary development or repeated test builds.

## 4. Develop and verify the web app

```bash
npm start                 # Start the web development server (alias for start:web).
npm run start:web         # Same development server, explicit name.
npm run build:web         # Build production web assets into dist/web/.
npm run preview:web       # Preview the existing dist/web/ build.
```

Check the calculator UI, keyboard interactions, sounds, and browser console.

## 5. Build and preview GitHub Pages

```bash
npm run build:pages       # Build dist/pages/ and run SSG checks.
npm run start:pages       # Preview the existing Pages build locally.
```

Check the home page, calculator, and other site routes. Run `build:pages` before
`start:pages`; the preview command does not rebuild the site.

## 6. Check quality and test Android

```bash
npm run lint              # Check the source code.
npm run start:android     # Build signed AAB, analyze it, create APK, install and launch.
```

With multiple connected devices, select one when prompted, or specify it:

```bash
npm run start:android -- --serial emulator-5554
```

Check startup, calculations, sounds, haptics, Settings, Rate App, and Share App
on a real device or emulator. The AAB, APK, R8 mapping, and analysis reports
are saved under `artifacts/android/`. The `start:android` command does **not**
change the app version or upload anything to Google Play.

## 7. Desktop (when applicable)

```bash
npm run start:desktop           # Run the Tauri desktop app in development.
npm run build:desktop:linux     # Build Linux packages on a Linux host.
npm run build:desktop:windows   # Build a Windows installer on a Windows host.
```

Each desktop build command checks the host OS and stops if it does not match
its target platform; cross-compilation is not configured.

## 8. Commit and publish the website

After checks pass, review the changes, then **commit and tag manually**:

```bash
git status
git add -A
git diff --cached
git commit -m "Release vX.Y.Z"
git tag -a vX.Y.Z -m "Release vX.Y.Z"
git push origin master --follow-tags
```

Replace `X.Y.Z` with the actual version, including its `-rc.N` suffix if any.
The annotated tag is required for `--follow-tags`. A push to `master` triggers
GitHub Actions to rebuild and publish `dist/pages/` to GitHub Pages; generated
`dist/` files should not be committed.

Google Play publication instructions will be added once the process is finalized.
