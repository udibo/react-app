import { walk } from "$std/fs/walk.ts";
import { ensureDir } from "$std/fs/ensure_dir.ts";
import * as path from "$std/path/mod.ts";
import * as esbuild from "$x/esbuild/mod.js";
import { denoPlugin } from "$x/esbuild_deno_loader/mod.ts";

import { isProduction, isTest } from "./env.ts";

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

const ROUTE_PARAM = /^\[(.+)]$/;
const ROUTE_WILDCARD = /^\[...\]$/;
function routePathFromName(name: string) {
  if (!name) return "/";
  return name
    .replace(ROUTE_WILDCARD, "*")
    .replace(ROUTE_PARAM, ":$1");
}

function lazyImportLine(routeId: number, relativePath: string) {
  return `const $${routeId} = lazy(() => import("./${relativePath}"));`;
}

function routeFileData(routeId: number, relativePath: string, route: Route) {
  const importLines: string[] = [];
  let routeText = `{ path: "${routePathFromName(route.name)}"`;

  const { file, main, index, children } = route;
  if (file?.react) {
    importLines.push(
      lazyImportLine(
        routeId,
        path.posix.join(relativePath, routeId === 0 ? "" : "../", file.react),
      ),
    );
    routeText += `, element: <$${routeId} /> }`;
    routeId++;
  } else {
    if (main?.react) {
      importLines.push(
        lazyImportLine(routeId, path.posix.join(relativePath, main.react)),
      );
      routeText += `, element: <$${routeId} />`;
      routeId++;
    }

    const childRouteTexts: string[] = [];
    if (index?.react) {
      importLines.push(
        lazyImportLine(routeId, path.posix.join(relativePath, index.react)),
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
    } else if (relativePath === ".") {
      importLines.push(
        `import { NotFound } from "$x/udibo_react_app/error.tsx";`,
      );
      childRouteTexts.push(`{ path: "*", element: <NotFound /> }`);
    }

    if (childRouteTexts.length) {
      routeText += `, children: [${childRouteTexts.join(", ")}]`;
    }
    routeText += "}";
  }

  return {
    importLines,
    routeText,
    nextRouteId: routeId,
  };
}

function routeImportLine(_routeId: number, relativePath: string) {
  // return `import * as $${routeId} from "./${relativePath}";`;
  return `import "./${relativePath}";`;
}

function routerImportLine(routeId: number, relativePath: string) {
  return `import $${routeId} from "./${relativePath}";`;
}

function routerFileData(
  parentRouteId: number,
  routeId: number,
  relativePath: string,
  route: Route,
) {
  const importLines: string[] = [];
  const routerLines: string[] = [];

  const { name, file, main, index, react, children, parent } = route;
  if (file) {
    if (file.react) {
      importLines.push(
        routeImportLine(
          routeId,
          path.posix.join(relativePath, routeId > 0 ? "../" : "", file.react),
        ),
      );
      routeId++;
    }

    if (file.oak) {
      importLines.push(
        routerImportLine(
          routeId,
          path.posix.join(relativePath, routeId > 0 ? "../" : "", file.oak),
        ),
      );
      if (relativePath !== ".") {
        routerLines.push(
          `$${parentRouteId}.use("/${
            routePathFromName(name)
          }", $${routeId}.routes(), $${routeId}.allowedMethods());`,
        );
      }
      routeId++;
    } else if (file.react) {
      routerLines.push(
        `$${parentRouteId}.use("/${
          routePathFromName(name)
        }", defaultRouter.routes(), defaultRouter.allowedMethods())`,
      );
    }
  } else {
    const mainRouteId = routeId++;
    if (main) {
      if (main.react) {
        importLines.push(
          routeImportLine(
            routeId,
            path.posix.join(relativePath, main.react),
          ),
        );
        routeId++;
      }

      if (main.oak) {
        importLines.push(
          routerImportLine(
            mainRouteId,
            path.posix.join(relativePath, main.oak),
          ),
        );
      } else {
        routerLines.push(`const $${mainRouteId} = new Router();`);
      }
    } else {
      routerLines.push(`const $${mainRouteId} = new Router();`);
    }

    if (index) {
      if (index.react) {
        importLines.push(
          routeImportLine(
            routeId,
            path.posix.join(relativePath, index.react),
          ),
        );
        routeId++;
      }

      if (index.oak) {
        importLines.push(
          routerImportLine(
            routeId,
            path.posix.join(relativePath, index.oak),
          ),
        );

        routerLines.push(
          `$${mainRouteId}.use("/", $${routeId}.routes(), $${routeId}.allowedMethods());`,
        );
        routeId++;
      } else if (react) {
        routerLines.push(
          `$${mainRouteId}.use("/", defaultRouter.routes(), defaultRouter.allowedMethods())`,
        );
      }
    }

    let notFoundRoute: Route | undefined = undefined;
    for (const childRoute of Object.values(children ?? {})) {
      if (childRoute.name === "[...]") {
        notFoundRoute = childRoute;
        continue;
      }
      const {
        importLines: childImportLines,
        routerLines: childRouterLines,
        nextRouteId,
      } = routerFileData(
        mainRouteId,
        routeId,
        path.posix.join(relativePath, childRoute.name),
        childRoute,
      );
      importLines.push(...childImportLines);
      routerLines.push(...childRouterLines);
      routeId = nextRouteId;
    }
    notFoundRoute;

    if (notFoundRoute) {
      const {
        importLines: childImportLines,
        routerLines: childRouterLines,
        nextRouteId,
      } = routerFileData(
        mainRouteId,
        routeId,
        path.posix.join(relativePath, notFoundRoute.name),
        notFoundRoute,
      );
      importLines.push(...childImportLines);
      routerLines.push(...childRouterLines);
      routeId = nextRouteId;
    }

    if (relativePath === ".") {
      routerLines.push("", `export default $0;`);
    } else {
      routerLines.push(
        `const $${mainRouteId}Main = ${
          parent?.react && !react
            ? `createApiRouter($${mainRouteId})`
            : `$${mainRouteId}`
        };`,
      );
      routerLines.push(
        `$${parentRouteId}.use("/${
          routePathFromName(name)
        }", $${mainRouteId}Main.routes(), $${mainRouteId}Main.allowedMethods());`,
      );
    }
  }

  return {
    importLines,
    routerLines,
    nextRouteId: routeId,
  };
}

async function writeRoutes(path: string, text: string) {
  const fmt = Deno.run({
    cmd: ["deno", "fmt", "-"],
    stdin: "piped",
    stdout: "piped",
  });
  const encoder = new TextEncoder();
  await fmt.stdin.write(encoder.encode(text));
  fmt.stdin.close();
  const [status, rawOutput] = await Promise.all([fmt.status(), fmt.output()]);
  if (status.success) {
    Deno.writeFile(path, rawOutput);
  } else {
    console.log("fmt routes failed", { path, ...status });
  }
}

async function updateRoutes(routesUrl: string, rootRoute: Route) {
  if (rootRoute.react) {
    const lines = [
      `import { lazy } from "$npm/react";`,
      `import { RouteObject } from "$npm/react-router-dom";`,
      "",
    ];
    const { importLines, routeText } = routeFileData(0, ".", rootRoute);
    lines.push(...importLines, "");
    lines.push(`export default ${routeText} as RouteObject;`, "");

    console.log("_main.tsx");
    console.log(lines.join("\n"));
    await writeRoutes(path.join(routesUrl, "_main.tsx"), lines.join("\n"));
  }

  const lines = [
    `import { Router } from "$x/oak/mod.ts";`,
    `import { defaultRouter, createApiRouter } from "$x/udibo_react_app/app_server.tsx";`,
    "",
  ];
  const { importLines, routerLines } = routerFileData(-1, 0, ".", rootRoute);
  lines.push(...importLines, "", ...routerLines);

  console.log("_main.ts");
  console.log(lines.join("\n"));
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
}

/** Builds the application and all of it's routes. */
export async function build(options: BuildOptions) {
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

    const importMapURL = path.toFileUrl(importMapUrl);

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

    await esbuild.build({
      plugins: [
        denoPlugin({ importMapURL }),
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
      jsxImportSource: "$npm/react",
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
  return success;
}

if (import.meta.main) {
  const cwd = Deno.cwd();
  const entryPoint = "app.tsx";
  const publicUrl = path.join(cwd, "public");
  const routesUrl = path.join(cwd, "routes");
  const importMapUrl = path.join(cwd, "import_map.json");
  console.log({
    cwd,
    entryPoint,
    publicUrl,
    routesUrl,
    importMapUrl,
  });

  const success = await build({
    workingDirectory: cwd,
    entryPoint,
    publicUrl,
    routesUrls: [routesUrl],
    importMapUrl,
  });
  if (!success) Deno.exit(1);
}
