import { walk } from "std/fs/walk.ts";
import { ensureDir } from "std/fs/ensure_dir.ts";
import * as path from "std/path/mod.ts";
import * as esbuild from "x/esbuild/mod.js";
import { DenoPluginsOptions, denoPlugins } from "x/esbuild_deno_loader/mod.ts";

import { isProduction, isTest } from "./env.ts";
import { ROUTE_PARAM, ROUTE_WILDCARD, routePathFromName } from "./server.tsx";

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

function routeFileData(routeId: number, relativePath: string, route: Route) {
  const importLines: string[] = [];
  const name = routePathFromName(route.name);
  let routeText = `{ path: ${JSON.stringify(name)}`;

  const { file, main, index, children } = route;
  if (file?.react) {
    importLines.push(
      lazyImportLine(
        routeId,
        relativePath,
        path.posix.join(relativePath, routeId === 0 ? "" : "../", file.react),
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
            path.posix.join(relativePath, main.react),
          ),
        );
      } else {
        importLines.push(
          `import * as $${routeId++} from "./${
            path.posix.join(relativePath, main.react)
          }";`,
          `let $${routeId};`,
          `if (($${routeId - 1} as RouteFile).ErrorFallback) {`,
          `  $${routeId} = withAppErrorBoundary($${routeId - 1}.default, {`,
          `    FallbackComponent: ($${
            routeId - 1
          } as RouteFile).ErrorFallback!,`,
          `  });`,
          `} else {`,
          `  $${routeId} = $${routeId - 1}.default;`,
          `}`,
        );
      }
      routeText += `, element: <$${routeId} />`;
      routeId++;
    } else if (!relativePath) {
      importLines.push(
        `import { Outlet } from "npm/react-router-dom";`,
        `const $${routeId} = withAppErrorBoundary(() => <Outlet />, { FallbackComponent: DefaultErrorFallback });`,
      );
      routeText += `, element: <$${routeId} />`;
      routeId++;
    }

    const childRouteTexts: string[] = [];
    if (index?.react) {
      importLines.push(
        lazyImportLine(
          routeId,
          path.posix.join(relativePath, "index"),
          path.posix.join(relativePath, index.react),
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
      } = routeFileData(
        routeId,
        path.posix.join(relativePath, childRoute.name),
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
      } = routeFileData(
        routeId,
        path.posix.join(relativePath, notFoundRoute.name),
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
          path.posix.join(relativePath, routeId > 0 ? "../" : "", file.react),
        ),
      );
      fileText.push(`react:$${routeId}`);
      routeId++;
    }

    if (file.oak) {
      importLines.push(
        routerImportLine(
          routeId,
          path.posix.join(relativePath, routeId > 0 ? "../" : "", file.oak),
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
            path.posix.join(relativePath, main.react),
          ),
        );
        fileText.push(`react:$${routeId}`);
        routeId++;
      }

      if (main.oak) {
        importLines.push(
          routerImportLine(
            routeId,
            path.posix.join(relativePath, main.oak),
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
            path.posix.join(relativePath, index.react),
          ),
        );
        fileText.push(`react:$${routeId}`);
        routeId++;
      }

      if (index.oak) {
        importLines.push(
          routerImportLine(
            routeId,
            path.posix.join(relativePath, index.oak),
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
          path.posix.join(relativePath, name),
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
    Deno.writeFile(path, fmt.stdout);
  } else {
    console.log("fmt routes failed", { path, code });
  }
}

async function updateRoutes(routesUrl: string, rootRoute: Route) {
  if (rootRoute.react) {
    const lines = [
      `import { lazy, withAppErrorBoundary, DefaultErrorFallback, NotFound, RouteFile } from "x/udibo_react_app/mod.tsx";`,
      `import { RouteObject } from "npm/react-router-dom";`,
      "",
    ];
    const { importLines, routeText } = routeFileData(0, "", rootRoute);
    lines.push(...importLines, "");
    lines.push(`export default ${routeText} as RouteObject;`, "");

    await writeRoutes(path.join(routesUrl, "_main.tsx"), lines.join("\n"));
  }

  const lines = [
    `import { generateRouter } from "x/udibo_react_app/server.tsx";`,
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

export interface BuildOptions {
  /** The absolute path to the working directory for your application. */
  workingDirectory: string;
  /** The client entry point for your application relative to the workingDirectory. */
  entryPoint: string;
  /**
   * Urls for all routes directories that your app uses.
   * Each routes directory will have 2 files generated in them.
   * - `_main.ts`: Contains the oak router for the routes.
   * - `_main.tsx`: Contains the react router routes for controlling navigation in the app.
   * Your server entrypoint should import and use both of the generated files for each routes directory.
   * Your client entry point should only import the react router routes.
   * In most cases, you will only need a single routesUrl.
   */
  routesUrls: string[];
  /**
   * The application will serve all files from this directory.
   * The build for your client entry point will be stored in public/build.
   * Test builds will be stored in public/test-build.
   */
  publicUrl: string;
  /** File url for your import map. */
  importMapUrl: string;
  /**
   * ESBuild plugins to use when building your application.
   * These plugins will be added after the deno plugin.
   */
  esbuildPlugins?: esbuild.Plugin[];
  /**
   * Called before building the application.
   * This can be used to add additional steps before the build starts.
   */
  preBuild?: (() => Promise<void>) | (() => void);
  /**
   * Called after building the application.
   * This can be used to add additional steps after the build is completed.
   */
  postBuild?: (() => Promise<void>) | (() => void);
}

/** Builds the application and all of it's routes. */
export async function build(options: BuildOptions) {
  const { preBuild, postBuild } = options;

  if (preBuild) await preBuild();

  console.log("Building app");
  performance.mark("buildStart");
  let success = false;
  try {
    const {
      entryPoint,
      routesUrls,
      publicUrl,
      importMapUrl,
      workingDirectory,
    } = options;
    const outdir = path.join(
      publicUrl,
      `${isTest() ? "test-" : ""}build`,
    );
    await ensureDir(outdir);

    const importMapURL = path.toFileUrl(importMapUrl).toString();

    const buildOptions: esbuild.BuildOptions = isProduction()
      ? { minify: true }
      : {
        minifyIdentifiers: false,
        minifySyntax: true,
        minifyWhitespace: true,
        jsxDev: true,
        sourcemap: "linked",
      };

    for (const routesUrl of routesUrls) {
      await buildRoutes(routesUrl);
    }

    const esbuildPlugins = options.esbuildPlugins ?? [];
    await esbuild.build({
      plugins: [
        ...denoPlugins({ importMapURL }),
        ...esbuildPlugins,
      ],
      absWorkingDir: workingDirectory,
      entryPoints: [entryPoint],
      outdir,
      bundle: true,
      splitting: true,
      treeShaking: true,
      platform: "neutral",
      format: "esm",
      jsx: "automatic",
      jsxImportSource: "npm/react",
      ...buildOptions,
    });
    esbuild.stop();
    success = true;
  } catch {
    // Ignore error, esbuild already logs it
  } finally {
    performance.mark("buildEnd");
    const measure = performance.measure("build", "buildStart", "buildEnd");
    console.log(
      `Build ${success ? "completed" : "failed"} in ${
        Math.round(measure.duration)
      } ms`,
    );
    if (!success) Deno.exit(1);
  }

  if (postBuild) await postBuild();

  return success;
}

if (import.meta.main) {
  const cwd = Deno.cwd();
  const entryPoint = "app.tsx";
  const publicUrl = path.join(cwd, "public");
  const routesUrl = path.join(cwd, "routes");
  const importMapUrl = path.join(cwd, "import_map.json");

  const success = await build({
    workingDirectory: cwd,
    entryPoint,
    publicUrl,
    routesUrls: [routesUrl],
    importMapUrl,
  });
  if (!success) Deno.exit(1);
}
