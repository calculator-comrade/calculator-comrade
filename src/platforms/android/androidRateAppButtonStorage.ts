const WAS_RATE_APP_BUTTON_USED_STORAGE_KEY = "calculator-comrade.wasRateAppButtonUsed";

export function loadWasRateAppButtonUsed(): boolean {
    try {
        return window.localStorage.getItem(WAS_RATE_APP_BUTTON_USED_STORAGE_KEY) === "true";
    } catch (error) {
        console.warn("Failed to read Rate App button state.", error);
        return false;
    }
}

export function saveWasRateAppButtonUsed(): void {
    try {
        window.localStorage.setItem(WAS_RATE_APP_BUTTON_USED_STORAGE_KEY, "true");
    } catch (error) {
        console.warn("Failed to save Rate App button state.", error);
    }
}
