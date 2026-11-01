import { assetUrl } from "../../shared/assetUrl.ts";
import { routes } from "../../shared/routes.ts";
import "../../styles/site.css";

export function HomePage() {
    return (
        <article className="site-page site-page--home">
            <section className="hero">
                <div className="hero__text">
                    <h1>First of all</h1>
                    <p className="lead">
                        <span>This is a calculator.</span>
                        <span>It is free.</span>
                        <span>No ads, no in-app purchases.</span>
                    </p>
                    <p>
                        Calculator Comrade is a software replica inspired by a classic 8-digit pocket calculator.
                        It meticulously emulates the behavior of the calculator’s processor and
                        its Binary-Coded Decimal calculation algorithms.
                    </p>
                    <p className="hero__actions">
                        <a className="hero__primary-action" href={routes.calculator}>Use Calculator</a>
                        <a className="hero__secondary-action" href={routes.tips}>Read Tips & Tricks</a>
                    </p>
                </div>
                <img
                    className="hero__image"
                    src={assetUrl("screenshots/pixel2_277x512_framed.png")}
                    alt="Calculator Comrade screenshot"
                />
            </section>

            <section>
                <h2>Why yet another calculator app?</h2>
                <p>
                    An old pocket calculator can be surprisingly handy in everyday life.
                    For example, press <code>1 + =</code> and then keep pressing <code>=</code>
                    to use it as a counter. Or press <code>× =</code> to get a square number.
                    Or press <code>÷ =</code> to get <span className="home-page__calculator-variable"><var><sup>1</sup>/<sub>x</sub></var></span>&nbsp;.
                </p>
                <p>
                    These small <a href={routes.tips}>tricks</a> are part of the charm of classic basic calculators.
                    Calculator Comrade keeps that behavior instead of turning the app into
                    another scientific calculator.
                </p>
            </section>

            <section>
                <h2>What is this calculator?</h2>
                <p>
                    <p>
                        Calculator Comrade is a non-commercial project released under the MIT License.
                    </p>

                    <p>
                        The project is split into two open source repositories. The calculator engine
                        lives in{" "}
                        <a
                            href="https://github.com/calculator-comrade/calculator-comrade-lib"
                            target="_blank"
                            rel="noreferrer"
                        >
                            calculator-comrade-lib
                        </a>
                        {" "}– a small cross-platform core library designed to be usable not only in
                        desktop and web applications, but also in embedded projects.
                    </p>

                    <p>
                        The{" "}
                        <a
                            href="https://github.com/calculator-comrade/calculator-comrade"
                            target="_blank"
                            rel="noreferrer"
                        >
                            calculator-comrade
                        </a>
                        {" "}repository contains this application, the website, legal pages, support
                        pages, and platform-specific app wrappers.
                    </p>
                </p>
            </section>

            <section>
                <h2>Why is this app free?</h2>
                <ol>
                    <li>
                        There are already thousands of calculators in the world,
                        and I probably cannot rule the world by selling one more.
                    </li>
                    <li>
                        It is a hobby project. Building it, studying old calculator behavior,
                        and recreating it accurately is part of the fun.
                    </li>
                    <li>
                        It is also a small tribute to the pioneers who designed those early calculator processors.
                        The deeper I went into reverse engineering, the more I appreciated how thoughtful their
                        technical and user-experience decisions were.
                    </li>
                </ol>
            </section>
        </article>
    );
}
