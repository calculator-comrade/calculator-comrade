import { assetUrl } from "../shared/assetUrl.ts";
import type { CalculatorWasmModule } from "./calculatorWasmTypes.ts";

const CALCULATOR_SCRIPT_URL = assetUrl("wasm/calculator.compat.js");
const CALCULATOR_WASM_URL = assetUrl("wasm/calculator.wasm");

let loadingPromise: Promise<CalculatorWasmModule> | undefined;

export function loadCalculatorModule(): Promise<CalculatorWasmModule> {
    loadingPromise ??= loadCalculatorModuleInternal();

    return loadingPromise;
}

async function loadCalculatorModuleInternal(): Promise<CalculatorWasmModule> {
    await loadScriptOnce(CALCULATOR_SCRIPT_URL);

    const factory = window.createCalculatorModule;

    if (!factory) {
        throw new Error("Calculator WASM module factory was not found.");
    }

    return factory({
        locateFile: (path) => {
            if (path.endsWith(".wasm")) {
                return CALCULATOR_WASM_URL;
            }

            return assetUrl(`wasm/${path}`);
        },
    });
}

async function loadScriptOnce(src: string): Promise<void> {
    const existingScript = document.querySelector<HTMLScriptElement>(
        `script[data-calculator-wasm-script="${src}"]`,
    );

    if (existingScript) {
        await waitForExistingScript(existingScript);
        return;
    }

    await appendScript(src);
}

function appendScript(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const script = document.createElement("script");

        script.src = src;
        script.async = true;
        script.dataset.calculatorWasmScript = src;

        script.addEventListener("load", () => resolve(), { once: true });
        script.addEventListener(
            "error",
            () => reject(new Error(`Failed to load script: ${src}`)),
            { once: true },
        );

        document.head.appendChild(script);
    });
}

function waitForExistingScript(script: HTMLScriptElement): Promise<void> {
    if (window.createCalculatorModule) {
        return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
        script.addEventListener("load", () => resolve(), { once: true });
        script.addEventListener(
            "error",
            () => reject(new Error(`Failed to load script: ${script.src}`)),
            { once: true },
        );
    });
}
