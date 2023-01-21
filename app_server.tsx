import * as path from "$std/path/mod.ts";
import {
  Application,
  Context,
  ListenOptions,
  RouteParams,
  Router,
  RouterMiddleware,
} from "$x/oak/mod.ts";
import { ComponentType, ReactNode, StrictMode } from "$npm/react";
import { HelmetContext, HelmetProvider } from "$npm/react-helmet-async";
import { renderToReadableStream as renderReactToReadableStream } from "$npm/react-dom/server";
import {
  createMemoryRouter,
  RouteObject,
  RouterProvider,
} from "$npm/react-router-dom";
import serialize from "$npm/serialize-javascript";

import { AppErrorContext, HttpError, isHttpError } from "./error.tsx";
import {
  AppContext,
  AppEnvironment,
  getEnv,
  isDevelopment,
  isTest,
} from "./env.ts";

const encoder = new TextEncoder();

export interface HTMLOptions<
  AppContext extends Record<string, unknown> = Record<string, unknown>,
> {
  helmet: HelmetContext.HelmetServerState;
  env: AppEnvironment;
  context: AppContext;
  devPort?: number;
  error?: HttpError<{ boundary?: string }>;
}

function html<
  AppContext extends Record<string, unknown> = Record<string, unknown>,
>(
  { helmet, env, context, devPort, error }: HTMLOptions<AppContext>,
) {
  const headTags = [
    helmet.base.toString(),
    helmet.title.toString(),
    helmet.priority.toString(),
    helmet.meta.toString(),
    helmet.link.toString(),
    helmet.style.toString(),
    helmet.script.toString(),
    `<script>
      window.app = {
        env: ${serialize(env, { isJSON: true })},
        context: ${serialize(context, { isJSON: true })},
      };
    </script>`,
    error &&
    `<script>window.app.error = ${serialize(HttpError.json(error))};</script>`,
    isDevelopment() && devPort &&
    `<script>window.app.devPort = ${
      serialize(devPort, { isJSON: true })
    };</script>`,
    isDevelopment() && `<script type="module" src="/live-reload.js"></script>`,
    helmet.noscript.toString(),
  ].filter((tag: string) => Boolean(tag));

  return {
    start: `\
<!DOCTYPE html>
<html ${helmet.htmlAttributes.toString()}>
  <head>
    ${headTags.join("\n    ")}
    <script type="module" src="/${
      isTest() ? "test-" : ""
    }build/app.js" defer></script>
  </head>
  <body ${helmet.bodyAttributes.toString()}>`,
    end: `
  </body>
</html>
`,
  };
}

export async function renderToReadableStream<
  AppContext extends Record<string, unknown> = Record<string, unknown>,
>(
  context: Context<AppState<AppContext>>,
) {
  const { request, state } = context;
  const { route, Provider } = state._app;
  const { env, context: appContext, error, devPort } = state.app;
  const { pathname, search } = request.url;
  const location = `${pathname}${search}`;
  const helmetContext = {} as HelmetContext;

  const router = createMemoryRouter([route], {
    initialEntries: [location],
  });

  const stream = await renderReactToReadableStream(
    <StrictMode>
      <HelmetProvider context={helmetContext}>
        <AppErrorContext.Provider value={{ error }}>
          <AppContext.Provider value={appContext}>
            <Provider>
              <RouterProvider router={router} />
            </Provider>
          </AppContext.Provider>
        </AppErrorContext.Provider>
      </HelmetProvider>
    </StrictMode>,
    {
      onError(error: unknown) {
        console.error("renderToReadableStream error", error);
      },
    },
  );
  await stream.allReady;

  const { start, end } = html({
    helmet: helmetContext.helmet,
    env,
    context: appContext,
    error,
    devPort,
  });

  return stream
    .pipeThrough(
      new TransformStream({
        start(controller) {
          controller.enqueue(encoder.encode(start));
        },
        flush(controller) {
          controller.enqueue(encoder.encode(end));
        },
      }),
    );
}

export interface AppState<AppContext = Record<string, unknown>> {
  _app: {
    route: RouteObject;
    Provider: ComponentType<{ children: ReactNode }>;
  };
  app: {
    env: AppEnvironment;
    context: AppContext;
    render: () => Promise<void>;
    devPort?: number;
    error?: HttpError<{ boundary?: string }>;
  };
}

export interface AppRouterOptions<
  AppContext extends Record<string, unknown> = Record<string, unknown>,
> {
  route: RouteObject;
  env?: AppEnvironment;
  Provider?: ComponentType<{ children: ReactNode }>;
  renderToReadableStream?: typeof renderToReadableStream<AppContext>;
  router?: Router;
  root?: string;
  devPort?: number;
}

const TRAILING_SLASHES = /\/+$/;

export function createAppRouter<
  AppContext extends Record<string, unknown> = Record<string, unknown>,
>(
  {
    route,
    env,
    Provider,
    renderToReadableStream: renderAppToReadableStream,
    router,
    root,
    devPort,
  }: AppRouterOptions<AppContext>,
) {
  renderAppToReadableStream ??= renderToReadableStream;
  router ??= new Router();
  root ??= Deno.cwd();

  const appRouter = new Router()
    .use(async (context, next) => {
      const { request, response } = context;
      const { pathname, search } = request.url;
      if (pathname.length > 1 && pathname.at(-1) === "/") {
        response.status = 301;
        response.redirect(pathname.replace(TRAILING_SLASHES, "") + search);
      } else {
        await next();
      }
    })
    .use(async (context: Context<AppState<AppContext>>, next) => {
      const { request, response, state } = context;
      try {
        if (!state.app) {
          state._app = {
            route,
            Provider: Provider ??
              (({ children }) => <>{children}</>),
          };
          state.app = {
            env: {
              APP_ENV: getEnv("APP_ENV"),
              ...env,
            },
            context: {} as AppContext,
            render: async () => {
              response.type = "html";
              response.body = await renderAppToReadableStream!(context);
            },
          };
          if (isDevelopment() && devPort) {
            state.app.devPort = devPort;
          }
        }
        await next();
      } catch (cause) {
        const error = isHttpError(cause)
          ? HttpError.from(cause)
          : new HttpError(500, { cause });
        console.error("app error", error);

        response.status = error.status;
        if (path.extname(request.url.pathname) === "") {
          state.app.error = error;
          await state.app.render();
        } else {
          response.body = HttpError.json(error);
        }
      }
    })
    .use(router.routes(), router.allowedMethods());

  if (isDevelopment()) {
    const liveReloadScript = Deno.readTextFileSync(
      new URL("./live-reload.js", import.meta.url),
    );
    appRouter.use(async (context, next) => {
      const { request, response } = context;
      if (request.url.pathname === "/live-reload.js") {
        response.headers.set("Content-Type", "text/javascript");
        response.body = liveReloadScript;
      } else {
        await next();
      }
    });
  }

  appRouter.use(async (context) => {
    await context.send({ root: `${root}/public` });
  });

  return appRouter;
}

export function createApp<
  AppContext extends Record<string, unknown> = Record<string, unknown>,
>(options: AppRouterOptions<AppContext>) {
  const app = new Application();

  const appRouter = createAppRouter(options);

  app.use(appRouter.routes(), appRouter.allowedMethods());

  return app;
}

/**
 * This function tells the dev server when the app server is listening.
 * If you are not using serve, you must add an event listener to your app that will call this function once it's listening.
 * If this function is not called, the browser will not automatically refresh when the app server is restarted.
 * If called before the app server is listening, the browser will refresh before the app server is ready to handle the request.
 * This function will not do anything if the app is not running in development mode.
 */
export async function listeningDev(
  { hostname, secure, devPort }: {
    hostname: string;
    secure: boolean;
    devPort?: number;
  },
) {
  if (isDevelopment()) {
    try {
      const origin = `${secure ? "https://" : "http://"}${hostname}`;
      await fetch(`${origin}:${devPort || 9002}/listening`);
    } catch {
      // Ignore errors
    }
  }
}

export interface ServeOptions<
  AppContext extends Record<string, unknown> = Record<string, unknown>,
> extends AppRouterOptions<AppContext> {
  port?: number;
}

export async function serve<
  AppContext extends Record<string, unknown> = Record<string, unknown>,
>({ port, ...options }: ServeOptions<AppContext>) {
  const app = createApp(options);

  app.addEventListener("error", ({ error }) => {
    console.error("Uncaught app error", error);
  });

  app.addEventListener("listen", ({ hostname, port, secure }) => {
    const origin = `${secure ? "https://" : "http://"}${hostname}`;
    console.log(`Listening on: ${origin}:${port}`);
    queueMicrotask(() =>
      listeningDev({ hostname, secure, devPort: options.devPort })
    );
  });

  const listenOptions = {} as ListenOptions;
  if (typeof port === "number") listenOptions.port = port;
  await app.listen(listenOptions);
}

/** The type of requests handled by the middleware. */
export type MiddlewareType =
  | "all"
  | "delete"
  | "get"
  | "head"
  | "options"
  | "patch"
  | "post"
  | "put"
  | "use";

/** Used to generate middleware for the oak router associated with a route. */
export interface Middleware<
  P extends RouteParams<string> = RouteParams<string>,
  S extends AppState = AppState,
> {
  type: MiddlewareType;
  middlewares: RouterMiddleware<string, P, S>[];
}

/** Creates middleware for a route. */
export function middleware<
  P extends RouteParams<string> = RouteParams<string>,
  S extends AppState = AppState,
>(
  type: MiddlewareType,
  ...middlewares: RouterMiddleware<string, P, S>[]
): Middleware<P, S> {
  return { type, middlewares };
}

/** Adds middleware from routes onto an oak router. */
export function addMiddleware<
  P extends RouteParams<string> = RouteParams<string>,
  S extends AppState = AppState,
>(router: Router, ...middlewares: Middleware<P, S>[]) {
  for (const entry of middlewares) {
    const [middleware, ...middlewares] = entry.middlewares;
    router[entry.type as "all"]("/", middleware, ...middlewares);
  }
}

/**
 * This router renders the application on get requests.
 * It is used for all route components that do not have route middleware.
 */
export const defaultRouter = new Router()
  .get("/", async (context: Context<AppState>) => {
    await context.state.app.render();
  });

/**
 * This router will catch all requests and throw a not found error for those with a pathname that does not have an extension.
 * It's used as the default wildcard router at the top level of your app.
 */
export const notFoundRouter = new Router()
  .get("/(.*)", async (context: Context<AppState<unknown>>, next) => {
    const { request } = context;
    if (path.extname(request.url.pathname) === "") {
      throw new HttpError(404, "Not found");
    } else {
      await next();
    }
  });

/**
 * This middleware ensures all errors in the route are HttpErrors.
 * If an error isn't an HttpError, a new HttpError is created with it as the cause.
 * If a boundary is specified, it will add the boundary to the HttpError.
 * If an AppErrorBoundary exists with a matching boundary, it will be used to handle the error.
 * If a boundary is not specified, the first AppErrorBoundary without a boundary specified will handle the error.
 * If a boundary is specified, but no AppErrorBoundary exists with a matching boundary, the error will go unhandled.
 */
export function errorBoundary<
  P extends RouteParams<string> = RouteParams<string>,
  S extends AppState = AppState,
>(boundary?: string): Middleware<P, S> {
  return middleware("use", async (context, next) => {
    const { response, state } = context;
    const { app } = state;
    try {
      await next();
    } catch (cause) {
      app.error = isHttpError(cause)
        ? HttpError.from<{ boundary?: string }>(cause)
        : new HttpError<{ boundary?: string }>(500, { cause });
      if (boundary) app.error.data.boundary = boundary;
      response.status = app.error.status;
      await state.app.render();
    }
  });
}
