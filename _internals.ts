/**
 * Used internally for testing if code is running on the server or in the browser.
 * Replace isServer with false to simulate being in the browser.
 */
export const _internals = {
  isServer: "Deno" in globalThis,
};
