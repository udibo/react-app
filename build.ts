import { walk } from "$std/fs/walk.ts";
import { ensureDir } from "$std/fs/ensure_dir.ts";
import * as path from "$std/path/mod.ts";
import * as esbuild from "$x/esbuild/mod.js";
import { denoPlugin } from "$x/esbuild_deno_loader/mod.ts";

import { isProduction, isTest } from "./env.ts";

async function exists(filePath: string | URL): Promise<boolean> {
  try {
    await Deno.lstat(filePath);
    return true;
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      return false;
    }
    throw error;
  }
}

interface Route {
  name: string;
  isFile?: boolean;
  main?: string;
  index?: string;
  children?: Map<string, Route>;
}

const ROUTE_FILE_NAME = /^([^\/]+)(\.tsx|\.jsx)$/;
const ROUTE_PARAM = /^\[(.+)]$/;
const ROUTE_WILDCARD = /^\[...\]$/;
function routePathFromName(name: string) {
  if (!name) return "/";
  return name
    .replace(ROUTE_WILDCARD, "*")
    .replace(ROUTE_PARAM, ":$1");
}

async function buildRoutes(moduleUrl: string) {
  const appRoute = {} as Route;

  function registerRoute(
    parentRoute: Route,
    name: string,
    isFile?: boolean,
  ): Route {
    let route: Route;
    const isMain = isFile && (name === "main.tsx" || name === "main.jsx");
    const isIndex = isFile && (name === "index.tsx" || name === "index.jsx");

    if (!name || isIndex || isMain) {
      route = parentRoute;
    } else if (parentRoute.children?.has(name)) {
      route = parentRoute.children.get(name)!;
    } else {
      if (!parentRoute.children) {
        parentRoute.children = new Map();
      }
      route = { name } as Route;
      parentRoute.children!.set(name, route);
    }

    if (isMain) {
      route.main = name;
    } else if (isIndex) {
      route.index = name;
    } else if (isFile && name) {
      route.isFile = true;
    }

    return route;
  }

  const routesUrl = path.join(moduleUrl, "./routes");
  for await (const entry of walk(routesUrl)) {
    if (!entry.isFile) continue;
    const routeFileName = entry.name.match(ROUTE_FILE_NAME);
    if (!routeFileName) continue;

    let relativePath = path.relative(routesUrl, entry.path);
    if (relativePath[relativePath.length - 1] === path.sep) {
      relativePath = relativePath.slice(0, relativePath.length - 1);
    }

    const paths = relativePath.split(path.sep);
    let route = appRoute;
    for (let i = 0; i < paths.length; i++) {
      const name = paths[i];
      route = registerRoute(route, name, i === (paths.length - 1));
    }
  }

  let routeFileImports =
    `import { lazy } from "$npm/react";\nimport { RouteObject } from "$npm/react-router-dom";\n\n`;
  let routeFileExports = "export const route: RouteObject = ";

  let routerFileImports =
    `import { Router } from "$x/oak/mod.ts";\nimport { addMiddleware, defaultRouter } from "../app_server.tsx";\n\n`;
  let routerFileExports = "";

  let routeId = 0;
  async function addToFiles(
    parentRouteId: number,
    directory: string,
    route: Route,
  ) {
    const posixDirectory = directory.replaceAll(path.SEP, path.posix.sep);
    if (route.isFile) {
      routerFileImports += `import "./${
        path.posix.join("./routes", posixDirectory, route.name)
      }";\n`;

      const routePath = routePathFromName(route.name.slice(0, -4));
      const routerFileName = route.name.slice(0, -4);
      if (
        await exists(path.join(routesUrl, directory, `${routerFileName}.ts`))
      ) {
        routerFileImports += `import $${routeId} from "./${
          path.posix.join("./routes", posixDirectory, `${routerFileName}.ts`)
        }";\n`;
        routerFileExports += `const router${routeId} = new Router();\n`;
        routerFileExports +=
          `addMiddleware(router${routeId}, ...$${routeId});\n`;
        if (parentRouteId !== -1) {
          const routerPath = routePath === "*" ? "(.*)" : routePath;
          routerFileExports +=
            `router${parentRouteId}.use("/${routerPath}", router${routeId}.routes(), router${routeId}.allowedMethods());\n`;
        }
      } else if (
        await exists(path.join(routesUrl, directory, `${routerFileName}.js`))
      ) {
        routerFileImports += `import $${routeId} from "./${
          path.posix.join("./routes", posixDirectory, `${routerFileName}.js`)
        }";\n`;
        routerFileExports += `const router${routeId} = new Router();\n`;
        routerFileExports +=
          `addMiddleware(router${routeId}, ...$${routeId});\n`;
        if (parentRouteId !== -1) {
          routerFileExports +=
            `router${parentRouteId}.use("/${routePath}", router${routeId}.routes(), router${routeId}.allowedMethods());\n`;
        }
      } else if (routePath !== "*") {
        routerFileExports +=
          `router${parentRouteId}.use("/${routePath}", defaultRouter.routes(), defaultRouter.allowedMethods());\n`;
      }

      routeFileImports += `const $${routeId} = lazy(() => import("./${
        path.posix.join("./routes", posixDirectory, route.name)
      }"));\n`;
      routeFileExports += `{path:"${routePath}", element: <$${routeId} />}`;

      routeId++;
    } else {
      if (route.main) {
        routerFileImports += `import "./${
          path.posix.join("./routes", posixDirectory, route.main)
        }";\n`;
      }

      const routePath = routePathFromName(route.name);

      const mainRouteId = routeId;
      routerFileExports += `const router${mainRouteId} = new Router();\n`;
      if (await exists(path.join(routesUrl, directory, "main.ts"))) {
        routerFileImports += `import $${mainRouteId} from "./${
          path.posix.join("./routes", posixDirectory, "main.ts")
        }";\n`;
        routerFileExports +=
          `addMiddleware(router${mainRouteId}, ...$${mainRouteId});\n`;
      } else if (await exists(path.join(routesUrl, directory, "main.js"))) {
        routerFileImports += `import $${mainRouteId} from "./${
          path.posix.join("./routes", posixDirectory, "main.js")
        }";\n`;
        routerFileExports +=
          `addMiddleware(router${mainRouteId}, ...$${mainRouteId});\n`;
      }

      routeId++;

      if (route.index) {
        routerFileImports += `import "./${
          path.posix.join("./routes", posixDirectory, route.index)
        }";\n`;
        routerFileExports += `const router${routeId} = new Router();\n`;
        if (await exists(path.join(routesUrl, directory, "index.ts"))) {
          routerFileImports += `import $${routeId} from "./${
            path.posix.join("./routes", posixDirectory, "index.ts")
          };\n`;
          routerFileExports +=
            `addMiddleware(router${routeId}, ...$${routeId});\n`;
        } else if (
          await exists(path.join(routesUrl, directory, "index.js"))
        ) {
          routerFileImports += `import $${routeId} from "./${
            path.posix.join("./routes", posixDirectory, "index.js")
          }";\n`;
          routerFileExports +=
            `addMiddleware(router${routeId}, ...$${routeId});\n`;
        } else {
          routerFileExports += `router${routeId}.use("${
            path.posix.join("/", routePath)
          }", defaultRouter.routes(), defaultRouter.allowedMethods());\n`;
        }
        routerFileExports +=
          `router${mainRouteId}.use("/", router${routeId}.routes(), router${routeId}.allowedMethods());\n`;

        routeId++;
      }

      routeFileExports += `{path: "${routePathFromName(route.name)}",`;

      if (route.main) {
        routeFileImports += `const $${routeId} = lazy(() => import("./${
          path.posix.join("./routes", posixDirectory, route.main)
        }"));\n`;
        routeFileExports += `element: <$${routeId} />,`;
        routeId++;
      }

      if (route.index || route.children) {
        routeFileExports += "children: [\n";

        if (route.index) {
          routeFileImports += `const $${routeId} = lazy(() => import("./${
            path.posix.join("./routes", posixDirectory, route.index)
          }"));\n`;
          routeFileExports += `{index:true, element: <$${routeId} />},\n`;
          routeId++;
        }

        if (route.children) {
          let notFoundRoute;
          for (const childRoute of route.children.values()) {
            if (
              childRoute.isFile &&
              (childRoute.name === "[...].tsx" ||
                childRoute.name === "[...].jsx")
            ) {
              notFoundRoute = childRoute;
              continue;
            }

            let childDirectory = directory;
            if (!childRoute.isFile && childRoute.name) {
              childDirectory = path.join(directory, childRoute.name);
            }
            await addToFiles(mainRouteId, childDirectory, childRoute);
            routeFileExports += ",\n";
          }

          if (notFoundRoute) {
            await addToFiles(mainRouteId, directory, notFoundRoute);
            routeFileExports += ",\n";
          }
        }

        routeFileExports += "],\n";
      }
      routeFileExports += "}";

      if (parentRouteId !== -1) {
        routerFileExports +=
          `router${parentRouteId}.use("/${routePath}", router${mainRouteId}.routes(), router${mainRouteId}.allowedMethods());\n`;
      }
    }
  }

  await addToFiles(-1, path.sep, appRoute);

  const routeFile = {
    path: path.resolve(moduleUrl, "./_app.tsx"),
    data: [routeFileImports, routeFileExports].join("\n"),
  };

  const routerFile = {
    path: path.resolve(moduleUrl, "./_app.ts"),
    data: [
      routerFileImports,
      routerFileExports,
      `export const router = router0;\n`,
    ].join("\n"),
  };

  await Deno.writeTextFile(routeFile.path, routeFile.data);
  await Deno.writeTextFile(routerFile.path, routerFile.data);

  const fmtProcess = Deno.run({
    cmd: [
      "deno",
      "fmt",
      "--quiet",
      routeFile.path,
      routerFile.path,
    ],
    stdin: "null",
    stdout: "null",
  });
  await fmtProcess.status();
}

export interface BuildOptions {
  moduleUrl: string;
}

export async function build(options: BuildOptions) {
  const { moduleUrl } = options;
  const entryPoint = "app.tsx";
  const outdir = path.join(
    moduleUrl,
    "public",
    `${isTest() ? "test-" : ""}build`,
  );
  await ensureDir(outdir);

  const importMapURL = path.toFileUrl(
    path.join(moduleUrl, "import_map.json"),
  );

  const buildOptions: esbuild.BuildOptions = isProduction() ? {} : {
    jsxDev: true,
    sourcemap: "linked",
  };

  await buildRoutes(moduleUrl);

  await esbuild.build({
    plugins: [
      denoPlugin({ importMapURL }),
    ],
    entryPoints: [entryPoint],
    outdir,
    bundle: true,
    splitting: true,
    minify: true,
    format: "esm",
    jsx: "automatic",
    jsxImportSource: "$npm/react",
    ...buildOptions,
  });
  return () => esbuild.stop();
}

if (import.meta.main) {
  console.log("Building app");
  performance.mark("buildStart");
  let success = false;
  try {
    const stop = await build({
      moduleUrl: Deno.cwd(),
    });
    stop();
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
}
