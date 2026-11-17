import type { CalculatorAppSettings } from "../app/settings/calculatorAppSettings.ts";
import {assetUrl} from "../shared/assetUrl.ts";

export type MaybePromise<T> = T | Promise<T>;

export interface CreateCalculatorAppActionsOptions {
    openSettings?: () => void;
}

export type CalculatorSoundType =
    | "key-down"
    | "tap";

export type CalculatorSoundUrls = Record<CalculatorSoundType, string>;

export const WEB_CALCULATOR_SOUND_URLS: CalculatorSoundUrls = {
    "key-down": assetUrl("sounds/key-down.wav"),
    "tap": assetUrl("sounds/tap.wav"),
};

export interface CalculatorAppActions {
    openHome: () => void;
    openHelp: () => void;
    openSettings: () => void;
    openLicense: () => void;
    openPrivacyPolicy: () => void;
    openTermsOfUse: () => void;
    isVibrationAvailable: () => boolean;
    playCalculatorButtonDownSound: () => void;
    playCalculatorButtonUpSound: () => void;
    playAppButtonTapSound: () => void;
    vibrateCalculatorButtonDown: () => void;
    vibrateAppButtonTap: () => void;
    loadSettings: () => MaybePromise<CalculatorAppSettings>;
    saveSettings: (settings: CalculatorAppSettings) => MaybePromise<void>;
    loadCalculatorDump: () => MaybePromise<Uint8Array | null>;
    saveCalculatorDump: (dump: Uint8Array) => MaybePromise<void>;
    clearCalculatorDump: () => MaybePromise<void>;
    rateApp: () => MaybePromise<void>;
    shareApp: () => void;
}
