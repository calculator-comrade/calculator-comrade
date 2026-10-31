import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import * as ts from "typescript";

import { appAssetManifest } from "./src/app/startup/appAssetManifest.ts";

const ASSET_MANIFEST_OUTPUT_PATH = "public/asset-manifest.json";
const CALCULATOR_WASM_GLUE_INPUT_PATH = "public/wasm/calculator.js";
const CALCULATOR_WASM_GLUE_OUTPUT_PATH = "public/wasm/calculator.compat.js";

export default defineConfig(({ mode }) => {
    const isPackagedApp = mode === "desktop" || mode === "android";

    writeCompatibleCalculatorWasmGlue(process.cwd());

    return {
        base:
            mode === "pages"
                ? "/calculator-comrade/"
                : isPackagedApp
                    ? "./"
                    : "/",
        build: {
            target: "chrome69",
            cssTarget: "chrome69",
        },
        plugins: [generateAssetManifestPlugin(), react()],
    };
});

function generateAssetManifestPlugin(): Plugin {
    return {
        name: "generate-asset-manifest",
        buildStart() {
            writeAssetManifestFile(process.cwd());
        },
        configureServer() {
            writeAssetManifestFile(process.cwd());
        },
    };
}

function writeAssetManifestFile(rootDir: string): void {
    const outputPath = resolve(rootDir, ASSET_MANIFEST_OUTPUT_PATH);
    const outputDir = dirname(outputPath);

    mkdirSync(outputDir, { recursive: true });
    writeFileSync(outputPath, `${JSON.stringify(appAssetManifest, null, 2)}\n`);
}

function writeCompatibleCalculatorWasmGlue(rootDir: string): void {
    const inputPath = resolve(rootDir, CALCULATOR_WASM_GLUE_INPUT_PATH);
    const outputPath = resolve(rootDir, CALCULATOR_WASM_GLUE_OUTPUT_PATH);
    const source = readFileSync(inputPath, "utf8");
    const transpiled = ts.transpileModule(source, {
        compilerOptions: {
            target: ts.ScriptTarget.ES2017,
            module: ts.ModuleKind.None,
        },
    }).outputText;

    const globalThisPolyfill =
        '(function () { if (typeof globalThis === "undefined") { window.globalThis = window; } }());\n';

    writeFileSync(outputPath, `${globalThisPolyfill}${transpiled}`);
}
