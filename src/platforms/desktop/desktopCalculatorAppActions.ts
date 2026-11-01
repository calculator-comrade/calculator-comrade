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

const DESKTOP_HOME_URL = "https://calculator-comrade.github.io/calculator-comrade/";
const DESKTOP_HELP_URL = "https://calculator-comrade.github.io/calculator-comrade/tips-n-tricks/";
const DESKTOP_LICENSE_URL = "https://calculator-comrade.github.io/calculator-comrade/license/";
const DESKTOP_PRIVACY_POLICY_URL = "https://calculator-comrade.github.io/calculator-comrade/privacy-policy/";
const DESKTOP_TERMS_OF_USE_URL = "https://calculator-comrade.github.io/calculator-comrade/terms-of-use/";

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
            openExternalUrl(DESKTOP_HOME_URL);
        },

        openHelp: () => {
            openExternalUrl(DESKTOP_HELP_URL);
        },

        openSettings: options.openSettings ?? (() => {
            /*
             * The settings screen is provided by the app shell.
             */
        }),

        openLicense: () => {
            openExternalUrl(DESKTOP_LICENSE_URL);
        },

        openPrivacyPolicy: () => {
            openExternalUrl(DESKTOP_PRIVACY_POLICY_URL);
        },

        openTermsOfUse: () => {
            openExternalUrl(DESKTOP_TERMS_OF_USE_URL);
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
