import { createContext } from "$npm/react";

import { HttpErrorOptions } from "./error.tsx";
import { _internals } from "./_internals.ts";

export const isServer = () => _internals.isServer;

export const isBrowser = () => !isServer();

export interface AppEnvironment {
  [key: string]: string | undefined;
}

export type AppWindow<
  AppContext extends Record<string, unknown> = Record<string, unknown>,
> = typeof window & {
  app: { env: AppEnvironment; context: AppContext; error?: HttpErrorOptions };
};

export const getEnv = (
  key: string,
) => (isServer() ? Deno.env.get(key) : (window as AppWindow).app.env[key]);

export const isTest = () => getEnv("APP_ENV") === "test";

export const isDevelopment = () => {
  const env = getEnv("APP_ENV");
  return !env || env === "development";
};

export const isProduction = () => getEnv("APP_ENV") === "production";

export const AppContext = createContext({});
