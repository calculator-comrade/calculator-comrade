import { assetUrl } from "../../shared/assetUrl.ts";
import { calculatorFirstPaintAssets } from "./appAssetManifest.ts";

const APP_STARTUP_READY_CLASS_NAME = "app-startup-ready";
const APP_STARTUP_COVER_ID = "app-startup-cover";
const STARTUP_COVER_REMOVE_FALLBACK_MS = 500;

let calculatorFirstPaintAssetsPromise: Promise<void> | null = null;
let appStartupReadyMarked = false;

export function preloadCalculatorFirstPaintAssets(): Promise<void> {
    if (calculatorFirstPaintAssetsPromise === null) {
        calculatorFirstPaintAssetsPromise = Promise.all(
            calculatorFirstPaintAssets.map(async (path) => {
                try {
                    await preloadImage(assetUrl(path));
                } catch (error) {
                    console.warn("Calculator startup image was not preloaded.", error);
                }
            }),
        ).then(() => undefined);
    }

    return calculatorFirstPaintAssetsPromise;
}

export async function waitForCalculatorFirstPaintReady(): Promise<void> {
    await preloadCalculatorFirstPaintAssets();
    await waitForFontsReady();
    await waitForAnimationFrame();
    await waitForAnimationFrame();
}

export function markAppStartupReady(): void {
    if (appStartupReadyMarked) {
        return;
    }

    appStartupReadyMarked = true;
    document.documentElement.classList.add(APP_STARTUP_READY_CLASS_NAME);

    const cover = document.getElementById(APP_STARTUP_COVER_ID);

    if (cover === null) {
        return;
    }

    const removeCover = () => {
        cover.remove();
    };

    cover.addEventListener("transitionend", removeCover, { once: true });
    window.setTimeout(removeCover, STARTUP_COVER_REMOVE_FALLBACK_MS);
}

async function preloadImage(src: string): Promise<void> {
    const image = new Image();
    image.decoding = "async";

    const imageLoaded = new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error(`Failed to preload image: ${src}`));
    });

    image.src = src;

    if (!image.complete) {
        await imageLoaded;
    }

    if (typeof image.decode === "function") {
        await image.decode();
    }
}

async function waitForFontsReady(): Promise<void> {
    if (document.fonts) {
        await document.fonts.ready;
    }
}

function waitForAnimationFrame(): Promise<void> {
    return new Promise((resolve) => {
        window.requestAnimationFrame(() => resolve());
    });
}
