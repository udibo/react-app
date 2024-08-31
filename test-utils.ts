/**
 * This module provides utilities for testing the application.
 *
 * @module
 */
import { _env, getEnvironment, isServer } from "./env.ts";
import type { AppData, AppWindow } from "./env.ts";
import { ErrorContext, InitialStateContext } from "./context.ts";

export { ErrorContext, InitialStateContext };
export type { AppData };

/** A simulated browser environment resource that is disposable. */
export interface SimulatedBrowser extends Disposable {
  /** Stops simulating the browser environment. */
  end(): void;
}

/**
 * This function sets up a new simulated browser environment. When end is called, it will stop simulating the browser environment.
 *
 * When called without any arguments, it will simulate a new browser environment with the current environment's `APP_ENV` environment variable.
 *
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { getEnvironment, isBrowser, isDevelopment, isProduction, isServer, isTest } from "@udibo/react-app";
 * import { startBrowser } from "@udibo/react-app/test-utils";
 *
 * // This code is running on the server.
 * assertEquals(isBrowser(), false);
 * assertEquals(isServer(), true);
 * assertEquals(getEnvironment(), "test");
 * assertEquals(isDevelopment(), false);
 * assertEquals(isProduction(), false);
 * assertEquals(isTest(), true);
 *
 * // Simulate a new browser environment.
 * const browser = startBrowser();
 * try {
 *   // It now looks like the code is running in the browser.
 *   assertEquals(isBrowser(), true);
 *   assertEquals(isServer(), false);
 *   assertEquals(getEnvironment(), "test");
 *   assertEquals(isDevelopment(), false);
 *   assertEquals(isProduction(), false);
 *   assertEquals(isTest(), true);
 * } finally {
 *   // End the simulation.
 *   browser.end();
 * }
 *
 * // It no longer looks like the code is running in the browser.
 * assertEquals(isBrowser(), false);
 * assertEquals(isServer(), true);
 * assertEquals(getEnvironment(), "test");
 * assertEquals(isDevelopment(), false);
 * assertEquals(isProduction(), false);
 * assertEquals(isTest(), true);
 * ```
 *
 * When called with an `app` argument, it will simulate a new browser environment based on it.
 *
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { getEnvironment, isBrowser, isDevelopment, isProduction, isServer, isTest } from "@udibo/react-app";
 * import { startBrowser } from "@udibo/react-app/test-utils";
 *
 * // This code is running on the server.
 * assertEquals(isBrowser(), false);
 * assertEquals(isServer(), true);
 * assertEquals(getEnvironment(), "test");
 * assertEquals(isDevelopment(), false);
 * assertEquals(isProduction(), false);
 * assertEquals(isTest(), true);
 *
 * // Simulate a new browser environment in development mode.
 * const browser = startBrowser({
 *   env: "development",
 *   initialState: {},
 * });
 * try {
 *   // It now looks like the code is running in the browser.
 *   assertEquals(isBrowser(), true);
 *   assertEquals(isServer(), false);
 *   assertEquals(getEnvironment(), "development");
 *   assertEquals(isDevelopment(), true);
 *   assertEquals(isProduction(), false);
 *   assertEquals(isTest(), false);
 * } finally {
 *   // End the simulation.
 *   browser.end();
 * }
 *
 * // It no longer looks like the code is running in the browser.
 * assertEquals(isBrowser(), false);
 * assertEquals(isServer(), true);
 * assertEquals(getEnvironment(), "test");
 * assertEquals(isDevelopment(), false);
 * assertEquals(isProduction(), false);
 * assertEquals(isTest(), true);
 * ```
 *
 * The simulated browser environment is disposable meaning it will automatically call the end function when leaving a scope that it is used in.
 *
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { getEnvironment, isBrowser, isDevelopment, isProduction, isServer, isTest } from "@udibo/react-app";
 * import { startBrowser } from "@udibo/react-app/test-utils";
 *
 * // This code is running on the server.
 * assertEquals(isBrowser(), false);
 * assertEquals(isServer(), true);
 * assertEquals(getEnvironment(), "test");
 * assertEquals(isDevelopment(), false);
 * assertEquals(isProduction(), false);
 * assertEquals(isTest(), true);
 *
 * // This function simulates a new browser environment until the function returns.
 * function test() {
 *   // Simulate a new browser environment in production mode.
 *   using _browser = startBrowser({
 *     env: "production",
 *     initialState: {},
 *   });
 *
 *   // It now looks like the code is running in the browser.
 *   assertEquals(isBrowser(), true);
 *   assertEquals(isServer(), false);
 *   assertEquals(getEnvironment(), "production");
 *   assertEquals(isDevelopment(), false);
 *   assertEquals(isProduction(), true);
 *   assertEquals(isTest(), false);
 * }
 * // Invoking the test function will simulate the browser environment and undo any changes made to it when the function returns.
 * test();
 *
 * // It no longer looks like the code is running in the browser.
 * assertEquals(isBrowser(), false);
 * assertEquals(isServer(), true);
 * assertEquals(getEnvironment(), "test");
 * assertEquals(isDevelopment(), false);
 * assertEquals(isProduction(), false);
 * assertEquals(isTest(), true);
 * ```
 *
 * Calling the end function allows you to stop simulating the browser without having to leave the scope where browser mode was started.
 *
 * @param app - A JSON representation of the app in the simulated browser environment.
 * @returns A simulated browser environment resource that is disposable.
 */
export function startBrowser<
  SharedState extends Record<string, unknown> = Record<string, unknown>,
>(app?: AppData<SharedState>): SimulatedBrowser {
  const originalWindow = globalThis.window;
  globalThis.window = originalWindow ?? {};
  const originalApp = (globalThis.window as AppWindow).app;
  if (!app) {
    app = {
      env: getEnvironment(),
      initialState: {} as SharedState,
    };
  }
  (globalThis.window as AppWindow).app = app;

  const isServer = _env.isServer;
  _env.isServer = false;

  return {
    end(): void {
      _env.isServer = isServer;
      if (originalApp) {
        (globalThis.window as AppWindow).app = originalApp;
      } else {
        delete (globalThis.window as AppWindow).app;
      }
      globalThis.window = originalWindow;
    },
    [Symbol.dispose]() {
      this.end();
    },
  };
}

/** A simulated environment resource that is disposable. */
export interface SimulatedEnvironment extends Disposable {
  /** Stops simulating the environment. */
  end(): void;
}

/**
 * This function sets up a new simulated environment based on the current environment. When end is called, it will stop simulating the environment.
 *
 * When called without any arguments, it will simulate the current environment and undo any changes made to it when end is called.
 *
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { getEnvironment, isDevelopment, isProduction, isTest } from "@udibo/react-app";
 * import { startEnvironment } from "@udibo/react-app/test-utils";
 *
 * // Environment variables before simulating the environment.
 * assertEquals(getEnvironment(), "test");
 * assertEquals(isDevelopment(), false);
 * assertEquals(isProduction(), false);
 * assertEquals(isTest(), true);
 * assertEquals(Deno.env.get("APP_ENV"), "test");
 * assertEquals(Deno.env.get("PASSWORD"), "hunter2");
 * assertEquals(Deno.env.get("EXAMPLE"), undefined);
 *
 * // Simulate a new environment based on the current environment.
 * const environment = startEnvironment();
 * try {
 *   // Unchanged variables are still the same as before the simulation started.
 *   assertEquals(getEnvironment(), "test");
 *   assertEquals(isDevelopment(), false);
 *   assertEquals(isProduction(), false);
 *   assertEquals(isTest(), true);
 *   assertEquals(Deno.env.get("APP_ENV"), "test");
 *   assertEquals(Deno.env.get("EXAMPLE"), undefined);
 *
 *   // Environment variables can be changed.
 *   Deno.env.set("APP_ENV", "production");
 *   assertEquals(getEnvironment(), "production");
 *   assertEquals(isDevelopment(), false);
 *   assertEquals(isProduction(), true);
 *   assertEquals(isTest(), false);
 *   assertEquals(Deno.env.get("APP_ENV"), "production");
 *   Deno.env.set("PASSWORD", "qwerty");
 *   assertEquals(Deno.env.get("PASSWORD"), "qwerty");
 *
 *   // New environment variables can be created.
 *   Deno.env.set("EXAMPLE", "example");
 *   assertEquals(Deno.env.get("EXAMPLE"), "example");
 * } finally {
 *   // End the simulation.
 *   environment.end();
 * }
 *
 * // Environment variables are back to their original values.
 * assertEquals(getEnvironment(), "test");
 * assertEquals(isDevelopment(), false);
 * assertEquals(isProduction(), false);
 * assertEquals(isTest(), true);
 * assertEquals(Deno.env.get("APP_ENV"), "test");
 * assertEquals(Deno.env.get("PASSWORD"), "hunter2");
 * assertEquals(Deno.env.get("EXAMPLE"), undefined);
 * ```
 *
 * When called with an `appEnvironment` argument, it will simulate the app environment and undo any changes made to it when end is called.
 *
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { getEnvironment, isDevelopment, isProduction, isTest } from "@udibo/react-app";
 * import { startEnvironment } from "@udibo/react-app/test-utils";
 *
 * // Environment variables before simulating the environment
 * assertEquals(getEnvironment(), "test");
 * assertEquals(isDevelopment(), false);
 * assertEquals(isProduction(), false);
 * assertEquals(isTest(), true);
 * assertEquals(Deno.env.get("APP_ENV"), "test");
 * assertEquals(Deno.env.get("PASSWORD"), "hunter2");
 * assertEquals(Deno.env.get("EXAMPLE"), undefined);
 *
 * // Simulate a new production environment based on the current environment.
 * const environment = startEnvironment("production");
 * try {
 *   // The APP_ENV environment variable is now "production".
 *   assertEquals(getEnvironment(), "production");
 *   assertEquals(isDevelopment(), false);
 *   assertEquals(isProduction(), true);
 *   assertEquals(isTest(), false);
 *   assertEquals(Deno.env.get("APP_ENV"), "production");
 *
 *   // unchanged variables are still the same as before the simulation started.
 *   assertEquals(Deno.env.get("PASSWORD"), "hunter2");
 *
 *   // Environment variables can be changed.
 *   Deno.env.set("PASSWORD", "qwerty");
 *   assertEquals(Deno.env.get("PASSWORD"), "qwerty");
 *
 *   // New environment variables can be created.
 *   Deno.env.set("EXAMPLE", "example");
 *   assertEquals(Deno.env.get("EXAMPLE"), "example");
 * } finally {
 *   // End the simulation.
 *   environment.end();
 * }
 *
 * // Environment variables are back to their original values.
 * assertEquals(getEnvironment(), "test");
 * assertEquals(isDevelopment(), false);
 * assertEquals(isProduction(), false);
 * assertEquals(isTest(), true);
 * assertEquals(Deno.env.get("APP_ENV"), "test");
 * assertEquals(Deno.env.get("PASSWORD"), "hunter2");
 * assertEquals(Deno.env.get("EXAMPLE"), undefined);
 * ```
 *
 * When called with an `environment` argument, it will add that environment to the current environment and will undo changes made when exit is called.
 *
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { getEnvironment, isDevelopment, isProduction, isTest } from "@udibo/react-app";
 * import { startEnvironment } from "@udibo/react-app/test-utils";
 *
 * // Environment variables before simulating the environment
 * assertEquals(getEnvironment(), "test");
 * assertEquals(isDevelopment(), false);
 * assertEquals(isProduction(), false);
 * assertEquals(isTest(), true);
 * assertEquals(Deno.env.get("APP_ENV"), "test");
 * assertEquals(Deno.env.get("PASSWORD"), "hunter2");
 * assertEquals(Deno.env.get("EXAMPLE"), undefined);
 *
 * // Simulate a new production environment based on the current environment.
 * const environment = startEnvironment({
 *   APP_ENV: "production",
 *   PASSWORD: "qwerty",
 * });
 * try {
 *   // The APP_ENV environment variable is now "production".
 *   assertEquals(getEnvironment(), "production");
 *   assertEquals(isDevelopment(), false);
 *   assertEquals(isProduction(), true);
 *   assertEquals(isTest(), false);
 *   assertEquals(Deno.env.get("APP_ENV"), "production");
 *
 *   // The PASSWORD environment variable is now "qwerty".
 *   assertEquals(Deno.env.get("PASSWORD"), "qwerty");
 *
 *   // Environment variables can be changed.
 *   Deno.env.set("PASSWORD", "123456");
 *   assertEquals(Deno.env.get("PASSWORD"), "123456");
 *
 *   // New environment variables can be created.
 *   Deno.env.set("EXAMPLE", "example");
 *   assertEquals(Deno.env.get("EXAMPLE"), "example");
 * } finally {
 *   environment.end();
 * }
 *
 * // Environment variables are back to their original values.
 * assertEquals(getEnvironment(), "test");
 * assertEquals(isDevelopment(), false);
 * assertEquals(isProduction(), false);
 * assertEquals(isTest(), true);
 * assertEquals(Deno.env.get("APP_ENV"), "test");
 * assertEquals(Deno.env.get("PASSWORD"), "hunter2");
 * assertEquals(Deno.env.get("EXAMPLE"), undefined);
 * ```
 *
 * When called with an `appEnvironment` and `environment` argument, it will simulate the app environment and add that environment to the current environment
 * and will undo changes made when exit is called.
 *
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { getEnvironment, isDevelopment, isProduction, isTest } from "@udibo/react-app";
 * import { startEnvironment } from "@udibo/react-app/test-utils";
 *
 * // Environment variables before simulating the environment
 * assertEquals(getEnvironment(), "test");
 * assertEquals(isDevelopment(), false);
 * assertEquals(isProduction(), false);
 * assertEquals(isTest(), true);
 * assertEquals(Deno.env.get("APP_ENV"), "test");
 * assertEquals(Deno.env.get("PASSWORD"), "hunter2");
 * assertEquals(Deno.env.get("EXAMPLE"), undefined);
 *
 * // Simulate a new production environment based on the current environment.
 * const environment = startEnvironment("production", { PASSWORD: "qwerty" });
 * try {
 *   // The APP_ENV environment variable is now "production".
 *   assertEquals(getEnvironment(), "production");
 *   assertEquals(isDevelopment(), false);
 *   assertEquals(isProduction(), true);
 *   assertEquals(isTest(), false);
 *   assertEquals(Deno.env.get("APP_ENV"), "production");
 *
 *   // The PASSWORD environment variable is now "qwerty".
 *   assertEquals(Deno.env.get("PASSWORD"), "qwerty");
 *
 *   // Environment variables can be changed.
 *   Deno.env.set("PASSWORD", "123456");
 *   assertEquals(Deno.env.get("PASSWORD"), "123456");
 *
 *   // New environment variables can be created.
 *   Deno.env.set("EXAMPLE", "example");
 *   assertEquals(Deno.env.get("EXAMPLE"), "example");
 * } finally {
 *   environment.end();
 * }
 *
 * // Environment variables are back to their original values.
 * assertEquals(getEnvironment(), "test");
 * assertEquals(isDevelopment(), false);
 * assertEquals(isProduction(), false);
 * assertEquals(isTest(), true);
 * assertEquals(Deno.env.get("APP_ENV"), "test");
 * assertEquals(Deno.env.get("PASSWORD"), "hunter2");
 * assertEquals(Deno.env.get("EXAMPLE"), undefined);
 * ```
 *
 * The simulated environment is disposable meaning it will automatically call the end function when leaving a scope that it is used in.
 *
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { getEnvironment, isDevelopment, isProduction, isTest } from "@udibo/react-app";
 * import { startEnvironment } from "@udibo/react-app/test-utils";
 *
 * // Environment variables before simulating the environment
 * assertEquals(getEnvironment(), "test");
 * assertEquals(isDevelopment(), false);
 * assertEquals(isProduction(), false);
 * assertEquals(isTest(), true);
 * assertEquals(Deno.env.get("APP_ENV"), "test");
 * assertEquals(Deno.env.get("PASSWORD"), "hunter2");
 * assertEquals(Deno.env.get("EXAMPLE"), undefined);
 *
 * // This function simulates a new production environment until the function returns.
 * function test() {
 *   // Simulate a new production environment based on the current environment.
 *   using _environment = startEnvironment("production", { PASSWORD: "qwerty" });
 *
 *   // The APP_ENV environment variable is now "production".
 *   assertEquals(getEnvironment(), "production");
 *   assertEquals(isDevelopment(), false);
 *   assertEquals(isProduction(), true);
 *   assertEquals(isTest(), false);
 *   assertEquals(Deno.env.get("APP_ENV"), "production");
 *
 *   // The PASSWORD environment variable is now "qwerty".
 *   assertEquals(Deno.env.get("PASSWORD"), "qwerty");
 *
 *   // Environment variables can be changed.
 *   Deno.env.set("PASSWORD", "123456");
 *   assertEquals(Deno.env.get("PASSWORD"), "123456");
 *
 *   // New environment variables can be created.
 *   Deno.env.set("EXAMPLE", "example");
 *   assertEquals(Deno.env.get("EXAMPLE"), "example");
 * }
 * // Invoking the test function will simulate the environment and undo any changes made to it when the function returns.
 * test();
 *
 * // Environment variables are back to their original values.
 * assertEquals(getEnvironment(), "test");
 * assertEquals(isDevelopment(), false);
 * assertEquals(isProduction(), false);
 * assertEquals(isTest(), true);
 * assertEquals(Deno.env.get("APP_ENV"), "test");
 * assertEquals(Deno.env.get("PASSWORD"), "hunter2");
 * assertEquals(Deno.env.get("EXAMPLE"), undefined);
 * ```
 *
 * Calling the end function allows you to stop simulating the environment without having to leave the scope where it was started.
 *
 * @param appEnvironment - The name of the app environment to simulate.
 * @param environment - The environment to simulate.
 * @returns A simulated environment resource that is disposable.
 */
export function startEnvironment(
  environment?: Record<string, string | null>,
): SimulatedEnvironment;
export function startEnvironment(
  appEnvironment: string,
  environment?: Record<string, string | null>,
): SimulatedEnvironment;
export function startEnvironment(
  appEnvironment?: string | Record<string, string | null>,
  environment?: Record<string, string | null>,
): SimulatedEnvironment {
  if (!environment && typeof appEnvironment !== "string") {
    environment = appEnvironment;
    appEnvironment = undefined;
  }
  if (typeof environment?.APP_ENV === "string" && appEnvironment) {
    throw new Error(
      "Cannot specify APP_ENV in the environment when called with appEnvironment",
    );
  }

  if (!("Deno" in globalThis)) {
    throw new Error("Can only simulate environment on a Deno server");
  }

  const originalEnvironment = Deno.env.toObject();

  if (isServer()) {
    if (environment) {
      for (const [key, value] of Object.entries(environment)) {
        if (typeof value === "string") {
          Deno.env.set(key, value);
        } else {
          Deno.env.delete(key);
        }
      }
    }
    if (typeof appEnvironment === "string") {
      Deno.env.set("APP_ENV", appEnvironment);
    }
  }

  return {
    end(): void {
      const currentEnvironment = Deno.env.toObject();
      if (originalEnvironment && currentEnvironment) {
        for (const [key, value] of Object.entries(originalEnvironment)) {
          Deno.env.set(key, value);
        }

        for (const key of Object.keys(currentEnvironment)) {
          const value = originalEnvironment[key];
          if (typeof value !== "string") {
            Deno.env.delete(key);
          }
        }
      }
    },
    [Symbol.dispose]() {
      this.end();
    },
  };
}

/**
 * This function sets up a new simulated environment based on the current environment without the specified keys.
 * When end is called, it will stop simulating the environment.
 *
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { omitEnvironment } from "@udibo/react-app/test-utils";
 *
 * // Environment variables before simulating the environment.
 * assertEquals(Deno.env.get("APP_ENV"), "test");
 * assertEquals(Deno.env.get("PASSWORD"), "hunter2");
 * assertEquals(Deno.env.get("EXAMPLE"), undefined);
 *
 * // Simulate a new environment based on the current environment without the "PASSWORD" environment variable.
 * const environment = omitEnvironmentKeys(["PASSWORD"]);
 * try {
 *   // Unspecified variables will still the same as before the simulation started.
 *   assertEquals(Deno.env.get("APP_ENV"), "test");
 *
 *   // The PASSWORD environment variable is now undefined.
 *   assertEquals(Deno.env.get("PASSWORD"), undefined);
 *
 *   // Environment variables can be changed.
 *   Deno.env.set("APP_ENV", "production");
 *   assertEquals(Deno.env.get("APP_ENV"), "production");
 *
 *   // New environment variables can be created.
 *   Deno.env.set("EXAMPLE", "example");
 *   assertEquals(Deno.env.get("EXAMPLE"), "example");
 * } finally {
 *  // End the simulation.
 *  environment.end();
 * }
 *
 * // Environment variables are back to their original values.
 * assertEquals(Deno.env.get("APP_ENV"), "test");
 * assertEquals(Deno.env.get("PASSWORD"), "hunter2");
 * assertEquals(Deno.env.get("EXAMPLE"), undefined);
 * ```
 *
 * The simulated environment is disposable meaning it will automatically call the end function when leaving a scope that it is used in.
 *
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { omitEnvironment } from "@udibo/react-app/test-utils";
 *
 * // Environment variables before simulating the environment.
 * assertEquals(Deno.env.get("APP_ENV"), "test");
 * assertEquals(Deno.env.get("PASSWORD"), "hunter2");
 * assertEquals(Deno.env.get("EXAMPLE"), undefined);
 *
 * // This function simulates a new environment without the "PASSWORD" environment variable until the function returns.
 * function test() {
 *   // Simulate a new production environment based on the current environment.
 *   using _environment = omitEnvironmentKeys(["PASSWORD"]);
 *
 *   // Unspecified variables will still the same as before the simulation started.
 *   assertEquals(Deno.env.get("APP_ENV"), "test");
 *
 *   // The PASSWORD environment variable is now undefined.
 *   assertEquals(Deno.env.get("PASSWORD"), undefined);
 *
 *   // Environment variables can be changed.
 *   Deno.env.set("APP_ENV", "production");
 *   assertEquals(Deno.env.get("APP_ENV"), "production");
 *
 *   // New environment variables can be created.
 *   Deno.env.set("EXAMPLE", "example");
 *   assertEquals(Deno.env.get("EXAMPLE"), "example");
 * }
 * // Invoking the test function will simulate the environment and undo any changes made to it when the function returns.
 * test();
 *
 * // Environment variables are back to their original values.
 * assertEquals(Deno.env.get("APP_ENV"), "test");
 * assertEquals(Deno.env.get("PASSWORD"), "hunter2");
 * assertEquals(Deno.env.get("EXAMPLE"), undefined);
 * ```
 *
 * Calling the end function allows you to stop simulating the environment without having to leave the scope where it was started.
 *
 * @param keys - The environment variables to omit from the simulated environment.
 * @returns A simulated environment resource that is disposable.
 */
export function omitEnvironmentKeys(keys: string[]): SimulatedEnvironment {
  if (keys.length === 0) {
    throw new Error("No keys to omit");
  }
  const omitEnvironment = {} as Record<string, string | null>;
  for (const key of keys) {
    omitEnvironment[key] = null;
  }
  return startEnvironment(omitEnvironment);
}
