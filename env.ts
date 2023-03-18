import { createContext } from "npm/react";

import { HttpErrorOptions } from "./error.tsx";

/** A constant used for internal purposes only. */
export const _env = {
  /** Inidicates whether the code is running on the server or not. */
  isServer: "Deno" in globalThis,
};

/** A function that returns a boolean indicating whether the code is running on the server or not. */
export const isServer = () => _env.isServer;

/** A function that returns a boolean indicating whether the code is running in the browser or not. */
export const isBrowser = () => !isServer();

/** Used to represent environment variables shared with the browser. */
export interface AppEnvironment {
  [key: string]: string | undefined;
}

/** A type representing the browser's window object augmented with an `app` property that is used for internal purposes only. */
export type AppWindow<
  AppContext extends Record<string, unknown> = Record<string, unknown>,
> = typeof window & {
  app: { env: AppEnvironment; context: AppContext; error?: HttpErrorOptions };
};

/**
 * A function that takes a string key representing an environment variable and returns its value.
 * If the code is running on the server, it uses the `Deno.env.get` function to retrieve the value of the environment variable.
 * Otherwise it retrieves it from the browser's `app.env` object. The `app.env` object is used for internal purposes only.
 */
export const getEnv = (
  key: string,
) => (isServer() ? Deno.env.get(key) : (window as AppWindow).app.env[key]);

/** A function that returns a boolean indicating whether the code is running in the test environment or not. */
export const isTest = () => getEnv("APP_ENV") === "test";

/** A function that returns a boolean indicating whether the code is running in the development environment or not. */
export const isDevelopment = () => {
  const env = getEnv("APP_ENV");
  return !env || env === "development";
};

/** A function that returns a boolean indicating whether the code is running in the production environment or not. */
export const isProduction = () => getEnv("APP_ENV") === "production";

/**
 * A function that creates a React context object for the app.
 * It takes an optional generic parameter representing the type of the initial value of the context.
 * The context object created can hold any app-specific data, and its state will be serialized and shared with the browser.
 */
export function createAppContext<
  AppContext extends Record<string, unknown> = Record<string, unknown>,
>(defaultValue?: AppContext) {
  return createContext<AppContext>(defaultValue ?? {} as AppContext);
}
