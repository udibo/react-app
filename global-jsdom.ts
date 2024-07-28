/**
 * This module is used to setup the jsdom environment for the tests.
 * This module should be imported before importing react testing library.
 * If you do not import this file before importing react testing library,
 * you will get an error when calling any of the screen functions.
 *
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { describe, it } from "@std/testing/bdd";
 * import "@udibo/react-app/global-jsdom";
 * import { cleanup, render, screen } from "@testing-library/react";
 *
 * const loadingTests = describe({
 *   name: "Loading",
 *   afterEach() {
 *     cleanup();
 *   },
 * });
 *
 * it(loadingTests, "renders loading message", () => {
 *   render(<Loading />);
 *   assertEquals(screen.getByText("Loading...").textContent, "Loading...");
 * });
 * ```
 *
 * If the default jsdom options do not work for your usecase, you can create your own `global-jsdom.ts` file to use instead of this module.
 * Just replace the html and options arguments in the following example with your own values.
 *
 * ```ts
 * import jsdom from "global-jsdom";
 * jsdom(html, options);
 * ```
 *
 * Then in your test files, do `import "./global-jsdom.js";` instead of `import "@udibo/react-app/global-jsdom";` before importing react testing library.
 * The path to the `global-jsdom.js` file should be relative to the test file.
 *
 * @module
 */

import jsdom from "global-jsdom";
jsdom();
