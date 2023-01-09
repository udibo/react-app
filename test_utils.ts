import { AppWindow, getEnv } from "./env.ts";
import { _internals } from "./_internals.ts";

export async function inBrowser(fn: () => Promise<void>) {
  try {
    (window as AppWindow).app = {
      env: {
        "APP_ENV": getEnv("APP_ENV"),
      },
      context: {},
    };
    _internals.isServer = false;
    await fn();
  } finally {
    delete (window as Partial<AppWindow>).app;
    _internals.isServer = true;
  }
}

export function inBrowserSync(fn: () => void) {
  try {
    (window as AppWindow).app = {
      env: {
        "APP_ENV": getEnv("APP_ENV"),
      },
      context: {},
    };
    _internals.isServer = false;
    fn();
  } finally {
    delete (window as Partial<AppWindow>).app;
    _internals.isServer = true;
  }
}

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
