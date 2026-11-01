import type { CalculatorAppSettings } from "../../app/settings/calculatorAppSettings.ts";
import {
    type CalculatorAppActions,
    type CalculatorSoundType,
    type CreateCalculatorAppActionsOptions,
} from "../calculatorAppActions.ts";
import {
    createAndroidCalculatorSoundPlayer,
    type AndroidCalculatorSoundPlayer,
} from "./androidCalculatorSoundPlayer.ts";
import {
    clearCalculatorDumpInLocalStorage,
    loadCalculatorAppSettingsFromLocalStorage,
    loadCalculatorDumpFromLocalStorage,
    saveCalculatorAppSettingsToLocalStorage,
    saveCalculatorDumpToLocalStorage,
} from "../web/webCalculatorStorage.ts";
import { Browser } from "@capacitor/browser";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { Share } from "@capacitor/share";

const ANDROID_HOME_URL = "https://calculator-comrade.github.io/calculator-comrade/";
const ANDROID_HELP_URL = "https://calculator-comrade.github.io/calculator-comrade/tips-n-tricks/";
const ANDROID_LICENSE_URL = "https://calculator-comrade.github.io/calculator-comrade/license/";
const ANDROID_PRIVACY_POLICY_URL = "https://calculator-comrade.github.io/calculator-comrade/privacy-policy/";
const ANDROID_TERMS_OF_USE_URL = "https://calculator-comrade.github.io/calculator-comrade/terms-of-use/";

export function createAndroidCalculatorAppActions(
    options: CreateCalculatorAppActionsOptions = {},
): CalculatorAppActions {
    let settings = loadCalculatorAppSettingsFromLocalStorage();
    const soundPlayer = createAndroidCalculatorSoundPlayer();

    return {
        openHome: () => {
            openExternalUrl(ANDROID_HOME_URL);
        },

        openHelp: () => {
            openExternalUrl(ANDROID_HELP_URL);
        },

        openSettings: options.openSettings ?? (() => {
            /*
             * The settings screen is provided by the app shell.
             */
        }),

        openLicense: () => {
            openExternalUrl(ANDROID_LICENSE_URL);
        },

        openPrivacyPolicy: () => {
            openExternalUrl(ANDROID_PRIVACY_POLICY_URL);
        },

        openTermsOfUse: () => {
            openExternalUrl(ANDROID_TERMS_OF_USE_URL);
        },

        isVibrationAvailable: () => true,

        vibrateCalculatorButtonDown: () => {
            impactIfEnabled(settings, ImpactStyle.Light);
        },

        vibrateAppButtonTap: () => {
            impactIfEnabled(settings, ImpactStyle.Medium);
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
             * The Play Store page is not available yet.
             */
        },

        shareApp: () => {
            void Share.share({
                title: "Calculator Comrade",
                text: "A free calculator with no ads and no in-app purchases.",
                url: ANDROID_HOME_URL,
                dialogTitle: "Share Calculator Comrade",
            }).catch((error: unknown) => {
                console.warn("Failed to share app.", error);
            });
        },
    };
}

function openExternalUrl(url: string): void {
    void Browser.open({ url }).catch((error: unknown) => {
        console.warn("Failed to open external URL.", {
            url,
            error,
        });
    });
}

function impactIfEnabled(settings: CalculatorAppSettings, style: ImpactStyle): void {
    if (!settings.vibrationEnabled) {
        return;
    }

    void Haptics.impact({ style }).catch((error: unknown) => {
        console.warn("Failed to run haptic feedback.", error);
    });
}

function playSoundIfEnabled(
    settings: CalculatorAppSettings,
    soundPlayer: AndroidCalculatorSoundPlayer,
    soundType: CalculatorSoundType,
): void {
    if (!settings.soundEnabled) {
        return;
    }

    soundPlayer.playSound(soundType);
}
