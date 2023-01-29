import * as path from "std/path/mod.ts";
import { debounce } from "std/async/debounce.ts";
import {
  Application,
  Router,
  ServerSentEvent,
  ServerSentEventTarget,
} from "x/oak/mod.ts";
import { getEnv, isTest } from "./env.ts";

const sessions = new Map<number, ServerSentEventTarget>();
let nextSessionId = 0;

function createDevApp(appPort = 9000) {
  const app = new Application();
  const router = new Router()
    .get("/live-reload", (context) => {
      const target = context.sendEvents({
        headers: new Headers({
          "Access-Control-Allow-Origin": `http://localhost:${appPort}`,
        }),
        keepAlive: true,
      });

      const sessionId = nextSessionId++;
      target.addEventListener("close", () => {
        sessions.delete(sessionId);
      });
      target.addEventListener("error", (event) => {
        console.log("Live reload: Error", event);
      });
      sessions.set(sessionId, target);
      target.dispatchMessage("Waiting");
    })
    .get("/listening", ({ response }) => {
      response.status = 200;

      if (reload) {
        console.log("Server restarted");
        reload = false;
        queueMicrotask(() => {
          for (const target of [...sessions.values()]) {
            target.dispatchEvent(new ServerSentEvent("reload", null));
          }
        });
      } else {
        console.log("Server started");
      }
    });

  app.use(router.routes(), router.allowedMethods());

  app.addEventListener("error", ({ error }) => {
    console.error("Uncaught app error", error);
  });

  app.addEventListener("listen", ({ hostname, port, secure }) => {
    const origin = `${secure ? "https://" : "http://"}${hostname}`;
    console.log(`Live reload listening on: ${origin}:${port}`);
  });

  return app;
}

let runProcess: Deno.Process | null = null;
function runDev() {
  runProcess = Deno.run({
    cmd: ["deno", "run", "-A", "./main.ts"],
    env: {
      APP_ENV: "development",
    },
  });
}

let building = false;
let buildAgain = false;
let restarting = false;
let restartAgain = false;
let reload = false;

async function buildDev() {
  if (building) {
    buildAgain = true;
  } else {
    buildAgain = false;
    restartAgain = false;
    reload = false;
    building = true;

    try {
      await Deno.remove(buildDir, { recursive: true });
    } catch {
      // Ignore error
    }

    let status: Deno.ProcessStatus | null = null;
    try {
      const buildProcess = Deno.run({
        cmd: ["deno", "task", "build"],
        env: {
          APP_ENV: "development",
        },
        stdin: "null",
      });
      status = await buildProcess.status();
    } finally {
      building = false;
      if (buildAgain) {
        await buildDev();
      } else if (status?.success && runProcess) {
        await restartApp();
      }
    }
  }
}

async function restartApp() {
  if (restarting) {
    restartAgain = true;
  } else if (runProcess) {
    restartAgain = false;
    reload = false;
    restarting = true;
    console.log("Restarting app");
    queueMicrotask(() => {
      try {
        runProcess!.kill();
        runProcess!.close();
      } catch {
        // Ignore error
      }
    });
    try {
      await runProcess.status();
    } catch {
      // Ignore error
    }
    queueMicrotask(async () => {
      runDev();
      restarting = false;
      if (restartAgain) {
        await restartApp();
      } else if (!building) {
        reload = true;
      }
    });
  }
}

const cwd = Deno.cwd();
const buildDir = path.resolve(
  cwd,
  `./public/${isTest() ? "test-" : ""}build`,
);
const artifacts = new Set();
artifacts.add(path.resolve(cwd, "./routes/_main.tsx"));
artifacts.add(path.resolve(cwd, "./routes/_main.ts"));

function isBuildArtifact(pathname: string) {
  return pathname.startsWith(buildDir) || artifacts.has(pathname);
}

export interface DevOptions {
  /**
   * Used to identify and ignore additional build artifacts created in your preBuild and postBuild functions.
   */
  isCustomBuildArtifact?: (pathname: string) => boolean;
  /** The port that the application uses. */
  appPort?: number;
  /** The port for the dev script's live reload server. */
  devPort?: number;
}

/**
 * Starts a file watcher for triggering new builds to be generated.
 * When changes are made, the app will be re-built and the app will be restarted.
 * Any active browser sessions will be reloaded once the new build is ready and the app has been restarted.
 */
export function startDev({
  isCustomBuildArtifact,
  appPort,
  devPort,
}: DevOptions = {}) {
  const shouldBuild = isCustomBuildArtifact
    ? ((pathname: string) =>
      !isBuildArtifact(pathname) && !isCustomBuildArtifact(pathname))
    : ((pathname: string) => !isBuildArtifact(pathname));

  queueMicrotask(async () => {
    await buildDev();
    console.log("Starting app");
    queueMicrotask(runDev);
  });

  async function watcher() {
    console.log(`Watching ${cwd}`);
    const build = debounce(
      () => queueMicrotask(() => buildDev()),
      20,
    );
    for await (const event of Deno.watchFs(Deno.cwd())) {
      if (event.kind === "modify" && event.paths.find(shouldBuild)) {
        build();
      }
    }
  }
  queueMicrotask(watcher);

  queueMicrotask(() => {
    const app = createDevApp(appPort);
    app.listen({ port: devPort ?? 9002 });
  });
}

if (import.meta.main) {
  const options: DevOptions = {};
  const appPort = +(getEnv("APP_PORT") ?? "");
  if (appPort && !isNaN(appPort)) {
    options.appPort = appPort;
  }
  const devPort = +(getEnv("DEV_PORT") ?? "");
  if (devPort && !isNaN(devPort)) {
    options.devPort = devPort;
  }
  startDev(options);
}
