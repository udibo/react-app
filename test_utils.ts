import { _env, AppWindow, getEnv } from "./env.ts";

/**
 * This function sets up a simulated browser environment that is used until the promise returned by the callback resolves or rejects.
 */
export async function inBrowser(fn: () => Promise<void>) {
  try {
    (window as AppWindow).app = {
      env: {
        "APP_ENV": getEnv("APP_ENV"),
      },
      context: {},
    };
    _env.isServer = false;
    await fn();
  } finally {
    delete (window as Partial<AppWindow>).app;
    _env.isServer = true;
  }
}

/**
 * This function sets up a simulated browser environment that is used until the callback returns or throws.
 */
export function inBrowserSync(fn: () => void) {
  try {
    (window as AppWindow).app = {
      env: {
        "APP_ENV": getEnv("APP_ENV"),
      },
      context: {},
    };
    _env.isServer = false;
    fn();
  } finally {
    delete (window as Partial<AppWindow>).app;
    _env.isServer = true;
  }
}

/**
 * This function sets the `APP_ENV` environment variable to the provided `environment` until the promise returned by the callback resolves or rejects.
 */
export async function inEnvironment(
  environment: string,
  fn: () => Promise<void>,
): Promise<void> {
  const original = Deno.env.get("APP_ENV");
  try {
    Deno.env.set("APP_ENV", environment);
    await fn();
  } finally {
    if (original) {
      Deno.env.set("APP_ENV", original);
    } else {
      Deno.env.delete("APP_ENV");
    }
  }
}

/**
 * This function sets the `APP_ENV` environment variable to the provided `environment` until the callback returns or throws.
 */
export function inEnvironmentSync(environment: string, fn: () => void): void {
  const original = Deno.env.get("APP_ENV");
  try {
    Deno.env.set("APP_ENV", environment);
    fn();
  } finally {
    if (original) {
      Deno.env.set("APP_ENV", original);
    } else {
      Deno.env.delete("APP_ENV");
    }
  }
}
