/**
 * This module provides functions for building your React application with esbuild.
 * It handles route generation, bundling, and development/production builds.
 *
 * For basic applications, you can use the default configuration by adding these tasks to your deno.json:
 * ```json
 * "tasks": {
 *   "build": {
 *     "description": "Builds the application",
 *     "command": "deno run -A --config=deno.json --env-file=.env.production jsr:@udibo/react-app@0.25/build"
 *   },
    "run": {
      "description": "Runs the application in production mode. Requires the application to be built first.",
      "command": "deno run -A --env-file=.env.production ./main.ts"
    },
 * }
 * ```
 *
 * For more complex applications, create a custom build script:
 * ```ts
 * import { buildOnce, type BuildOptions } from "@udibo/react-app/build";
 * import * as log from "@std/log";
 *
 * const buildOptions: BuildOptions = {
 *   // Add your own build options here if the defaults are not sufficient.
 * };
 *
 * // Export buildOptions as default to reuse in your dev script
 * export default buildOptions;
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
 * Then update your deno.json tasks:
 * ```json
 * "tasks": {
 *   "build": {
 *     "description": "Builds the application",
 *     "command": "deno run -A --env-file=.env.production ./build.ts"
 *   },
    "run": {
      "description": "Runs the application in production mode. Requires the application to be built first.",
      "command": "deno run -A --env-file=.env.production ./main.ts"
    },
 * }
 * ```
 *
 * Note: The NODE_ENV environment variable is used by React and other libraries
 * to determine the build environment and optimize accordingly.
 *
 * @module
 */
import { walk } from "@std/fs/walk";
import { ensureDir } from "@std/fs/ensure-dir";
import { exists } from "@std/fs/exists";
import * as log from "@std/log";
import * as path from "@std/path";
import * as esbuild from "esbuild";
import {
  denoLoaderPlugin,
  denoResolverPlugin,
} from "@luca/esbuild-deno-loader";

import { isDevelopment, isProduction, isTest, logFormatter } from "./mod.tsx";
import { ROUTE_PARAM, ROUTE_WILDCARD, routePathFromName } from "./server.tsx";
import { getLogger } from "./log.ts";

export type esbuildPlugin = esbuild.Plugin;

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
    const entry of walk(path.resolve(routesUrl), {
      includeDirs: false,
      match: [ROUTE_PATH],
      skip: [TEST_PATH, IGNORE_PATH],
    })
  ) {
    const parsedPath = path.parse(entry.path);
    const { name, ext, dir } = parsedPath;
    const relativePath = path.relative(
      routesUrl,
      dir,
    );
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
    routePath ? `"/${routePath.replaceAll("\\", "/")}", ` : ""
  }() => import("./${filePath.replaceAll("\\", "/")}"));`;
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
        path.join(relativePath),
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
            path.join(relativePath),
            path.join(relativePath, main.react),
          ),
        );
      } else {
        const mainPath = path.join(relativePath, main.react);
        const mainMod = await Deno.readTextFile(
          path.join(routesUrl, mainPath),
        );
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
        `import { Outlet } from "react-router";`,
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
    `import "./${relativePath.replaceAll("\\", "/")}";`,
    `import * as $${routeId} from "./${relativePath.replaceAll("\\", "/")}";`,
  ];
}

function routerImportLine(routeId: number, relativePath: string) {
  return `import $${routeId} from "./${relativePath.replaceAll("\\", "/")}";`;
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
      `import type { RouteObject } from "react-router";`,
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

/**
 * Configuration options for building the application.
 */
export interface BuildOptions {
  /**
   * The absolute path to the application's working directory.
   * All other paths will be resolved relative to this directory.
   * Defaults to the current working directory.
   */
  workingDirectory?: string;

  /**
   * Path to the routes directory containing your application's route files.
   * The build process will generate two files in this directory:
   * - `_main.ts`: Oak router configuration for server-side routing
   * - `_main.tsx`: React Router configuration for client-side routing
   *
   * Your server entry point should import both files, while your client
   * entry point should only import the React Router configuration.
   *
   * Defaults to the "routes" directory in your working directory.
   */
  routesUrl?: string;

  /**
   * Path to the public directory that will serve your application's static files.
   * Built files will be placed in:
   * - public/build: Production and development builds
   * - public/test-build: Test builds
   *
   * Defaults to the "public" directory in your working directory.
   */
  publicUrl?: string;

  /**
   * Path to your deno.json or deno.jsonc configuration file.
   * Defaults to searching for these files in your working directory.
   */
  configPath?: string;

  /**
   * Additional esbuild plugins to use when building your application.
   * These plugins will be inserted after the deno resolver but before the deno loader plugin.
   */
  esbuildPlugins?: esbuildPlugin[];

  /**
   * Additional entry points to build beyond the main application entry point.
   * This is useful for building stylesheets, worker scripts, or other assets.
   *
   * Examples:
   * - Single CSS file: ["./styles/main.css"]
   * - All CSS files in routes: ["./routes/**\/*.css"]
   * - Multiple entry points: ["./styles/main.css", "./workers/sw.ts"]
   *
   * Built files will be placed in the public/build directory.
   * Defaults to an empty array.
   */
  entryPoints?: string[];
}

let context: esbuild.BuildContext | undefined = undefined;
let routesUrl: string | undefined = undefined;

/**
 * Gets the complete build options by merging provided options with defaults.
 * This is used internally to ensure all required options have values.
 *
 * @param options - Partial build options to merge with defaults
 * @returns Complete build options with all required fields
 */
export function getBuildOptions(
  options: BuildOptions = {},
): BuildOptions & {
  workingDirectory: string;
  routesUrl: string;
  publicUrl: string;
  entryPoints: string[];
} {
  const workingDirectory = options.workingDirectory ?? Deno.cwd();
  const routesUrl = options.routesUrl ??
    path.join(workingDirectory, "routes");
  const publicUrl = options.publicUrl ??
    path.join(workingDirectory, "public");
  const entryPoints = options.entryPoints ?? [];
  return {
    ...options,
    workingDirectory,
    routesUrl,
    publicUrl,
    entryPoints,
  };
}

function postBuild(success: boolean, error: unknown) {
  performance.mark("buildEnd");
  let duration: number = 0;
  let routesDuration: number | null = null;
  let esbuildDuration: number | null = null;
  try {
    duration = performance.measure("build", "buildStart", "buildEnd").duration;
    routesDuration =
      performance.measure("esbuild", "routesStart", "esbuildStart").duration;
    esbuildDuration =
      performance.measure("esbuild", "esbuildStart", "buildEnd").duration;
  } catch {
    // Ignore measurement errors
  }
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
 * Starts the build process with watch mode enabled.
 * This is useful for development when you want automatic rebuilds on file changes.
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
  let error: unknown = null;
  try {
    const {
      workingDirectory,
      routesUrl: _routesUrl,
      publicUrl,
      entryPoints,
    } = getBuildOptions(options);
    routesUrl = path.resolve(_routesUrl);
    const entryPoint = path.relative(
      workingDirectory,
      path.join(routesUrl, "./_main.tsx"),
    );

    let configPath = options.configPath ?? "deno.json";
    configPath = path.resolve(workingDirectory, configPath);
    if (!await exists(configPath)) {
      configPath = path.resolve(configPath, "deno.jsonc");
      if (!await exists(configPath)) {
        throw new Error("Could not find deno config file");
      }
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
        denoResolverPlugin({ configPath }),
        ...esbuildPlugins,
        denoLoaderPlugin({ configPath }),
      ],
      absWorkingDir: workingDirectory,
      entryPoints: [...entryPoints, entryPoint],
      outdir,
      outbase: workingDirectory,
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
 * Rebuilds the application using the existing build configuration.
 * This is typically called internally when files change in watch mode.
 *
 * @returns A promise that resolves to true if the rebuild succeeds, false otherwise
 */
export async function rebuild(): Promise<boolean> {
  if (!context || !routesUrl) {
    throw new Error("No build context available");
  }
  getLogger().info("Building app");
  performance.mark("buildStart");
  let success = false;
  let error: unknown = null;
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

/**
 * Stops the build process and cleans up any watchers or build contexts.
 * This should be called when you're done with the build process,
 * especially in watch mode.
 */
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
 * const buildOptions: BuildOptions = {
 *   // Add your own build options here if the defaults are not sufficient.
 * };
 *
 * export default buildOptions;
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
