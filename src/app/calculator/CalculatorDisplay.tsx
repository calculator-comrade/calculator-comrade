import { assetUrl } from "../../shared/assetUrl.ts";
import type { CalculatorDisplaySnapshot } from "../../calculatorCore/calculatorWasmClient.ts";

interface CalculatorDisplayProps {
    display: CalculatorDisplaySnapshot | null;
}

const DISPLAY_POSITIONS = [0, 1, 2, 3, 4, 5, 6, 7];
const DISPLAY_ASSET_PATH = "assets/calculator/display/";
const DIGIT_ATLAS_URL = assetUrl(`${DISPLAY_ASSET_PATH}display_digits_lcd.webp`);
// Each 139px-wide digit has an 8px transparent gutter on either side.
const DIGIT_ATLAS_GUTTER = 8;
const DIGIT_ATLAS_STRIDE = 139 + 2 * DIGIT_ATLAS_GUTTER;
// Cells 0–9 are black digits; cell 10 is the original white inactive 8.
const DIGIT_ATLAS_INACTIVE_CELL = 10;

export function CalculatorDisplay({ display }: CalculatorDisplayProps) {
    return (
        <>
            <CalculatorDisplayLayer display={null} active={false} />
            <CalculatorDisplayLayer display={display} active={true} />
        </>
    );
}

interface CalculatorDisplayLayerProps extends CalculatorDisplayProps {
    active: boolean;
}

function CalculatorDisplayLayer({ display, active }: CalculatorDisplayLayerProps) {
    function symbolClass(enabled: boolean): string {
        if (!active) {
            return "calculator-display-symbol--inactive";
        }

        return enabled
            ? "calculator-display-symbol--active"
            : "calculator-display-symbol--active calculator-display-symbol--off";
    }

    function symbolUrl(symbol: string): string {
        return assetUrl(`${DISPLAY_ASSET_PATH}display_${symbol}_${active ? "active" : "inactive"}.webp`);
    }

    // Keep both layers mounted, including empty positions. Only the atlas offset
    // and opacity change, never the image source or the set of DOM elements.
    return (
        <>
            {DISPLAY_POSITIONS.map((position) => {
                const digit = active ? (display?.digits[position] ?? -1) : 8;
                const atlasCell = active ? (digit >= 0 ? digit : 8) : DIGIT_ATLAS_INACTIVE_CELL;

                return (
                    <div
                        key={`digit-${position}`}
                        className={[
                            "calculator-display-digit",
                            `calculator-display-digit--${position}`,
                            symbolClass(digit >= 0),
                        ].join(" ")}
                        style={{
                            backgroundImage: `url("${DIGIT_ATLAS_URL}")`,
                            backgroundPosition: `${-(DIGIT_ATLAS_GUTTER + atlasCell * DIGIT_ATLAS_STRIDE)}px 0px`,
                        }}
                        aria-hidden="true"
                    />
                );
            })}

            {DISPLAY_POSITIONS.map((position) => (
                <img
                    key={`point-${position}`}
                    className={[
                        "calculator-display-point",
                        `calculator-display-point--${position}`,
                        symbolClass(display?.pointPos === position),
                    ].join(" ")}
                    src={symbolUrl("point")}
                    alt=""
                    draggable={false}
                />
            ))}

            <img
                className={`calculator-display-indicator calculator-display-minus ${symbolClass(display?.negative === true)}`}
                src={symbolUrl("minus")}
                alt=""
                draggable={false}
            />
            <img
                className={`calculator-display-indicator calculator-display-memory ${symbolClass(display?.memory === true)}`}
                src={symbolUrl("memory")}
                alt=""
                draggable={false}
            />
            <img
                className={`calculator-display-indicator calculator-display-error ${symbolClass(display?.error === true)}`}
                src={symbolUrl("error")}
                alt=""
                draggable={false}
            />
        </>
    );
}
