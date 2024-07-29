/**
 * This module provides a function for starting a development server that watches for changes in the file system.
 * It will automatically rebuild the application and restart the server when changes are detected.
 * The server will also notify any active browser sessions to reload the page once the new build is ready.
 *
 * If the default configuration settings work for building your application, you can run this script directly.
 * To call it directly, add the following to your deno config file's tasks section:
 * ```jsonc
 * "tasks": {
      // Builds and runs the application in development mode, with hot reloading.
 *    "dev": "export APP_ENV=development NODE_ENV=development && deno run -A --config=deno.jsonc jsr:@udibo/react-app@0.21/dev",
 * }
 * ```
 *
 * Note: The `NODE_ENV` environment variable is set because some libraries like react use it to determine the environment.
 * Calling it directly also requires you to specify the config file to use along with using a jsr specifier.
 *
 * If the default configuration settings are insufficient for your application, you can create a custom dev script like shown below:
 * ```ts
 * import { startDev } from "@udibo/react-app/dev";
 * import { logFormatter } from "@udibo/react-app";
 * import * as log from "@std/log";
 *
 * // Import the build options from the build script
 * import { buildOptions } from "./build.ts";
 *
 * // You can enable dev script logging here or in a separate file that you import into this file.
 * const level = isDevelopment() ? "DEBUG" : "INFO";
 * log.setup({
 *   handlers: {
 *     default: new log.ConsoleHandler(level, {
 *       formatter: logFormatter,
 *     }),
 *   },
 *   loggers: { "react-app": { level, handlers: ["default"] } },
 * });
 *
 * startDev({
 *   buildOptions,
 *   // Add your own options here
 * });
 * ```
 *
 * Then update your deno config file's tasks section to use your dev script:
 * ```jsonc
 * "tasks": {
      // Builds and runs the application in development mode, with hot reloading.
 *    "dev": "export APP_ENV=development NODE_ENV=development && deno run -A ./dev.ts",
 * }
 * ```
 *
 * @module
 */

import * as path from "@std/path";
import { debounce } from "@std/async/debounce";
import * as log from "@std/log";
import {
  Application,
  Router,
  ServerSentEvent,
  type ServerSentEventTarget,
} from "@oak/oak";

import { isDevelopment, isTest } from "./env.ts";
import { getLogger } from "./log.ts";
import { build, getBuildOptions, rebuild } from "./build.ts";
import type { BuildOptions } from "./build.ts";
import { logFormatter } from "./mod.tsx";

const sessions = new Map<number, ServerSentEventTarget>();
let nextSessionId = 0;

function createDevApp() {
  const app = new Application();
  const router = new Router()
    .get("/live-reload", async (context) => {
      context.response.headers.set(
        "Access-Control-Allow-Origin",
        `*`,
      );
      const target = await context.sendEvents({ keepAlive: true });

      const sessionId = nextSessionId++;
      target.addEventListener("close", () => {
        sessions.delete(sessionId);
      });
      target.addEventListener("error", (event) => {
        if (sessions.has(sessionId)) {
          getLogger().error("Live reload: Error", event);
          console.log(event);
        }
      });
      sessions.set(sessionId, target);
      target.dispatchMessage("Waiting");
    })
    .get("/listening", ({ response }) => {
      response.status = 200;

      if (reload) {
        getLogger().info("Server restarted");
        reload = false;
        queueMicrotask(() => {
          for (const target of [...sessions.values()]) {
            target.dispatchEvent(new ServerSentEvent("reload", { data: null }));
          }
        });
      } else {
        getLogger().info("Server started");
      }
    });

  app.use(router.routes(), router.allowedMethods());

  app.addEventListener("error", ({ error }) => {
    console.error("Uncaught app error", error);
  });

  app.addEventListener("listen", ({ hostname, port, secure }) => {
    const origin = `${secure ? "https://" : "http://"}${hostname}`;
    getLogger().info(`Live reload listening on: ${origin}:${port}`);
  });

  return app;
}

let runProcess: Deno.ChildProcess | null = null;
function runDev(entryPoint: string) {
  const runCommand = new Deno.Command(Deno.execPath(), {
    args: ["run", "-A", entryPoint],
    stdin: "null",
  });
  runProcess = runCommand.spawn();
}

let buildInit = false;
let building = false;
let buildAgain = false;
let buildAgainFor = "";
let restarting = false;
let restartAgain = false;
let reload = false;

async function buildDev(
  entryPoint: string,
  buildOptions?: BuildOptions,
  changedPath?: string,
) {
  if (building) {
    buildAgain = true;
    buildAgainFor = changedPath ?? "";
  } else {
    buildAgain = false;
    buildAgainFor = "";
    restartAgain = false;
    reload = false;
    building = true;

    if (changedPath) {
      getLogger().info(`Detected change: ${changedPath}`);
    }

    let success = false;
    try {
      if (!buildInit) {
        buildInit = true;
        success = await build(buildOptions);
      } else {
        success = await rebuild();
      }
    } finally {
      building = false;
      if (buildAgain) {
        await buildDev(entryPoint, buildOptions, buildAgainFor);
      } else if (success && runProcess) {
        await restartApp(entryPoint);
      }
    }
  }
}

async function restartApp(entryPoint: string) {
  if (restarting) {
    restartAgain = true;
  } else if (runProcess) {
    restartAgain = false;
    reload = false;
    restarting = true;
    getLogger().info("Restarting app");
    queueMicrotask(() => {
      try {
        runProcess!.kill();
      } catch {
        // Ignore error
      }
    });
    try {
      await runProcess.status;
    } catch {
      // Ignore error
    }
    queueMicrotask(async () => {
      runDev(entryPoint);
      restarting = false;
      if (restartAgain) {
        await restartApp(entryPoint);
      } else if (!building) {
        reload = true;
      }
    });
  }
}

/** The options for starting the dev script. */
export interface DevOptions {
  /**
   * Used to identify and ignore build artifacts that should be ignored by the live reload script.
   * This should be used to ignore files that are generated by the build script.
   * If a build artifact is not ignored, the live reload script will trigger a rebuild and restart of the app repeatedly.
   * The _main.ts and _main.tsx files in your routes directory are automatically ignored.
   */
  isBuildArtifact?: (pathname: string) => boolean;
  /** The port for the dev script's live reload server. Defaults to 9001. */
  devPort?: number;
  /** The entry point for the application server. Defaults to "./main.ts". */
  entryPoint?: string;
  /** The options used for building the application. */
  buildOptions?: BuildOptions;
}

/**
 * Starts a file watcher for triggering new builds to be generated.
 * When changes are made, the app will be re-built and the app will be restarted.
 * Any active browser sessions will be reloaded once the new build is ready and the app has been restarted.
 *
 * This function can be used in a dev script like the following:
 * ```ts
 * import { startDev } from "@udibo/react-app/dev";
 * import * as log from "@std/log";
 *
 * // Import the build options from the build script
 * import { buildOptions } from "./build.ts";
 *
 * // You can enable dev script logging here or in a separate file that you import into this file.
 * log.setup({
 *  loggers: { "react-app": { level: "INFO", handlers: ["default"] } },
 * });
 *
 * startDev({
 *   buildOptions,
 *   // Add your own options here
 * });
 * ```
 */
export function startDev(options: DevOptions = {}): void {
  const devPort = options.devPort ?? 9001;
  const entryPoint = options.entryPoint ?? "./main.ts";
  const {
    isBuildArtifact: isCustomBuildArtifact,
  } = options;
  const buildOptions = getBuildOptions(options.buildOptions);

  const { workingDirectory, routesUrl, publicUrl } = buildOptions;
  const buildDir = path.resolve(
    publicUrl,
    `./${isTest() ? "test-" : ""}build`,
  );
  const artifacts = new Set();
  artifacts.add(path.resolve(routesUrl, "./_main.tsx"));
  artifacts.add(path.resolve(routesUrl, "./_main.ts"));

  function isBuildArtifact(pathname: string) {
    return pathname.startsWith(buildDir) || artifacts.has(pathname);
  }

  const shouldBuild = isCustomBuildArtifact
    ? ((pathname: string) =>
      !isBuildArtifact(pathname) && !isCustomBuildArtifact(pathname))
    : ((pathname: string) => !isBuildArtifact(pathname));

  queueMicrotask(async () => {
    await buildDev(entryPoint!, buildOptions);
    getLogger().info("Starting app");
    queueMicrotask(() => runDev(entryPoint!));
  });

  async function watcher() {
    getLogger().info(`Watching ${workingDirectory}`);
    const build = debounce(
      (changedPath: string) =>
        queueMicrotask(() => buildDev(entryPoint!, buildOptions, changedPath)),
      20,
    );
    for await (const event of Deno.watchFs(Deno.cwd())) {
      if (event.kind === "modify") {
        const path = event.paths.find(shouldBuild);
        if (path) build(path);
      }
    }
  }
  queueMicrotask(watcher);

  queueMicrotask(() => {
    const app = createDevApp();
    app.listen({ port: devPort });
  });
}

if (import.meta.main) {
  const level = isDevelopment() ? "DEBUG" : "INFO";
  log.setup({
    handlers: {
      default: new log.ConsoleHandler(level, {
        formatter: logFormatter,
      }),
    },
    loggers: { "react-app": { level, handlers: ["default"] } },
  });

  startDev();
}
