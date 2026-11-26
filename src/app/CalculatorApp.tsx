import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import CalculatorView from "./calculator/CalculatorView.tsx";
import { getCalculatorButtonCodeFromKeyboardEvent } from "../calculatorCore/calculatorKeyboardShortcuts.ts";
import { useCalculatorCore } from "../calculatorCore/useCalculatorCore.ts";
import type { CalculatorButtonCode } from "../calculatorCore/calculatorWasmTypes.ts";
import { currentAppPlatform } from "../platforms/appPlatform.ts";
import { createWebCalculatorAppActions } from "../platforms/web/webCalculatorAppActions.ts";
import { createDesktopCalculatorAppActions } from "../platforms/desktop/desktopCalculatorAppActions.ts";
import { createAndroidCalculatorAppActions } from "../platforms/android/androidCalculatorAppActions.ts";
import {
    loadWasRateAppButtonUsed,
    saveWasRateAppButtonUsed,
} from "../platforms/android/androidRateAppButtonStorage.ts";
import { isAndroidApp, isDesktopApp } from "../platforms/appEnvironment.ts";
import { createCalculatorAppButtonActions } from "./calculator/calculatorAppButtonActions.ts";
import type { CalculatorAppActions } from "../platforms/calculatorAppActions.ts";
import { useCalculatorAppSettings } from "./settings/useCalculatorAppSettings.ts";
import { SettingsDialog } from "./settings/SettingsDialog.tsx";
import { APP_VERSION } from "./appVersion.ts";
import { routes } from "../shared/routes.ts";
import { goBackOrReplace, navigateTo } from "../platforms/web/webNavigation.ts";
import { listenDesktopWindowSize } from "../platforms/desktop/logDesktopWindowSize.ts";
import {
    isAppStartupReady,
    markAppStartupReady,
    preloadCalculatorFirstPaintAssets,
    waitForCalculatorFirstPaintReady,
} from "./startup/appStartupCover.ts";

const SETTINGS_BUTTON_ATTENTION_FALLBACK_MS = 2500;

interface CalculatorAppProps {
    settingsDialogOpen: boolean;
}

function useRateAppPress(
    appActions: CalculatorAppActions,
    wasRateAppButtonUsed: boolean,
    setWasRateAppButtonUsed: (used: boolean) => void,
): () => void {
    const rateAppOpeningRef = useRef(false);

    return useCallback(() => {
        if (!isAndroidApp || wasRateAppButtonUsed || rateAppOpeningRef.current) {
            return;
        }

        rateAppOpeningRef.current = true;

        void (async () => {
            try {
                await appActions.rateApp();
                saveWasRateAppButtonUsed();
                setWasRateAppButtonUsed(true);
            } catch (error) {
                console.warn("Failed to open Calculator Comrade in Google Play.", error);
            } finally {
                rateAppOpeningRef.current = false;
            }
        })();
    }, [appActions, wasRateAppButtonUsed, setWasRateAppButtonUsed]);
}

export function CalculatorApp({ settingsDialogOpen }: CalculatorAppProps) {
    const appActions = useMemo<CalculatorAppActions>(() => {
        const createCalculatorAppActions = isAndroidApp
            ? createAndroidCalculatorAppActions
            : isDesktopApp
                ? createDesktopCalculatorAppActions
                : createWebCalculatorAppActions;

        return createCalculatorAppActions({
            openSettings: () => navigateTo(routes.calculatorSettings),
        });
    }, []);

    const calculator = useCalculatorCore(appActions);
    const appSettings = useCalculatorAppSettings(appActions);
    const [pressedKeyboardButtonCodes, setPressedKeyboardButtonCodes] =
        useState<CalculatorButtonCode[]>([]);
    const [settingsButtonAttention, setSettingsButtonAttention] = useState(false);
    const [wasRateAppButtonUsed, setWasRateAppButtonUsed] = useState(() =>
        isAndroidApp && loadWasRateAppButtonUsed(),
    );

    const activeKeyboardPressesRef = useRef<Map<string, CalculatorButtonCode>>(new Map());
    const previousSettingsDialogOpenRef = useRef(settingsDialogOpen);

    const updatePressedKeyboardButtonCodes = useCallback(() => {
        setPressedKeyboardButtonCodes([
            ...activeKeyboardPressesRef.current.values(),
        ]);
    }, []);

    useEffect(() => {
        if (!isDesktopApp) {
            return undefined;
        }

        return listenDesktopWindowSize();
    }, []);
    useEffect(() => {
        void preloadCalculatorFirstPaintAssets();
    }, []);

    const calculatorStartupReady = !calculator.loading
        && appSettings.settingsLoaded
        && (calculator.display !== null || calculator.error !== null);

    useEffect(() => {
        if (!calculatorStartupReady || isAppStartupReady()) {
            return undefined;
        }

        let disposed = false;

        void (async () => {
            await waitForCalculatorFirstPaintReady();

            if (!disposed) {
                markAppStartupReady();
            }
        })();

        return () => {
            disposed = true;
        };
    }, [calculatorStartupReady]);


    const isButtonPressed = useCallback(
        (buttonCode: CalculatorButtonCode): boolean =>
            pressedKeyboardButtonCodes.includes(buttonCode),
        [pressedKeyboardButtonCodes],
    );

    const handleCalculatorButtonPressStart = useCallback<
        (buttonCode: CalculatorButtonCode) => void
    >((buttonCode: CalculatorButtonCode) => {
        appActions.playCalculatorButtonDownSound();
        appActions.vibrateCalculatorButtonDown();
        calculator.input(buttonCode);
    }, [appActions, calculator]);

    const handleCalculatorButtonPress = useCallback<
        (buttonCode: CalculatorButtonCode) => void
    >(() => {
        appActions.playCalculatorButtonUpSound();
    }, [appActions]);

    const handleAppButtonPressStart = useCallback(() => {
        appActions.playAppButtonTapSound();
        appActions.vibrateAppButtonTap();
    }, [appActions]);

    const handleRateAppPress = useRateAppPress(
        appActions,
        wasRateAppButtonUsed,
        setWasRateAppButtonUsed,
    );

    const appButtonActions = useMemo(() => createCalculatorAppButtonActions({
        platform: currentAppPlatform,
        appActions,
        wasRateAppButtonUsed,
        onRateAppPress: handleRateAppPress,
    }), [appActions, handleRateAppPress, wasRateAppButtonUsed]);

    const calculatorButtonPressStartRef = useRef(handleCalculatorButtonPressStart);
    const calculatorButtonPressRef = useRef(handleCalculatorButtonPress);

    useEffect(() => {
        calculatorButtonPressStartRef.current = handleCalculatorButtonPressStart;
    }, [handleCalculatorButtonPressStart]);

    useEffect(() => {
        calculatorButtonPressRef.current = handleCalculatorButtonPress;
    }, [handleCalculatorButtonPress]);


    useEffect(() => {
        const wasSettingsDialogOpen = previousSettingsDialogOpenRef.current;
        previousSettingsDialogOpenRef.current = settingsDialogOpen;
        const timeoutIds: number[] = [];

        if (settingsDialogOpen) {
            timeoutIds.push(window.setTimeout(() => {
                setSettingsButtonAttention(false);
            }, 0));
        } else if (wasSettingsDialogOpen) {
            timeoutIds.push(window.setTimeout(() => {
                setSettingsButtonAttention(true);
            }, 0));
            timeoutIds.push(window.setTimeout(() => {
                setSettingsButtonAttention(false);
            }, SETTINGS_BUTTON_ATTENTION_FALLBACK_MS));
        }

        return () => {
            for (const timeoutId of timeoutIds) {
                window.clearTimeout(timeoutId);
            }
        };
    }, [settingsDialogOpen]);

    useEffect(() => {
        if (!settingsDialogOpen) {
            return;
        }

        activeKeyboardPressesRef.current.clear();
        updatePressedKeyboardButtonCodes();
    }, [settingsDialogOpen, updatePressedKeyboardButtonCodes]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (settingsDialogOpen) {
                return;
            }

            const buttonCode = getCalculatorButtonCodeFromKeyboardEvent(event);

            if (buttonCode === null) {
                return;
            }

            event.preventDefault();

            if (event.repeat) {
                return;
            }

            const activeKeyboardPresses = activeKeyboardPressesRef.current;

            if (activeKeyboardPresses.has(event.code)) {
                return;
            }

            activeKeyboardPresses.set(event.code, buttonCode);
            updatePressedKeyboardButtonCodes();

            calculatorButtonPressStartRef.current(buttonCode);
        };

        const handleKeyUp = (event: KeyboardEvent) => {
            if (settingsDialogOpen) {
                return;
            }

            const activeKeyboardPresses = activeKeyboardPressesRef.current;
            const buttonCode = activeKeyboardPresses.get(event.code);

            if (buttonCode === undefined) {
                return;
            }

            event.preventDefault();

            activeKeyboardPresses.delete(event.code);
            updatePressedKeyboardButtonCodes();

            calculatorButtonPressRef.current(buttonCode);
        };

        const handleWindowBlur = () => {
            activeKeyboardPressesRef.current.clear();
            updatePressedKeyboardButtonCodes();
        };

        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("keyup", handleKeyUp);
        window.addEventListener("blur", handleWindowBlur);

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("keyup", handleKeyUp);
            window.removeEventListener("blur", handleWindowBlur);
        };
    }, [settingsDialogOpen, updatePressedKeyboardButtonCodes]);

    return (
        <main
            className="app app--calculator"
            onContextMenu={(event) => event.preventDefault()}
        >
            <CalculatorView
                display={calculator.display}
                onButtonPressStart={handleCalculatorButtonPressStart}
                onButtonPress={handleCalculatorButtonPress}
                isButtonPressed={isButtonPressed}
                appButtonActions={appButtonActions}
                onAppButtonPressStart={handleAppButtonPressStart}
                settingsButtonAttention={settingsButtonAttention}
            />

            {settingsDialogOpen && (
                <SettingsDialog
                    settings={appSettings.settings}
                    vibrationAvailable={appActions.isVibrationAvailable()}
                    appActions={appActions}
                    appVersion={APP_VERSION}
                    coreVersion={calculator.coreVersion}
                    onSoundEnabledChange={appSettings.setSoundEnabled}
                    onVibrationEnabledChange={appSettings.setVibrationEnabled}
                    onClose={() => goBackOrReplace(routes.calculator)}
                />
            )}
        </main>
    );
}
