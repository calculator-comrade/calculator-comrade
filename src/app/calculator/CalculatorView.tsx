import { assetUrl } from "../../shared/assetUrl.ts";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { CalculatorAppButtons } from "./CalculatorAppButtons.tsx";
import { CalculatorDisplay } from "./CalculatorDisplay.tsx";
import { CalculatorKeyboard } from "./CalculatorKeyboard.tsx";
import {
    CALCULATOR_BODY_HEIGHT,
    CALCULATOR_BODY_WIDTH,
} from "../../calculatorCore/calculatorGeometry.ts";
import type { CalculatorDisplaySnapshot } from "../../calculatorCore/calculatorWasmClient.ts";
import type { CalculatorButtonCode } from "../../calculatorCore/calculatorWasmTypes.ts";
import type { CalculatorAppButtonAction } from "./calculatorAppButtonActions.ts";

interface CalculatorViewProps {
    display: CalculatorDisplaySnapshot | null;
    onButtonPressStart: (buttonCode: CalculatorButtonCode) => void;
    onButtonPress: (buttonCode: CalculatorButtonCode) => void;
    isButtonPressed: (buttonCode: CalculatorButtonCode) => boolean;
    appButtonActions: CalculatorAppButtonAction[];
    onAppButtonPressStart: () => void;
    settingsButtonAttention: boolean;
}

function CalculatorView({
    display,
    onButtonPressStart,
    onButtonPress,
    isButtonPressed,
    appButtonActions,
    onAppButtonPressStart,
    settingsButtonAttention,
}: CalculatorViewProps) {
    const viewRef = useRef<HTMLElement | null>(null);
    const [scale, setScale] = useState<number | null>(null);

    useEffect(() => {
        const view = viewRef.current;

        if (!view) {
            return;
        }

        const preventSelection = (event: Event) => event.preventDefault();
        view.addEventListener("selectstart", preventSelection);

        return () => view.removeEventListener("selectstart", preventSelection);
    }, []);

    useLayoutEffect(() => {
        const view = viewRef.current;

        if (!view) {
            return;
        }

        const app = view.parentElement;

        if (!app) {
            return;
        }

        const updateLayout = () => {
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;

            const paddingX = Math.min(16, Math.max(8, viewportWidth * 0.03));
            const paddingY = Math.min(16, Math.max(8, viewportHeight * 0.012));

            const availableWidth = Math.max(0, viewportWidth - paddingX * 2);
            const availableHeight = Math.max(0, viewportHeight - paddingY * 2);
            const nextScale = Math.min(
                availableWidth / CALCULATOR_BODY_WIDTH,
                availableHeight / CALCULATOR_BODY_HEIGHT,
            );

            const shellWidth = CALCULATOR_BODY_WIDTH * nextScale;
            const shellHeight = CALCULATOR_BODY_HEIGHT * nextScale;

            app.style.setProperty("--calculator-viewport-padding-x", `${paddingX}px`);
            app.style.setProperty("--calculator-viewport-padding-y", `${paddingY}px`);
            app.style.setProperty("--calculator-shell-width", `${shellWidth}px`);
            app.style.setProperty("--calculator-shell-height", `${shellHeight}px`);

            setScale(nextScale);
        };

        updateLayout();
        window.addEventListener("resize", updateLayout);

        return () => {
            window.removeEventListener("resize", updateLayout);
        };
    }, []);

    return (
        <section ref={viewRef} className="calculator-view" aria-label="Calculator">
            <div className="calculator-shell">
                {scale !== null && (
                    <div
                        className="calculator-stage"
                        style={{
                            width: CALCULATOR_BODY_WIDTH,
                            height: CALCULATOR_BODY_HEIGHT,
                            transform: `scale(${scale})`,
                        }}
                    >
                        <img
                            className="calculator-body"
                            src={assetUrl("assets/calculator/body.webp")}
                            alt=""
                            draggable={false}
                        />

                        <CalculatorDisplay display={display} />
                        <CalculatorKeyboard
                            onButtonPressStart={onButtonPressStart}
                            onButtonPress={onButtonPress}
                            isButtonPressed={isButtonPressed}
                        />
                        <CalculatorAppButtons
                            actions={appButtonActions}
                            onPressStart={onAppButtonPressStart}
                            settingsButtonAttention={settingsButtonAttention}
                        />
                    </div>
                )}
            </div>
        </section>
    );
}

export default CalculatorView
