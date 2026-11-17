import type { AppPlatform } from "../../platforms/appPlatform.ts";
import type { CalculatorAppActions } from "../../platforms/calculatorAppActions.ts";
import { assetUrl } from "../../shared/assetUrl.ts";

export type CalculatorAppButtonActionId =
    | "home"
    | "help"
    | "settings"
    | "rateApp"
    | "shareApp";

export interface CalculatorAppButtonAction {
    id: CalculatorAppButtonActionId;
    ariaLabel: string;
    src: string | null;
    onPress: () => void;
}

interface CreateCalculatorAppButtonActionsOptions {
    platform: AppPlatform;
    appActions: CalculatorAppActions;
    wasRateAppButtonUsed?: boolean;
    onRateAppPress: () => void;
}

export function createCalculatorAppButtonActions({
    platform,
    appActions,
    wasRateAppButtonUsed = false,
    onRateAppPress,
}: CreateCalculatorAppButtonActionsOptions): CalculatorAppButtonAction[] {
    if (platform === "android") {
        const primaryAction: CalculatorAppButtonAction = wasRateAppButtonUsed
            ? {
                id: "shareApp",
                ariaLabel: "Share app",
                src: getPlatformAppButtonIcon(platform, "shareApp"),
                onPress: appActions.shareApp,
            }
            : {
                id: "rateApp",
                ariaLabel: "Rate app",
                src: getPlatformAppButtonIcon(platform, "rateApp"),
                onPress: onRateAppPress,
            };

        return [
            primaryAction,
            {
                id: "help",
                ariaLabel: "Help",
                src: getPlatformAppButtonIcon(platform, "help"),
                onPress: appActions.openHelp,
            },
            {
                id: "settings",
                ariaLabel: "Settings",
                src: getPlatformAppButtonIcon(platform, "settings"),
                onPress: appActions.openSettings,
            },
        ];
    }

    return [
        {
            id: "home",
            ariaLabel: "Home",
            src: getPlatformAppButtonIcon(platform, "home"),
            onPress: appActions.openHome,
        },
        {
            id: "help",
            ariaLabel: "Help",
            src: getPlatformAppButtonIcon(platform, "help"),
            onPress: appActions.openHelp,
        },
        {
            id: "settings",
            ariaLabel: "Settings",
            src: getPlatformAppButtonIcon(platform, "settings"),
            onPress: appActions.openSettings,
        },
    ];
}

function getPlatformAppButtonIcon(
    platform: AppPlatform,
    actionId: CalculatorAppButtonActionId,
): string | null {
    if (actionId === "shareApp") {
        if (platform === "ios") {
            return assetUrl("assets/calculator/buttons/app_button_share_ios.svg");
        }

        if (platform === "android") {
            return assetUrl("assets/calculator/buttons/app_button_share_android.svg");
        }
    }

    return commonAppButtonIcons[actionId];
}

const commonAppButtonIcons: Record<CalculatorAppButtonActionId, string | null> = {
    home: assetUrl("assets/calculator/buttons/app_button_home.svg"),
    help: assetUrl("assets/calculator/buttons/app_button_help.svg"),
    settings: assetUrl("assets/calculator/buttons/app_button_settings.svg"),
    rateApp: assetUrl("assets/calculator/buttons/app_button_rate.webp"),
    shareApp: assetUrl("assets/calculator/buttons/app_button_share.webp"),
};
