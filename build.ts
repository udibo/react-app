/**
 * This module provides functions for building your application.
 * It is meant to be used in a build script that you create for your application.
 *
 * If the default configuration settings work for building your application, you can run this script directly.
 * To call it directly, add the following to your deno config file's tasks section:
 * ```jsonc
 * "tasks": {
 *   // Builds the application.
 *   "build": "deno run -A --config=deno.jsonc jsr:@udibo/react-app@0.22/build",
 *   // Builds the application in development mode.
 *   "build-dev": "export APP_ENV=development NODE_ENV=development && deno task build",
 *   // Builds the application in production mode.
 *   "build-prod": "export APP_ENV=production NODE_ENV=production && deno task build",
 * }
 * ```
 *
 * Note: The `NODE_ENV` environment variable is set because some libraries like react use it to determine the environment.
 * Calling it directly also requires you to specify the config file to use along with using a jsr specifier.
 *
 * If the default configuration settings are insufficient for your application, you can create a build script like shown below:
 * ```ts
 * import { buildOnce, type BuildOptions } from "@udibo/react-app/build";
 * import * as log from "@std/log";
 *
 * // export the buildOptions so that you can use them in your dev script.
 * // You will need a dev script if you have non default build options.
 * export const buildOptions: BuildOptions = {
 *   // Add your own build options here if the defaults are not sufficient.
 * };
 *
 * if (import.meta.main) {
 *   // You can enable build script logging here or in a separate file that you import into this file.
 *   log.setup({
 *     loggers: { "react-app": { level: "INFO", handlers: ["default"] } },
 *   });
 *   buildOnce(buildOptions);
 * }
 * ```
 *
 * Then update your deno config file's tasks section to use your build script:
 * ```jsonc
 * "tasks": {
 *   // Builds the application.
 *   "build": "deno run -A ./build.ts",
 *   // Builds the application in development mode.
 *   "build-dev": "export APP_ENV=development NODE_ENV=development && deno task build",
 *   // Builds the application in production mode.
 *   "build-prod": "export APP_ENV=production NODE_ENV=production && deno task build",
 * }
 * ```
 *
 * @module
 */
import { walk } from "@std/fs/walk";
import { ensureDir } from "@std/fs/ensure-dir";
import { exists } from "@std/fs/exists";
import * as log from "@std/log";
import * as path from "@std/path/posix";
import * as esbuild from "esbuild";
import { denoPlugins } from "@luca/esbuild-deno-loader";

import { isDevelopment, isProduction, isTest, logFormatter } from "./mod.tsx";
import { ROUTE_PARAM, ROUTE_WILDCARD, routePathFromName } from "./server.tsx";
import { getLogger } from "./log.ts";

interface Route {
  name: string;
  parent?: Route;
  react?: boolean;
  file?: {
    react?: string;
    oak?: string;
  };
  main?: {
    react?: string;
    oak?: string;
  };
  index?: {
    react?: string;
    oak?: string;
  };
  children?: Record<string, Route>;
}

const TEST_PATH = /(\.|_)test(\.(?:js|jsx|ts|tsx))$/;
const IGNORE_PATH = /(\/|\\)_[^\/\\]*(\.(?:js|jsx|ts|tsx))$/;
const ROUTE_PATH = /(\.(?:js|jsx|ts|tsx))$/;
const REACT_EXT = /(\.(?:jsx|tsx))$/;
const ERROR_FALLBACK_EXPORT = /export\s+const\s+ErrorFallback\s*=/g;

function addFileToDir(route: Route, name: string, ext: string) {
  const isReactFile = REACT_EXT.test(ext);
  if (name === "main" || name === "index") {
    if (!route[name]) {
      route[name] = {};
    }
    if (isReactFile) {
      route[name]!.react = `${name}${ext}`;
    } else {
      route[name]!.oak = `${name}${ext}`;
    }
  } else {
    if (!route.children) route.children = {};
    if (!route.children[name]) {
      route.children[name] = { name, parent: route, file: {} };
    }
    const childRoute = route.children[name];

    if (!childRoute.file) childRoute.file = {};
    if (isReactFile) {
      childRoute.react = true;
      childRoute.file.react = `${name}${ext}`;
    } else {
      childRoute.file.oak = `${name}${ext}`;
    }
  }

  if (isReactFile) {
    let currentRoute: Route | undefined = route;
    while (currentRoute && !currentRoute.react) {
      currentRoute.react = true;
      currentRoute = route.parent as Route;
    }
  }
}

async function generateRoutes(routesUrl: string): Promise<Route> {
  const rootRoute = { name: "", children: {} } as Route;

  for await (
    const entry of walk(routesUrl, {
      includeDirs: false,
      match: [ROUTE_PATH],
      skip: [TEST_PATH, IGNORE_PATH],
    })
  ) {
    const parsedPath = path.parse(entry.path);
    const { name, ext, dir } = parsedPath;
    const relativePath = path.relative(routesUrl, dir.replaceAll("\\", "/"));
    const layers = relativePath.length ? relativePath.split("/") : [];

    let parentRoute = rootRoute;
    for (const layer of layers) {
      if (!parentRoute.children) parentRoute.children = {};
      if (!parentRoute.children[layer]) {
        parentRoute.children[layer] = {
          name: layer,
          children: {},
          parent: parentRoute,
        };
      }
      parentRoute = parentRoute.children[layer];
    }

    addFileToDir(parentRoute, name, ext);
  }

  return rootRoute;
}

function lazyImportLine(routeId: number, routePath: string, filePath: string) {
  return `const $${routeId} = lazy(${
    routePath ? `"/${routePath}", ` : ""
  }() => import("./${filePath}"));`;
}

async function routeFileData(
  routesUrl: string,
  routeId: number,
  relativePath: string,
  route: Route,
) {
  const importLines: string[] = [];
  const name = routePathFromName(route.name);
  let routeText = `{ path: ${JSON.stringify(name)}`;

  const { file, main, index, children } = route;
  if (file?.react) {
    importLines.push(
      lazyImportLine(
        routeId,
        relativePath,
        path.join(relativePath, routeId === 0 ? "" : "../", file.react),
      ),
    );
    routeText += `, element: <$${routeId} /> }`;
    routeId++;
  } else {
    if (main?.react) {
      if (relativePath) {
        importLines.push(
          lazyImportLine(
            routeId,
            relativePath,
            path.join(relativePath, main.react),
          ),
        );
      } else {
        const mainPath = path.join(relativePath, main.react);
        const mainMod = await Deno.readTextFile(path.join(routesUrl, mainPath));
        importLines.push(`import * as $${routeId++} from "./${mainPath}";`);
        if (ERROR_FALLBACK_EXPORT.test(mainMod)) {
          importLines.push(
            `const $${routeId} = withErrorBoundary($${routeId - 1}.default, {`,
            `  FallbackComponent: $${routeId - 1}.ErrorFallback,`,
            `  boundary: $${routeId - 1}.boundary,`,
            `});`,
          );
        } else {
          importLines.push(`const $${routeId} = $${routeId - 1}.default;`);
        }
      }
      routeText += `, element: <$${routeId} />`;
      routeId++;
    } else if (!relativePath) {
      importLines.push(
        `import { Outlet } from "react-router-dom";`,
        `const $${routeId} = withErrorBoundary(() => <Outlet />, { FallbackComponent: DefaultErrorFallback });`,
      );
      routeText += `, element: <$${routeId} />`;
      routeId++;
    }

    const childRouteTexts: string[] = [];
    if (index?.react) {
      importLines.push(
        lazyImportLine(
          routeId,
          path.join(relativePath, "index"),
          path.join(relativePath, index.react),
        ),
      );
      childRouteTexts.push(`{ index: true, element: <$${routeId} /> }`);
      routeId++;
    }

    let notFoundRoute: Route | undefined = undefined;
    for (const childRoute of Object.values(children ?? {})) {
      if (!childRoute.react) continue;
      if (childRoute.name === "[...]") {
        notFoundRoute = childRoute;
        continue;
      }

      const {
        importLines: childImportLines,
        routeText: childRouteText,
        nextRouteId,
      } = await routeFileData(
        routesUrl,
        routeId,
        path.join(relativePath, childRoute.name),
        childRoute,
      );
      importLines.push(...childImportLines);
      childRouteTexts.push(childRouteText);
      routeId = nextRouteId;
    }

    if (notFoundRoute) {
      const {
        importLines: childImportLines,
        routeText: childRouteText,
        nextRouteId,
      } = await routeFileData(
        routesUrl,
        routeId,
        path.join(relativePath, notFoundRoute.name),
        notFoundRoute,
      );
      importLines.push(...childImportLines);
      childRouteTexts.push(childRouteText);
      routeId = nextRouteId;
    } else {
      childRouteTexts.push(`{ path: "*", element: <NotFound /> }`);
    }

    if (childRouteTexts.length) {
      routeText += `, children: [\n${childRouteTexts.join(",\n")}\n]`;
    }
    routeText += "}";
  }

  return {
    importLines,
    routeText,
    nextRouteId: routeId,
  };
}

function routeImportLines(routeId: number, relativePath: string) {
  return [
    `import "./${relativePath}";`,
    `import * as $${routeId} from "./${relativePath}";`,
  ];
}

function routerImportLine(routeId: number, relativePath: string) {
  return `import $${routeId} from "./${relativePath}";`;
}

function routerFileData(
  routeId: number,
  relativePath: string,
  route: Route,
) {
  const { name, file, main, index, react, children } = route;
  const importLines: string[] = [];

  let routerText = `{ name: ${JSON.stringify(name)}`;
  if (react) routerText += `, react: true`;

  if (file) {
    routerText += ", file: {";
    const fileText: string[] = [];

    if (file.react) {
      importLines.push(
        ...routeImportLines(
          routeId,
          path.join(relativePath, routeId > 0 ? "../" : "", file.react),
        ),
      );
      fileText.push(`react:$${routeId}`);
      routeId++;
    }

    if (file.oak) {
      importLines.push(
        routerImportLine(
          routeId,
          path.join(relativePath, routeId > 0 ? "../" : "", file.oak),
        ),
      );
      fileText.push(`oak:$${routeId}`);
      routeId++;
    }

    routerText += fileText.join(", ") + `}`;
  } else {
    if (main) {
      routerText += ", main: {";
      const fileText: string[] = [];

      if (main.react) {
        importLines.push(
          ...routeImportLines(
            routeId,
            path.join(relativePath, main.react),
          ),
        );
        fileText.push(`react:$${routeId}`);
        routeId++;
      }

      if (main.oak) {
        importLines.push(
          routerImportLine(
            routeId,
            path.join(relativePath, main.oak),
          ),
        );
        fileText.push(`oak:$${routeId}`);
        routeId++;
      }

      routerText += fileText.join(", ") + `}`;
    }

    if (index) {
      routerText += ", index: {";
      const fileText: string[] = [];

      if (index.react) {
        importLines.push(
          ...routeImportLines(
            routeId,
            path.join(relativePath, index.react),
          ),
        );
        fileText.push(`react:$${routeId}`);
        routeId++;
      }

      if (index.oak) {
        importLines.push(
          routerImportLine(
            routeId,
            path.join(relativePath, index.oak),
          ),
        );
        fileText.push(`oak:$${routeId}`);
        routeId++;
      }

      routerText += fileText.join(", ") + `}`;
    }

    if (children) {
      routerText += ", children: {";
      const childText: string[] = [];
      let paramText: string | undefined = undefined;
      let wildcardText: string | undefined = undefined;
      for (const [name, childRoute] of Object.entries(children)) {
        const {
          importLines: childImportLines,
          routerText: childRouterText,
          nextRouteId,
        } = routerFileData(
          routeId,
          path.join(relativePath, name),
          childRoute,
        );
        importLines.push(...childImportLines);

        const text = `${JSON.stringify(name)}: ${childRouterText}`;
        if (ROUTE_WILDCARD.test(name)) {
          wildcardText = text;
        } else if (ROUTE_PARAM.test(name)) {
          if (paramText) {
            throw new Error("Directory cannot have multiple parameter routes");
          } else {
            paramText = text;
          }
        } else {
          childText.push(text);
        }

        routeId = nextRouteId;
      }
      if (paramText) childText.push(paramText);
      if (wildcardText) childText.push(wildcardText);

      routerText += childText.join(", ") + "}";
    }
  }
  routerText += "}";

  return {
    importLines,
    routerText,
    nextRouteId: routeId,
  };
}

const fmtCommand = new Deno.Command(Deno.execPath(), {
  args: ["fmt", "-"],
  stdin: "piped",
  stdout: "piped",
});
async function writeRoutes(path: string, text: string) {
  const fmt = fmtCommand.spawn();
  const fmtWriter = fmt.stdin.getWriter();
  const encoder = new TextEncoder();
  await fmtWriter.write(encoder.encode(text));
  await fmtWriter.close();
  const { success, code } = await fmt.status;
  if (success) {
    await Deno.writeFile(path, fmt.stdout);
  } else {
    getLogger().error("fmt routes failed", { path, code });
  }
}

async function updateRoutes(routesUrl: string, rootRoute: Route) {
  if (rootRoute.react) {
    const lines = [
      `import { DefaultErrorFallback, isBrowser, NotFound, withErrorBoundary } from "@udibo/react-app";`,
      `import { hydrate, lazy } from "@udibo/react-app/client";`,
      `import type { RouteObject } from "react-router-dom";`,
      "",
    ];
    const { importLines, routeText } = await routeFileData(
      routesUrl,
      0,
      "",
      rootRoute,
    );
    lines.push(
      ...importLines,
      "",
      `const route = ${routeText} as RouteObject;`,
      "export default route;",
      "",
      "if (isBrowser()) {",
      "  hydrate({ route });",
      "}",
      "",
    );

    await writeRoutes(path.join(routesUrl, "_main.tsx"), lines.join("\n"));
  }

  const lines = [
    `import { generateRouter } from "@udibo/react-app/server";`,
    "",
  ];
  const { importLines, routerText } = routerFileData(0, "", rootRoute);
  lines.push(
    ...importLines,
    "",
    `export default generateRouter(${routerText});`,
  );

  await writeRoutes(path.join(routesUrl, "_main.ts"), lines.join("\n"));
}

async function buildRoutes(routesUrl: string) {
  const appRoute = await generateRoutes(routesUrl);
  await updateRoutes(routesUrl, appRoute);
}

/** The options used for building an application. */
export interface BuildOptions {
  /** The absolute path to the working directory for your application. Defaults to your current working directory. */
  workingDirectory?: string;
  /**
   * Url for the routes directory that your app uses.
   * The routes directory will have 2 files generated in them.
   * - `_main.ts`: Contains the oak router for the routes.
   * - `_main.tsx`: Contains the react router routes for controlling navigation in the app.
   * Your server entrypoint should import and use both of the generated files for each routes directory.
   * Your client entry point should only import the react router routes.
   * Defaults to the routes directory in your working directory.
   */
  routesUrl?: string;
  /**
   * The application will serve all files from this directory.
   * The build for your client entry point will be stored in public/build.
   * Test builds will be stored in public/test-build.
   * Defaults to the public directory in your working directory.
   */
  publicUrl?: string;
  /** File url for your deno.json or deno.jsonc file. Defaults to checking your working directory for those files. */
  configPath?: string;
  /**
   * ESBuild plugins to use when building your application.
   * These plugins will be added after the deno plugin.
   */
  esbuildPlugins?: esbuild.Plugin[];
}

let context: esbuild.BuildContext | undefined = undefined;
let routesUrl: string | undefined = undefined;

/**
 * Extends the user specified build options with the default workingDirectory, routesUrl, and publicUrl if they were not specified.
 *
 * @param options - The options to use when building the application.
 * @returns The build options with the default workingDirectory, routesUrl, and publicUrl if they were not specified.
 */
export function getBuildOptions(
  options: BuildOptions = {},
): BuildOptions & {
  workingDirectory: string;
  routesUrl: string;
  publicUrl: string;
} {
  const workingDirectory = options.workingDirectory ?? Deno.cwd();
  const routesUrl = options.routesUrl ??
    path.join(workingDirectory, "routes");
  const publicUrl = options.publicUrl ??
    path.join(workingDirectory, "public");
  return {
    ...options,
    workingDirectory,
    routesUrl,
    publicUrl,
  };
}

function postBuild(success: boolean, error: Error | null) {
  performance.mark("buildEnd");
  const duration =
    performance.measure("build", "buildStart", "buildEnd").duration;
  const routesDuration =
    performance.measure("esbuild", "routesStart", "esbuildStart").duration;
  const esbuildDuration =
    performance.measure("esbuild", "esbuildStart", "buildEnd").duration;
  const message = `Build ${success ? "completed" : "failed"} in ${
    Math.round(duration)
  } ms`;
  const data = { duration, esbuildDuration, routesDuration };
  if (success) {
    getLogger().info(message, data);
  } else {
    getLogger().error(message, error, data);
  }
}

/**
 * Builds the application and all of it's routes.
 *
 * If the build is successful, this function will return true.
 *
 * This function creates an esbuild context for the build and then triggers a build for the application.
 * If you want to trigger a rebuild after the initial build, you can use the rebuild function.
 * If you use this function directly, you should call the stop function when you are done building.
 *
 * @param options - The options to use when building the application.
 * @returns A promise that resolves to a boolean indicating whether the build was successful or not.
 */
export async function build(options: BuildOptions = {}): Promise<boolean> {
  getLogger().info("Building app");
  performance.mark("buildStart");
  let success = false;
  let error: Error | null = null;
  try {
    const { workingDirectory, routesUrl: _routesUrl, publicUrl } =
      getBuildOptions(options);
    routesUrl = _routesUrl;
    const entryPoint = path.join(routesUrl, "./_main.tsx");
    let configPath = options.configPath ??
      path.join(workingDirectory!, "deno.json");
    if (!options.configPath && !await exists(configPath)) {
      configPath = path.join(workingDirectory, "deno.jsonc");
    }
    if (!await exists(configPath)) {
      throw new Error("Could not find deno config file");
    }

    const outdir = path.join(
      publicUrl,
      `${isTest() ? "test-" : ""}build`,
    );
    await ensureDir(outdir);

    const buildOptions: esbuild.BuildOptions = isProduction()
      ? { minify: true }
      : {
        minifyIdentifiers: false,
        minifySyntax: true,
        minifyWhitespace: true,
        jsxDev: true,
        sourcemap: "linked",
      };

    performance.mark("routesStart");
    await buildRoutes(routesUrl);

    const esbuildPlugins = options.esbuildPlugins ?? [];
    if (context) {
      throw new Error("Build already in progress");
    }
    performance.mark("esbuildStart");
    context = await esbuild.context({
      plugins: [
        ...denoPlugins({ configPath }),
        ...esbuildPlugins,
      ],
      absWorkingDir: workingDirectory,
      entryPoints: [entryPoint],
      outdir,
      bundle: true,
      splitting: true,
      treeShaking: true,
      platform: "browser",
      format: "esm",
      jsx: "automatic",
      jsxImportSource: "react",
      ...buildOptions,
    });
    await context.rebuild();
    success = true;
  } catch (_error) {
    error = _error;
  } finally {
    postBuild(success, error);
  }

  return success;
}

/**
 * After a build has been run, you can use the rebuild function to trigger an update to that build.
 *
 * This is used internally by the dev script to trigger a rebuild when a file changes.
 */
export async function rebuild(): Promise<boolean> {
  if (!context || !routesUrl) {
    throw new Error("No build context available");
  }
  getLogger().info("Building app");
  performance.mark("buildStart");
  let success = false;
  let error: Error | null = null;
  try {
    performance.mark("routesStart");
    await buildRoutes(routesUrl);
    performance.mark("esbuildStart");
    await context.rebuild();
    success = true;
  } catch (_error) {
    error = _error;
  } finally {
    postBuild(success, error);
  }

  return success;
}

/** Stops esbuild from continuing to run. */
export async function stop() {
  if (context) {
    context = undefined;
    routesUrl = undefined;
    await esbuild.stop();
  }
}

/**
 * Builds the application and all of it's routes.
 * This function is intended to be used when generating a build on it's own.
 * It will build the application and then stop esbuild from running when it is done.
 *
 * This function can be used in a build script like the following:
 * ```ts
 * import { buildOnce, type BuildOptions } from "@udibo/react-app/build";
 * import { logFormatter } from "@udibo/react-app";
 * import * as log from "@std/log";
 *
 * export const buildOptions: BuildOptions = {
 *   // Add your own build options here if the defaults are not sufficient.
 * };
 *
 * if (import.meta.main) {
 *   // You can enable build script logging here or in a separate file that you import into this file.
 *   const level = isDevelopment() ? "DEBUG" : "INFO";
 *   log.setup({
 *     handlers: {
 *       default: new log.ConsoleHandler(level, {
 *         formatter: logFormatter,
 *       }),
 *     },
 *     loggers: { "react-app": { level, handlers: ["default"] } },
 *   });
 *
 *   buildOnce(buildOptions);
 * }
 * ```
 *
 * @param options - The options to use when building the application.
 */
export async function buildOnce(options: BuildOptions = {}): Promise<void> {
  const success = await build(options);
  await stop();
  if (!success) Deno.exit(1);
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

  buildOnce();
}
