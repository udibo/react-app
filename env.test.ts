import { assertEquals, assertStrictEquals } from "@std/assert";
import { describe, it } from "@std/testing/bdd";

import {
  isBrowser,
  isDevelopment,
  isProduction,
  isServer,
  isTest,
} from "./env.ts";
import { startBrowser, startEnvironment } from "./test-utils.ts";

const isBrowserTests = describe("isBrowser");

it(isBrowserTests, "false in server", () => {
  assertEquals(isBrowser(), false);
});

it(isBrowserTests, "true in browser", () => {
  using _browser = startBrowser();
  assertEquals(isBrowser(), true);
});

const isServerTests = describe("isServer");

it(isServerTests, "true in server", () => {
  assertEquals(isServer(), true);
});

it(isServerTests, "false in browser", () => {
  using _browser = startBrowser();
  assertEquals(isServer(), false);
});

const isTestTests = describe("isTest");

it(isTestTests, "true in test", () => {
  assertStrictEquals(isTest(), true);
});

it(isTestTests, "false in other environments", () => {
  function checkEnvironment(appEnvironment: string) {
    using _environment = startEnvironment(appEnvironment);
    assertStrictEquals(isTest(), false);
  }
  checkEnvironment("development");
  checkEnvironment("production");
  checkEnvironment("fake");
});

const isDevelopmentTests = describe("isDevelopment");

it(isDevelopmentTests, "true in development", () => {
  using _environment = startEnvironment("development");
  assertStrictEquals(isDevelopment(), true);
});

it(isDevelopmentTests, "false in other environments", () => {
  assertStrictEquals(isDevelopment(), false);
  function checkEnvironment(appEnvironment: string) {
    using _environment = startEnvironment(appEnvironment);
    assertStrictEquals(isDevelopment(), false);
  }
  checkEnvironment("production");
  checkEnvironment("fake");
});

const isProductionTests = describe("isProduction");

it(isProductionTests, "true in production", () => {
  using _environment = startEnvironment("production");
  assertStrictEquals(isProduction(), true);
});

it(isProductionTests, "false in other environments", () => {
  assertStrictEquals(isProduction(), false);
  function checkEnvironment(appEnvironment: string) {
    using _environment = startEnvironment(appEnvironment);
    assertStrictEquals(isProduction(), false);
  }
  checkEnvironment("development");
  checkEnvironment("fake");
});
