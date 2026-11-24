import { siteRouteUrl } from "../../shared/routeDefinitions.ts";
import type { CalculatorAppSettings } from "../../app/settings/calculatorAppSettings.ts";
import {
    type CalculatorAppActions,
    type CalculatorSoundType,
    type CreateCalculatorAppActionsOptions,
} from "../calculatorAppActions.ts";
import { createDesktopCalculatorSoundPlayer } from "./desktopCalculatorSoundPlayer.ts";
import {
    clearCalculatorDumpInLocalStorage,
    loadCalculatorAppSettingsFromLocalStorage,
    loadCalculatorDumpFromLocalStorage,
    saveCalculatorAppSettingsToLocalStorage,
    saveCalculatorDumpToLocalStorage,
} from "./desktopCalculatorStorage.ts";
import { openUrl } from "@tauri-apps/plugin-opener";


function openExternalUrl(url: string): void {
    void openUrl(url).catch((error: unknown) => {
        console.warn("Failed to open external URL.", {
            url,
            error,
        });
    });
}

export function createDesktopCalculatorAppActions(
    options: CreateCalculatorAppActionsOptions = {},
): CalculatorAppActions {
    let settings = loadCalculatorAppSettingsFromLocalStorage();
    const soundPlayer = createDesktopCalculatorSoundPlayer();

    return {
        openHome: () => {
            openExternalUrl(siteRouteUrl("home"));
        },

        openHelp: () => {
            openExternalUrl(siteRouteUrl("tips"));
        },

        openSettings: options.openSettings ?? (() => {
            /*
             * The settings screen is provided by the app shell.
             */
        }),

        openLicense: () => {
            openExternalUrl(siteRouteUrl("license"));
        },

        openPrivacyPolicy: () => {
            openExternalUrl(siteRouteUrl("privacy"));
        },

        openTermsOfUse: () => {
            openExternalUrl(siteRouteUrl("terms"));
        },

        isVibrationAvailable: () => false,

        vibrateCalculatorButtonDown: () => {
            /*
             * Desktop shell has no haptic feedback.
             */
        },

        vibrateAppButtonTap: () => {
            /*
             * Desktop shell has no haptic feedback.
             */
        },

        loadSettings: () => loadCalculatorAppSettingsFromLocalStorage(),

        saveSettings: (nextSettings: CalculatorAppSettings) => {
            settings = nextSettings;
            saveCalculatorAppSettingsToLocalStorage(nextSettings);
        },

        playCalculatorButtonDownSound: () => {
            playSoundIfEnabled(settings, soundPlayer, "key-down");
        },

        playCalculatorButtonUpSound: () => {
            /*
             * The current calculator design does not use a key-up sound.
             * Keep the platform action so other platforms can implement it later.
             */
        },

        playAppButtonTapSound: () => {
            playSoundIfEnabled(settings, soundPlayer, "tap");
        },

        loadCalculatorDump: () => loadCalculatorDumpFromLocalStorage(),

        saveCalculatorDump: (dump: Uint8Array) => {
            saveCalculatorDumpToLocalStorage(dump);
        },

        clearCalculatorDump: () => {
            clearCalculatorDumpInLocalStorage();
        },

        rateApp: () => {
            /*
             * Desktop shell is not distributed through an app store yet.
             */
        },

        shareApp: () => {
            /*
             * Desktop sharing can be added later through a platform-specific layer.
             */
        },
    };
}

function playSoundIfEnabled(
    settings: CalculatorAppSettings,
    soundPlayer: ReturnType<typeof createDesktopCalculatorSoundPlayer>,
    soundType: CalculatorSoundType,
): void {
    if (!settings.soundEnabled) {
        return;
    }

    soundPlayer.playSound(soundType);
}
