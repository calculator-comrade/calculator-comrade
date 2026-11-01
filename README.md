# Calculator Comrade

Calculator Comrade is a multiplatform application and project site for an
old-school 8-digit pocket calculator emulator. It currently includes the web
application, GitHub Pages site, PWA files, legal/support pages, and desktop
wrappers for Linux and Windows.

The calculator engine is developed as our separate open-source library
[calculator-comrade-lib](https://github.com/calculator-comrade/calculator-comrade-lib).

This repository contains the product/application layer built around that
library.

## License

This project is licensed under the MIT License.

Copyright (c) 2019-2026 Dmitry Dzakhov (dmitrydzz).

See [LICENSE](LICENSE) for details.

Third-party open-source components and assets are listed in
[THIRD_PARTY_NOTICES](THIRD_PARTY_NOTICES).

## Authors

See [AUTHORS.md](AUTHORS.md).

## Changelog

See [CHANGELOG.md](CHANGELOG.md).

## Android build

The Android application is built with Capacitor. The frontend is built by Vite
in `android` mode and then synced into the native Android project.

Install the project dependencies from the lock file:

```bash
npm ci
```

Build the Android frontend assets and sync them into the Android project:

```bash
npm run cap:sync:android
```

Open the native Android project in Android Studio:

```bash
npm run cap:open:android
```

The Android project lives in:

```text
android/
```

The Android Vite mode uses relative asset paths, the same as the desktop mode,
because the application is loaded by the native WebView from packaged local
assets.

The first Android implementation uses Capacitor for the native shell, browser
links, sharing and haptic feedback. Short calculator sounds still use the
existing web sound player for now; a small native Android sound layer can be
added later if WebView audio startup behavior is not good enough on devices.

## Desktop builds

The desktop application is built with Tauri. The frontend is still built by
Vite, but desktop builds use `desktop` mode and native Rust commands for
platform integration such as sound playback.

Desktop packages are built on the matching host operating system:

- build the Linux app on a Linux host;
- build the Windows app on a Windows host.

Cross-compilation is not the default workflow for this project.

### Common requirements

Install the project dependencies from the lock file:

```bash
npm ci
```

Node.js 24 or newer is required by the frontend toolchain.
If an older Node.js version is selected on the machine, switch to Node.js 24
or newer before running `npm ci`.

The desktop build also requires Rust and Cargo. Install them with `rustup` if
they are not already available on the host machine.

### Web development and preview

Run the web application on localhost in development mode:

```bash
npm run dev
```

This starts the Vite development server. Open the localhost URL printed by Vite
in a browser.

To check a production-style frontend build locally, build the web app and serve
the generated files with Vite preview:

```bash
npm run build
npm run preview
```

Do not open files from `dist/` directly in a browser. The built application is
expected to be served by a web server, even for local testing.

### Desktop development

Run the desktop app in development mode:

```bash
npm run tauri:dev
```

This starts the Vite dev server in `desktop` mode and launches the Tauri shell.

### Build scripts

Use the explicit platform build scripts instead of relying on the default Tauri
bundle target list:

```json
"tauri:build:linux": "tauri build --bundles deb,appimage",
"tauri:build:windows": "tauri build --bundles nsis"
```

The frontend-only desktop build is still available separately:

```bash
npm run build:desktop
```

It writes the Vite output to:

```text
dist/
```

This command only builds the frontend assets for the desktop mode. It does not
create a native executable or installer, and the generated `dist/` directory
still needs to be served by a web server if you want to inspect it in a browser.

The full Tauri build creates a native executable and then packages it for the
selected platform.

### Linux host build

On Ubuntu 24.04 or Ubuntu 26.04, install the Tauri build dependencies and
ALSA development files required by the native desktop sound backend:

```bash
sudo apt update
sudo apt install \
  build-essential \
  curl \
  wget \
  file \
  libxdo-dev \
  libssl-dev \
  libgtk-3-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev \
  patchelf \
  pkg-config \
  libwebkit2gtk-4.1-dev \
  libasound2-dev
```

On Ubuntu 26.04, `libgtk-3-dev` provides GTK/Pango/Cairo build metadata,
`libwebkit2gtk-4.1-dev` provides WebKitGTK and libsoup development files, and
`librsvg2-dev` is also needed by the `linuxdeploy` GTK plugin when packaging
AppImage.

On Ubuntu 24.04 and newer, the runtime ALSA package is usually
`libasound2t64`. On Ubuntu 22.04 and older, it is usually `libasound2`.
The Debian package metadata declares the dependency as
`libasound2 | libasound2t64` to support both families.

Build the Linux app and packages:

```bash
npm run tauri:build:linux
```

The native release executable is written under:

```text
src-tauri/target/release/
```

The Linux packages are generated under:

```text
src-tauri/target/release/bundle/deb/
src-tauri/target/release/bundle/appimage/
```

The `.deb` package includes Debian dependency metadata for ALSA runtime
libraries. AppImage does not have Debian dependency metadata; it still expects
the host system to provide a working Linux audio stack.

For arm64 Linux, prefer building on an actual arm64 Linux machine or arm64 CI
runner. Cross-compilation is possible, but it needs matching WebKitGTK, OpenSSL
and ALSA development packages for the target architecture.

### Windows host build

On Windows, install the Tauri Windows prerequisites before building:

- Node.js and npm;
- Rust and Cargo via `rustup`;
- Microsoft C++ Build Tools with the **Desktop development with C++** workload;
- Microsoft Edge WebView2 Runtime.

Windows 11 usually already includes WebView2, but it is still worth checking if
a clean machine fails to start the Tauri app.

Build the Windows app and NSIS installer:

```powershell
npm run tauri:build:windows
```

The native release executable is written under:

```text
src-tauri/target/release/
```

On Windows, the executable currently uses the Rust package name from
`src-tauri/Cargo.toml`, so the raw executable may be named like this:

```text
src-tauri/target/release/calculator-comrade.exe
```

The Windows NSIS installer is generated under:

```text
src-tauri/target/release/bundle/nsis/
```

The installer file name is based on the Tauri product name, version and target
architecture, for example:

```text
Calculator Comrade_1.0.0_x64-setup.exe
```
