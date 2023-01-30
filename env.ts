import { createContext } from "npm/react";

import { HttpErrorOptions } from "./error.tsx";
import { _internals } from "./_internals.ts";

/** Used to determine if the code is running on the server. */
export const isServer = () => _internals.isServer;

/** Used to determine if the code is running in the browser. */
export const isBrowser = () => !isServer();

export interface AppEnvironment {
  [key: string]: string | undefined;
}

export type AppWindow<
  AppContext extends Record<string, unknown> = Record<string, unknown>,
> = typeof window & {
  app: { env: AppEnvironment; context: AppContext; error?: HttpErrorOptions };
};

/**
 * Gets environmental variables.
 * In the browser, only environmental variables shared with it by the server will be accessible.
 */
export const getEnv = (
  key: string,
) => (isServer() ? Deno.env.get(key) : (window as AppWindow).app.env[key]);

/** Used to determine if the code is running in the test environment. */
export const isTest = () => getEnv("APP_ENV") === "test";

/** Used to determine if the code is running in the development environment. */
export const isDevelopment = () => {
  const env = getEnv("APP_ENV");
  return !env || env === "development";
};

/** Used to determine if the code is running in the production environment. */
export const isProduction = () => getEnv("APP_ENV") === "production";

/** Creates a context object for the App. State stored within the AppContext will be serialized and shared with the browser. */
export function createAppContext<
  AppContext extends Record<string, unknown> = Record<string, unknown>,
>(defaultValue?: AppContext) {
  return createContext<AppContext>(defaultValue ?? {} as AppContext);
}
