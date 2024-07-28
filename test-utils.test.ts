import { assertEquals } from "@std/assert";
import { describe, it } from "@std/testing/bdd";

import {
  omitEnvironmentKeys,
  startBrowser,
  startEnvironment,
} from "./test-utils.ts";
import {
  getEnvironment,
  isBrowser,
  isDevelopment,
  isProduction,
  isServer,
  isTest,
} from "./env.ts";
import type { AppWindow } from "./env.ts";

const startBrowserTests = describe("startBrowser");

it(startBrowserTests, "without arguments", () => {
  // This code is running on the server.
  assertEquals(isBrowser(), false);
  assertEquals(isServer(), true);
  assertEquals(getEnvironment(), "test");
  assertEquals(isDevelopment(), false);
  assertEquals(isProduction(), false);
  assertEquals(isTest(), true);

  // There is no app in the current environment.
  assertEquals((window as AppWindow).app, undefined);

  // Simulate a new browser environment.
  const browser = startBrowser();
  try {
    // It now looks like the code is running in the browser.
    assertEquals(isBrowser(), true);
    assertEquals(isServer(), false);
    assertEquals(getEnvironment(), "test");
    assertEquals(isDevelopment(), false);
    assertEquals(isProduction(), false);
    assertEquals(isTest(), true);

    // The JSON representation of the app in the simulated browser environment.
    assertEquals((window as AppWindow).app, {
      env: "test",
      initialState: {},
    });
  } finally {
    // End the simulation.
    browser.end();
  }

  // It no longer looks like the code is running in the browser.
  assertEquals(isBrowser(), false);
  assertEquals(isServer(), true);
  assertEquals(getEnvironment(), "test");
  assertEquals(isDevelopment(), false);
  assertEquals(isProduction(), false);
  assertEquals(isTest(), true);

  // There is no app in the current environment.
  assertEquals((window as AppWindow).app, undefined);
});

it(startBrowserTests, "with app argument", () => {
  // This code is running on the server.
  assertEquals(isBrowser(), false);
  assertEquals(isServer(), true);
  assertEquals(getEnvironment(), "test");
  assertEquals(isDevelopment(), false);
  assertEquals(isProduction(), false);
  assertEquals(isTest(), true);

  // There is no app in the current environment.
  assertEquals((window as AppWindow).app, undefined);

  // Simulate a new browser environment in development mode.
  const browser = startBrowser({
    env: "development",
    initialState: {},
  });
  try {
    // It now looks like the code is running in the browser.
    assertEquals(isBrowser(), true);
    assertEquals(isServer(), false);
    assertEquals(getEnvironment(), "development");
    assertEquals(isDevelopment(), true);
    assertEquals(isProduction(), false);
    assertEquals(isTest(), false);

    // The JSON representation of the app in the simulated browser environment.
    assertEquals((window as AppWindow).app, {
      env: "development",
      initialState: {},
    });
  } finally {
    // End the simulation.
    browser.end();
  }

  // It no longer looks like the code is running in the browser.
  assertEquals(isBrowser(), false);
  assertEquals(isServer(), true);
  assertEquals(getEnvironment(), "test");
  assertEquals(isDevelopment(), false);
  assertEquals(isProduction(), false);
  assertEquals(isTest(), true);

  // There is no app in the current environment.
  assertEquals((window as AppWindow).app, undefined);
});

it(startBrowserTests, "is disposable", () => {
  // This code is running on the server.
  assertEquals(isBrowser(), false);
  assertEquals(isServer(), true);
  assertEquals(getEnvironment(), "test");
  assertEquals(isDevelopment(), false);
  assertEquals(isProduction(), false);
  assertEquals(isTest(), true);

  // There is no app in the current environment.
  assertEquals((window as AppWindow).app, undefined);

  // This function simulates a new browser environment until the function returns.
  function test() {
    // Simulate a new browser environment.
    using _browser = startBrowser({
      env: "production",
      initialState: {},
    });

    // It now looks like the code is running in the browser.
    assertEquals(isBrowser(), true);
    assertEquals(isServer(), false);
    assertEquals(getEnvironment(), "production");
    assertEquals(isDevelopment(), false);
    assertEquals(isProduction(), true);
    assertEquals(isTest(), false);

    // The JSON representation of the app in the simulated browser environment.
    assertEquals((window as AppWindow).app, {
      env: "production",
      initialState: {},
    });
  }
  // Invoking the test function will simulate the browser environment and undo any changes made to it when the function returns.
  test();

  // It no longer looks like the code is running in the browser.
  assertEquals(isBrowser(), false);
  assertEquals(isServer(), true);
  assertEquals(getEnvironment(), "test");
  assertEquals(isDevelopment(), false);
  assertEquals(isProduction(), false);
  assertEquals(isTest(), true);

  // There is no app in the current environment.
  assertEquals((window as AppWindow).app, undefined);
});

const startEnvironmentTests = describe({
  name: "startEnvironment",
  beforeAll: () => {
    Deno.env.set("PASSWORD", "hunter2");
  },
  afterAll: () => {
    Deno.env.delete("PASSWORD");
  },
});

it(startEnvironmentTests, "without arguments", () => {
  // Environment variables before simulating the environment.
  assertEquals(Deno.env.get("APP_ENV"), "test");
  assertEquals(Deno.env.get("PASSWORD"), "hunter2");
  assertEquals(Deno.env.get("EXAMPLE"), undefined);

  // Simulate a new environment based on the current environment.
  const environment = startEnvironment();
  try {
    // Unchanged variables are still the same as before the simulation started.
    assertEquals(Deno.env.get("APP_ENV"), "test");
    assertEquals(Deno.env.get("EXAMPLE"), undefined);

    // Environment variables can be changed.
    Deno.env.set("APP_ENV", "production");
    assertEquals(Deno.env.get("APP_ENV"), "production");
    Deno.env.set("PASSWORD", "qwerty");
    assertEquals(Deno.env.get("PASSWORD"), "qwerty");

    // New environment variables can be created.
    Deno.env.set("EXAMPLE", "example");
    assertEquals(Deno.env.get("EXAMPLE"), "example");
  } finally {
    // End the simulation.
    environment.end();
  }

  // Environment variables are back to their original values.
  assertEquals(Deno.env.get("APP_ENV"), "test");
  assertEquals(Deno.env.get("PASSWORD"), "hunter2");
  assertEquals(Deno.env.get("EXAMPLE"), undefined);
});

it(startEnvironmentTests, "with appEnvironment argument", () => {
  // Environment variables before simulating the environment
  assertEquals(Deno.env.get("APP_ENV"), "test");
  assertEquals(Deno.env.get("PASSWORD"), "hunter2");
  assertEquals(Deno.env.get("EXAMPLE"), undefined);

  // Simulate a new production environment based on the current environment.
  const environment = startEnvironment("production");
  try {
    // The APP_ENV environment variable is now "production".
    assertEquals(Deno.env.get("APP_ENV"), "production");

    // unchanged variables are still the same as before the simulation started.
    assertEquals(Deno.env.get("PASSWORD"), "hunter2");

    // Environment variables can be changed.
    Deno.env.set("PASSWORD", "qwerty");
    assertEquals(Deno.env.get("PASSWORD"), "qwerty");

    // New environment variables can be created.
    Deno.env.set("EXAMPLE", "example");
    assertEquals(Deno.env.get("EXAMPLE"), "example");
  } finally {
    // End the simulation.
    environment.end();
  }

  // Environment variables are back to their original values.
  assertEquals(Deno.env.get("APP_ENV"), "test");
  assertEquals(Deno.env.get("PASSWORD"), "hunter2");
  assertEquals(Deno.env.get("EXAMPLE"), undefined);
});

it(startEnvironmentTests, "with environment argument", () => {
  // Environment variables before simulating the environment
  assertEquals(Deno.env.get("APP_ENV"), "test");
  assertEquals(Deno.env.get("PASSWORD"), "hunter2");
  assertEquals(Deno.env.get("EXAMPLE"), undefined);

  // Simulate a new production environment based on the current environment.
  const environment = startEnvironment({
    APP_ENV: "production",
    PASSWORD: "qwerty",
  });
  try {
    // The APP_ENV environment variable is now "production".
    assertEquals(Deno.env.get("APP_ENV"), "production");

    // The PASSWORD environment variable is now "qwerty".
    assertEquals(Deno.env.get("PASSWORD"), "qwerty");

    // Environment variables can be changed.
    Deno.env.set("PASSWORD", "123456");
    assertEquals(Deno.env.get("PASSWORD"), "123456");

    // New environment variables can be created.
    Deno.env.set("EXAMPLE", "example");
    assertEquals(Deno.env.get("EXAMPLE"), "example");
  } finally {
    environment.end();
  }

  // Environment variables are back to their original values.
  assertEquals(Deno.env.get("APP_ENV"), "test");
  assertEquals(Deno.env.get("PASSWORD"), "hunter2");
  assertEquals(Deno.env.get("EXAMPLE"), undefined);
});

it(startEnvironmentTests, "with all arguments", () => {
  // Environment variables before simulating the environment
  assertEquals(Deno.env.get("APP_ENV"), "test");
  assertEquals(Deno.env.get("PASSWORD"), "hunter2");
  assertEquals(Deno.env.get("EXAMPLE"), undefined);

  // Simulate a new production environment based on the current environment.
  const environment = startEnvironment("production", { PASSWORD: "qwerty" });
  try {
    // The APP_ENV environment variable is now "production".
    assertEquals(Deno.env.get("APP_ENV"), "production");

    // The PASSWORD environment variable is now "qwerty".
    assertEquals(Deno.env.get("PASSWORD"), "qwerty");

    // Environment variables can be changed.
    Deno.env.set("PASSWORD", "123456");
    assertEquals(Deno.env.get("PASSWORD"), "123456");

    // New environment variables can be created.
    Deno.env.set("EXAMPLE", "example");
    assertEquals(Deno.env.get("EXAMPLE"), "example");
  } finally {
    environment.end();
  }

  // Environment variables are back to their original values.
  assertEquals(Deno.env.get("APP_ENV"), "test");
  assertEquals(Deno.env.get("PASSWORD"), "hunter2");
  assertEquals(Deno.env.get("EXAMPLE"), undefined);
});

it(startEnvironmentTests, "is disposable", () => {
  // Environment variables before simulating the environment
  assertEquals(Deno.env.get("APP_ENV"), "test");
  assertEquals(Deno.env.get("PASSWORD"), "hunter2");
  assertEquals(Deno.env.get("EXAMPLE"), undefined);

  // This function simulates a new production environment until the function returns.
  function test() {
    // Simulate a new production environment based on the current environment.
    using _environment = startEnvironment("production", { PASSWORD: "qwerty" });

    // The APP_ENV environment variable is now "production".
    assertEquals(Deno.env.get("APP_ENV"), "production");

    // The PASSWORD environment variable is now "qwerty".
    assertEquals(Deno.env.get("PASSWORD"), "qwerty");

    // Environment variables can be changed.
    Deno.env.set("PASSWORD", "123456");
    assertEquals(Deno.env.get("PASSWORD"), "123456");

    // New environment variables can be created.
    Deno.env.set("EXAMPLE", "example");
    assertEquals(Deno.env.get("EXAMPLE"), "example");
  }
  // Invoking the test function will simulate the environment and undo any changes made to it when the function returns.
  test();

  // Environment variables are back to their original values.
  assertEquals(Deno.env.get("APP_ENV"), "test");
  assertEquals(Deno.env.get("PASSWORD"), "hunter2");
  assertEquals(Deno.env.get("EXAMPLE"), undefined);
});

const omitEnvironmentKeysTests = describe({
  name: "omitEnvironmentKeys",
  beforeAll: () => {
    Deno.env.set("PASSWORD", "hunter2");
  },
  afterAll: () => {
    Deno.env.delete("PASSWORD");
  },
});

it(omitEnvironmentKeysTests, "omits specified environment keys", () => {
  // Environment variables before simulating the environment.
  assertEquals(Deno.env.get("APP_ENV"), "test");
  assertEquals(Deno.env.get("PASSWORD"), "hunter2");
  assertEquals(Deno.env.get("EXAMPLE"), undefined);

  // Simulate a new environment based on the current environment without the "PASSWORD" environment variable.
  const environment = omitEnvironmentKeys(["PASSWORD"]);
  try {
    // Unspecified variables will still the same as before the simulation started.
    assertEquals(Deno.env.get("APP_ENV"), "test");

    // The PASSWORD environment variable is now undefined.
    assertEquals(Deno.env.get("PASSWORD"), undefined);

    // Environment variables can be changed.
    Deno.env.set("APP_ENV", "production");
    assertEquals(Deno.env.get("APP_ENV"), "production");

    // New environment variables can be created.
    Deno.env.set("EXAMPLE", "example");
    assertEquals(Deno.env.get("EXAMPLE"), "example");
  } finally {
    // End the simulation.
    environment.end();
  }

  // Environment variables are back to their original values.
  assertEquals(Deno.env.get("APP_ENV"), "test");
  assertEquals(Deno.env.get("PASSWORD"), "hunter2");
  assertEquals(Deno.env.get("EXAMPLE"), undefined);
});

it(omitEnvironmentKeysTests, "is disposable", () => {
  // Environment variables before simulating the environment.
  assertEquals(Deno.env.get("APP_ENV"), "test");
  assertEquals(Deno.env.get("PASSWORD"), "hunter2");
  assertEquals(Deno.env.get("EXAMPLE"), undefined);

  // This function simulates a new environment without the "PASSWORD" environment variable until the function returns.
  function test() {
    // Simulate a new production environment based on the current environment.
    using _environment = omitEnvironmentKeys(["PASSWORD"]);

    // Unspecified variables will still the same as before the simulation started.
    assertEquals(Deno.env.get("APP_ENV"), "test");

    // The PASSWORD environment variable is now undefined.
    assertEquals(Deno.env.get("PASSWORD"), undefined);

    // Environment variables can be changed.
    Deno.env.set("APP_ENV", "production");
    assertEquals(Deno.env.get("APP_ENV"), "production");

    // New environment variables can be created.
    Deno.env.set("EXAMPLE", "example");
    assertEquals(Deno.env.get("EXAMPLE"), "example");
  }
  // Invoking the test function will simulate the environment and undo any changes made to it when the function returns.
  test();

  // Environment variables are back to their original values.
  assertEquals(Deno.env.get("APP_ENV"), "test");
  assertEquals(Deno.env.get("PASSWORD"), "hunter2");
  assertEquals(Deno.env.get("EXAMPLE"), undefined);
});
