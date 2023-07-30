import {
  assertEquals,
  assertRejects,
  assertStrictEquals,
  assertThrows,
} from "std/assert/mod.ts";
import { describe, it } from "std/testing/bdd.ts";
import { delay } from "std/async/delay.ts";

import {
  AppWindow,
  getEnv,
  isBrowser,
  isDevelopment,
  isProduction,
  isServer,
  isTest,
} from "./env.ts";
import {
  inBrowser,
  inBrowserSync,
  inEnvironment,
  inEnvironmentSync,
} from "./test_utils.ts";

it("inBrowser", async () => {
  assertEquals(isServer(), true);
  assertEquals(isBrowser(), false);
  await assertRejects(
    () =>
      inBrowser(async () => {
        assertEquals(isServer(), false);
        assertEquals(isBrowser(), true);
        await delay(0);
        assertEquals(isServer(), false);
        assertEquals(isBrowser(), true);
        throw new Error("rejects");
      }),
    Error,
    "rejects",
  );
  assertEquals(isServer(), true);
  assertEquals(isBrowser(), false);
  await inBrowser(async () => {
    assertEquals(isServer(), false);
    assertEquals(isBrowser(), true);
    await delay(0);
    assertEquals(isServer(), false);
    assertEquals(isBrowser(), true);
  });
  assertEquals(isServer(), true);
  assertEquals(isBrowser(), false);
});

it("inBrowserSync", () => {
  assertEquals(isServer(), true);
  assertEquals(isBrowser(), false);
  assertThrows(
    () =>
      inBrowserSync(() => {
        assertEquals(isServer(), false);
        assertEquals(isBrowser(), true);
        throw new Error("throws");
      }),
    Error,
    "throws",
  );
  assertEquals(isServer(), true);
  assertEquals(isBrowser(), false);
  inBrowserSync(() => {
    assertEquals(isServer(), false);
    assertEquals(isBrowser(), true);
  });
  assertEquals(isServer(), true);
  assertEquals(isBrowser(), false);
});

const isBrowserTests = describe("isBrowser");

it(isBrowserTests, "false in server", () => {
  assertEquals(isBrowser(), false);
});

it(isBrowserTests, "true in browser", () => {
  inBrowserSync(() => {
    assertEquals(isBrowser(), true);
  });
});

const isServerTests = describe("isServer");

it(isServerTests, "true in server", () => {
  assertEquals(isServer(), true);
});

it(isServerTests, "false in browser", () => {
  inBrowserSync(() => {
    assertEquals(isServer(), false);
  });
});

it("inEnvironment", async () => {
  assertEquals(Deno.env.get("APP_ENV"), "test");
  await assertRejects(
    () =>
      inEnvironment("fake", async () => {
        assertEquals(Deno.env.get("APP_ENV"), "fake");
        await delay(0);
        assertEquals(Deno.env.get("APP_ENV"), "fake");
        throw new Error("rejects");
      }),
    Error,
    "rejects",
  );

  assertEquals(Deno.env.get("APP_ENV"), "test");
  await inEnvironment("fake", async () => {
    assertEquals(Deno.env.get("APP_ENV"), "fake");
    await delay(0);
    assertEquals(Deno.env.get("APP_ENV"), "fake");
  });
  assertEquals(Deno.env.get("APP_ENV"), "test");

  const original = Deno.env.get("APP_ENV");
  try {
    Deno.env.delete("APP_ENV");

    assertEquals(Deno.env.get("APP_ENV"), undefined);
    await inEnvironment("fake", async () => {
      assertEquals(Deno.env.get("APP_ENV"), "fake");
      await delay(0);
      assertEquals(Deno.env.get("APP_ENV"), "fake");
    });
    assertEquals(Deno.env.get("APP_ENV"), undefined);
  } finally {
    if (original) {
      Deno.env.set("APP_ENV", original);
    }
  }
});

it("inEnvironmentSync", () => {
  assertEquals(Deno.env.get("APP_ENV"), "test");
  assertThrows(
    () =>
      inEnvironmentSync("fake", () => {
        assertEquals(Deno.env.get("APP_ENV"), "fake");
        throw new Error("throws");
      }),
    Error,
    "throws",
  );

  assertEquals(Deno.env.get("APP_ENV"), "test");
  inEnvironmentSync("fake", () => {
    assertEquals(Deno.env.get("APP_ENV"), "fake");
  });
  assertEquals(Deno.env.get("APP_ENV"), "test");

  const original = Deno.env.get("APP_ENV");
  try {
    Deno.env.delete("APP_ENV");

    assertEquals(Deno.env.get("APP_ENV"), undefined);
    inEnvironmentSync("fake", () => {
      assertEquals(Deno.env.get("APP_ENV"), "fake");
    });
    assertEquals(Deno.env.get("APP_ENV"), undefined);
  } finally {
    if (original) {
      Deno.env.set("APP_ENV", original);
    }
  }
});

const getEnvTests = describe("getEnv");

it(getEnvTests, "uses Deno.env.get in server", () => {
  assertEquals(Deno.env.get("APP_ENV"), "test");
  assertEquals(getEnv("APP_ENV"), "test");
  inEnvironmentSync("development", () => {
    assertEquals(Deno.env.get("APP_ENV"), "development");
    assertEquals(getEnv("APP_ENV"), "development");
  });
});

it(getEnvTests, "uses window.app.env in browser", () => {
  inBrowserSync(() => {
    assertEquals(Deno.env.get("APP_ENV"), "test");
    assertEquals((window as AppWindow).app.env.APP_ENV, "test");
    assertEquals(getEnv("APP_ENV"), "test");
    (window as AppWindow).app.env.APP_ENV = "development";
    assertEquals(Deno.env.get("APP_ENV"), "test");
    assertEquals(getEnv("APP_ENV"), "development");
  });
});

const isTestTests = describe("isTest");

it(isTestTests, "true in test", () => {
  assertStrictEquals(isTest(), true);
});

it(isTestTests, "false in other environments", () => {
  inEnvironmentSync("development", () => {
    assertStrictEquals(isTest(), false);
  });
  inEnvironmentSync("production", () => {
    assertStrictEquals(isTest(), false);
  });
  inEnvironmentSync("fake", () => {
    assertStrictEquals(isTest(), false);
  });
});

const isDevelopmentTests = describe("isDevelopment");

it(isDevelopmentTests, "true in development", () => {
  inEnvironmentSync("development", () => {
    assertStrictEquals(isDevelopment(), true);
  });
});

it(isDevelopmentTests, "false in other environments", () => {
  assertStrictEquals(isDevelopment(), false);
  inEnvironmentSync("production", () => {
    assertStrictEquals(isDevelopment(), false);
  });
  inEnvironmentSync("fake", () => {
    assertStrictEquals(isDevelopment(), false);
  });
});

const isProductionTests = describe("isProduction");

it(isProductionTests, "true in production", () => {
  inEnvironmentSync("production", () => {
    assertStrictEquals(isProduction(), true);
  });
});

it(isProductionTests, "false in other environments", () => {
  assertStrictEquals(isProduction(), false);
  inEnvironmentSync("development", () => {
    assertStrictEquals(isProduction(), false);
  });
  inEnvironmentSync("fake", () => {
    assertStrictEquals(isProduction(), false);
  });
});
