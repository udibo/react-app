/**
 * This module provides the server-side functionality for the Udibo React App framework.
 * It has utilities for creating the server, rendering the application, and handling errors.
 *
 * @module
 */
/** @jsxRuntime automatic */
/** @jsxImportSource npm:react@18 */
/** @jsxImportSourceTypes npm:@types/react@18 */
import * as path from "@std/path";
import * as oak from "@oak/oak";
import { StrictMode } from "react";
import reactHelmetAsync from "react-helmet-async";
const { HelmetProvider } = reactHelmetAsync;
import type { HelmetServerState } from "react-helmet-async";
import { renderToReadableStream } from "react-dom/server";
import {
  createStaticHandler,
  createStaticRouter,
  StaticRouterProvider,
} from "react-router-dom/server.js";
import type { StaticHandlerContext } from "react-router-dom/server.js";
import type { RouteObject } from "react-router-dom";
import serialize from "serialize-javascript";

import { ErrorResponse, HttpError, isHttpError } from "./error.tsx";
import { getEnvironment, isBrowser, isDevelopment, isTest } from "./env.ts";
import type { RouteFile } from "./client.tsx";
import { ErrorContext, InitialStateContext } from "./context.ts";
import { getLogger } from "./log.ts";

if (isBrowser()) {
  throw new Error("Cannot import server.tsx in the browser.");
}

/**
 * An interface that defines the configuration for generating the HTML that wraps the server-side rendered React application.
 */
interface HTMLOptions<
  SharedState extends Record<string | number, unknown> = Record<
    string | number,
    unknown
  >,
> {
  helmet: HelmetServerState;
  initialState: SharedState;
  error?: HttpError<{ boundary?: string }>;
  devPort?: number;
}

/**
 * Generates the HTML that wraps the server-side rendered React application.
 *
 * @param options - An object containing the configuration for generating the HTML that wraps the server-side rendered React application.
 * @returns An object containing the start and end of the HTML that wraps the server-side rendered React application.
 */
function html<
  SharedState extends Record<string | number, unknown> = Record<
    string | number,
    unknown
  >,
>(
  options: HTMLOptions<SharedState>,
): { start: string; end: string } {
  const { helmet, initialState, devPort, error } = options;
  const errorJSON = HttpError.json(error);
  if (isDevelopment()) {
    if (error?.expose) errorJSON.expose = error.expose;
    if (error instanceof Error) {
      errorJSON.stack = error.stack;
    }
  }

  const headLines = [
    helmet.base.toString(),
    helmet.title.toString(),
    helmet.priority.toString(),
    helmet.meta.toString(),
    helmet.link.toString(),
    helmet.style.toString(),
    helmet.script.toString(),
    `<script>
      window.app = {
        env: ${serialize(getEnvironment(), { isJSON: true })},
        initialState: ${serialize(initialState, { isJSON: true })},`,
    error &&
    `    error: ${serialize(errorJSON)},`,
    isDevelopment() && devPort &&
    `    devPort: ${serialize(devPort, { isJSON: true })},`,
    `  };
    </script>`,
    helmet.noscript.toString(),
  ].filter((tag) => Boolean(tag));

  return {
    start: `\
<!DOCTYPE html>
<html ${helmet.htmlAttributes.toString()}>
  <head>
    ${headLines.join("\n    ")}
    <script type="module" src="/${
      isTest() ? "test-" : ""
    }build/_main.js" defer></script>
  </head>
  <body ${helmet.bodyAttributes.toString()}>
    <div id="root">`,
    end: `
    </div>
  </body>
</html>
`,
  };
}

/**
 * Gets the fetch request object from an Oak request object. This is used by react router to assist with server-side rendering.
 */
function getFetchRequest(
  request: oak.Request,
  response: oak.Response,
): Request {
  const { url, headers, method, body, source } = request;
  // Source is available on Deno, but not in other JavaScript runtimes.
  if (source) return source;

  const controller = new AbortController();
  response.addResource({ close: () => controller.abort() });

  const init: RequestInit = {
    method,
    headers,
    signal: controller.signal,
  };

  if (method !== "GET" && method !== "HEAD" && body) {
    init.body = request.body.stream;
  }

  return new Request(url.href, init);
}

/**
 * Options for rendering the React application to a readable stream that can be returned to the client.
 */
interface RenderOptions {
  /**
   * The React Router route for the application.
   * The build script will automatically generate this for your application's routes.
   * The route object is the default export from the `_main.tsx` file in the routes directory.
   */
  route: RouteObject;
  /** Used to perform data fetching and submissions on the server. */
  handler: ReturnType<typeof createStaticHandler>;
  /**
   * If an error occurs when handling the request, this property will be set to that error.
   * The error will be serialized and sent to the browser.
   * The browser will recreate the error for an `ErrorBoundary` to catch.
   * If the server error is not getting caught, the boundary doesn't match the `ErrorBoundary` you expect to catch it.
   */
  error?: HttpError<{ boundary?: string }>;
  /** The port for the dev task's live reload server. */
  devPort?: number;
}

/**
 * Renders the React application to a readable stream that can be returned to the client.
 *
 * @param context - The server context object for the request.
 * @returns A readable stream that can be returned to the client.
 */
async function renderAppToReadableStream<
  SharedState extends Record<string | number, unknown> = Record<
    string | number,
    unknown
  >,
>(
  context: Context<SharedState>,
  options: RenderOptions,
) {
  const { request, response, state } = context;
  const { handler, error, devPort } = options;
  const { initialState } = state.app;
  const helmetContext = {} as { helmet: HelmetServerState };

  const fetchRequest = getFetchRequest(request, response);
  const routerContext = await handler.query(
    fetchRequest,
  ) as StaticHandlerContext;

  const router = createStaticRouter(handler.dataRoutes, routerContext);

  const stream = await renderToReadableStream(
    <StrictMode>
      <HelmetProvider context={helmetContext}>
        <ErrorContext.Provider value={{ error }}>
          <InitialStateContext.Provider value={initialState}>
            <StaticRouterProvider router={router} context={routerContext} />
          </InitialStateContext.Provider>
        </ErrorContext.Provider>
      </HelmetProvider>
    </StrictMode>,
    {
      onError(error: unknown) {
        getLogger().error("renderToReadableStream error", error);
      },
    },
  );
  await stream.allReady;

  const { start, end } = html({
    helmet: helmetContext.helmet,
    initialState,
    error,
    devPort,
  });

  const encoder = new TextEncoder();
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

/**
 * The application's state on the server when handling a request.
 */
export interface State<
  /** The initial state that is used to render the application. */
  SharedState extends Record<string | number, unknown> = Record<
    string | number,
    unknown
  >,
> {
  /**
   * The initial state that is used to render the application.
   * It will be serialized and sent to the browser.
   * These initialState can be accessed from the React application using `useInitialState`.
   */
  initialState: SharedState;
  /** A function that renders the application to a readable stream and responds to the request with it. */
  render: () => Promise<void>;
}

/**
 * An interface for registering middleware that will run when certain HTTP methods and paths are requested.
 * as well as provides a way to parameterize paths of the requested paths.
 * This should be used for routers that could render the application.
 */
export class Router<
  /** The initial state that is used to render the application. */
  SharedState extends Record<string | number, unknown> = Record<
    string | number,
    unknown
  >,
  RouterState extends oak.State = Record<string, unknown>,
> extends oak.Router<RouterState & { app: State<SharedState> }> {}

/**
 * Provides context about the current request and response to middleware functions.
 * This should be used when in handlers that could render the application.
 */
export type Context<
  SharedState extends Record<string | number, unknown> = Record<
    string | number,
    unknown
  >,
  ContextState extends ApplicationState = oak.State,
  ApplicationState extends oak.State = Record<string, unknown>,
> = oak.Context<
  ContextState & { app: State<SharedState> },
  ApplicationState
>;

/** The options for creating the application. */
export interface ApplicationOptions<
  SharedState extends Record<string | number, unknown> = Record<
    string | number,
    unknown
  >,
  ApplicationState extends oak.State = Record<string, unknown>,
> {
  /**
   * The application's default initial state.
   * The initial state will be serialized and sent to the browser.
   * Data can be added to it before the application is rendered.
   * These initialState can be accessed from the React application using `useInitialState`.
   */
  initialState?: SharedState;
  /**
   * The React Router route for the application.
   * The build script will automatically generate this for your application's routes.
   * The route object is the default export from the `_main.tsx` file in the routes directory.
   */
  route: RouteObject;
  /**
   * The Oak router for the application.
   * The build script will automatically generate this for your application's routes.
   * The router object is the default export from the `_main.ts` file in the routes directory.
   */
  router: Router<SharedState, ApplicationState>;
  /**
   * The working directory of the application.
   * Defaults to the current working directory that the application is running from.
   */
  workingDirectory?: string;
  /** The port for the dev task's live reload server. Defaults to 9001. */
  devPort?: number;
}

const TRAILING_SLASHES = /\/+$/;

/** An application server. */
export class Application<
  SharedState extends Record<string | number, unknown> = Record<
    string | number,
    unknown
  >,
  ApplicationState extends oak.State = Record<string, unknown>,
> extends oak.Application<ApplicationState & { app: State<SharedState> }> {
  constructor(options: ApplicationOptions<SharedState, ApplicationState>) {
    const {
      initialState,
      route,
      router,
      workingDirectory: _workingDirectory,
      devPort,
      ...superOptions
    } = options;
    super(superOptions);
    const workingDirectory = _workingDirectory ?? Deno.cwd();
    const handler = createStaticHandler([route]);

    const appRouter = new Router<SharedState, ApplicationState>()
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
      .use(async (context: Context<SharedState, ApplicationState>, next) => {
        const { response, state } = context;
        let error: HttpError | undefined = undefined;
        try {
          if (!state.app) {
            state.app = {
              initialState: structuredClone(initialState) ?? {} as SharedState,
              render: async () => {
                response.type = "html";
                response.body = await renderAppToReadableStream!(context, {
                  route,
                  handler,
                  error,
                  devPort,
                });
              },
            };
          }
          await next();
        } catch (cause) {
          error = HttpError.from(cause);
          getLogger().error("UI route error", error);

          response.status = error.status;
          await state.app.render();
        }
      })
      .use(router.routes(), router.allowedMethods());

    appRouter.get("/(.*)", async (context) => {
      try {
        await context.send({ root: `${workingDirectory}/public` });
      } catch (cause) {
        if (isHttpError(cause) && cause.status === oak.Status.NotFound) {
          throw new HttpError(404, "Not found", { cause });
        } else {
          throw cause;
        }
      }
    });

    this.use(appRouter.routes(), appRouter.allowedMethods());
  }
}

/**
 * This function tells the dev server when the app server is listening.
 * If you are not using serve, you must add an event listener to your app that will call this function once it's listening.
 * If this function is not called, the browser will not automatically refresh when the app server is restarted.
 * If called before the app server is listening, the browser will refresh before the app server is ready to handle the request.
 * This function will not do anything if the app is not running in development mode.
 *
 * ```ts
 * app.addEventListener("listen", ({ hostname, port, secure }) => {
 *   const origin = `${secure ? "https://" : "http://"}${hostname}`;
 *   getLogger().info(`Listening on: ${origin}:${port}`, {
 *     hostname,
 *     port,
 *     secure,
 *   });
 *   queueMicrotask(() =>
 *     listeningDev({ hostname, secure })
 *   );
 * });
 * ```
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
      await fetch(`${origin}:${devPort || 9001}/listening`);
    } catch {
      // Ignore errors
    }
  }
}

/** The options to create and start an application server. */
export type ServeOptions<
  SharedState extends Record<string | number, unknown> = Record<
    string | number,
    unknown
  >,
> = ApplicationOptions<SharedState> & oak.ListenOptions;

/** Creates and starts an application server. */
export async function serve<
  SharedState extends Record<string | number, unknown> = Record<
    string | number,
    unknown
  >,
>(options: ServeOptions<SharedState>) {
  const { port, hostname, secure, signal, ...appOptions } = options;
  const app = new Application(appOptions);

  app.addEventListener("error", ({ error }) => {
    getLogger().error("Uncaught application error", error);
  });

  app.addEventListener("listen", ({ hostname, port, secure }) => {
    const origin = `${secure ? "https://" : "http://"}${hostname}`;
    getLogger().info(`Listening on: ${origin}:${port}`, {
      hostname,
      port,
      secure,
    });
    queueMicrotask(() =>
      listeningDev({ hostname, secure, devPort: options.devPort })
    );
  });

  await app.listen({ port, hostname, secure, signal } as oak.ListenOptions);
}

/**
 * This middleware ensures all errors in the route are HttpError objects.
 * If an error isn't an HttpError, a new HttpError is created with the original error as the cause.
 * If a boundary is specified, it will add the boundary to the HttpError.
 * If an ErrorBoundary exists with a matching boundary, it will be used to handle the error.
 * If a boundary is not specified, the first ErrorBoundary without a boundary specified will handle the error.
 * If a boundary is specified, but no ErrorBoundary exists with a matching boundary, the error will go unhandled.
 *
 * By default, any route that has an ErrorFallback will have an errorBoundary automatically added to it.
 * The automatic error boundaries name will match the route by default.
 * If a route exports a boundary string, that will be used as the errorBoundary's boundary.
 * You can add your own error boundaries anywhere.
 *
 * To ensure an error boundary catches the error, you need to either export a boundary string from your route
 * or your router needs to use the error boundary middleware.
 *
 * ```ts
 * export const boundary = "MyComponentErrorBoundary"
 * ```
 *
 * ```ts
 * const router = new Router()
 *  .use(errorBoundary("MyComponentErrorBoundary"))
 * ```
 *
 * Then the related react component for the route needs to either use `withErrorBoundary` or `ErrorBoundary` to be able to catch the error during rendering.
 * The boundary identifier must match the one on the server.
 *
 * ```tsx
 * const MyComponentSafe = withErrorBoundary(MyComponent, {
 *  FallbackComponent: DefaultErrorFallback,
 *  boundary: "MyComponentErrorBoundary"
 * })
 * ```
 *
 * ```tsx
 * <ErrorBoundary FallbackComponent={DefaultErrorFallback} boundary="MyComponentErrorBoundary">
 *   <MyComponent />
 * </ErrorBoundary>
 * ```
 */
export function errorBoundary<
  RouteParams extends oak.RouteParams<string> = oak.RouteParams<string>,
  /** The initial state that is used to render the application. */
  SharedState extends Record<string | number, unknown> = Record<
    string | number,
    unknown
  >,
  RouterState extends oak.State = Record<string, unknown>,
>(
  boundary?: string,
): oak.RouterMiddleware<
  string,
  RouteParams,
  RouterState & { app: State<SharedState> }
> {
  return async (_context, next) => {
    try {
      await next();
    } catch (cause) {
      const error = HttpError.from<{ boundary?: string }>(cause);
      if (isDevelopment()) error.expose = true;
      if (boundary) error.data.boundary = boundary;
      throw error;
    }
  };
}

/**
 * An Oak router that is used to render the application for get requests.
 * It is used for all route components that do not have their own route middleware.
 * The defaultRouter is not meant to be used directly by the user and is for internal use only.
 */
const defaultRouter = new Router()
  .get("/", async (context: Context) => {
    await context.state.app.render();
  });

/**
 * A representation of the routers for a routes directory.
 * This interface is meant for internal use only.
 */
export interface RouterDefinition<
  SharedState extends Record<string | number, unknown> = Record<
    string | number,
    unknown
  >,
> {
  name: string;
  parent?: RouterDefinition<SharedState>;
  react?: boolean;
  file?: {
    react?: RouteFile;
    oak?: Router<SharedState>;
  };
  main?: {
    react?: RouteFile;
    oak?: Router<SharedState>;
  };
  index?: {
    react?: RouteFile;
    oak?: Router<SharedState>;
  };
  children?: Record<string, RouterDefinition<SharedState>>;
}

export const ROUTE_PARAM = /^\[(.+)]$/;
export const ROUTE_WILDCARD = /^\[\.\.\.\]$/;
export function routePathFromName(name: string, forServer = false): string {
  if (!name) return "";
  return name
    .replace(ROUTE_WILDCARD, forServer ? "(.*)" : "*")
    .replace(ROUTE_PARAM, ":$1");
}
export function routerPathFromName(name: string): string {
  return routePathFromName(name, true);
}

/**
 * Generates an Oak router for a routes directory.
 * The router returned by this function is the default export from the `_main.ts` file in the routes directory.
 * This function is meant for internal use only.
 */
export function generateRouter<
  SharedState extends Record<string | number, unknown> = Record<
    string | number,
    unknown
  >,
>(
  options: RouterDefinition<SharedState>,
  relativePath?: string,
  parentBoundary?: string,
): Router<SharedState> {
  const { name, react, file, main, index, children, parent } = options;

  const router = new Router<SharedState>();
  if (parent?.react && !react) {
    router.use(async ({ request, response }, next) => {
      try {
        await next();
      } catch (cause) {
        const error = HttpError.from(cause);
        getLogger().error("API route error", error);

        response.status = error.status;
        const extname = path.extname(request.url.pathname);
        if (error.status !== 404 || extname === "") {
          response.body = new ErrorResponse(error);
        }
      }
    });
  }

  const currentPath = `${
    relativePath && relativePath !== "/" ? relativePath : ""
  }/${name}`;

  let boundary = parentBoundary;
  if (file) {
    if (file.react && (file.react.ErrorFallback || file.react.boundary)) {
      boundary = file.react.boundary ?? currentPath;
    }

    const boundaryMiddleware = react && errorBoundary(boundary);

    if (file.oak) {
      if (boundaryMiddleware) router.use(boundaryMiddleware);
      router.use(file.oak.routes(), file.oak.allowedMethods());
    } else if (file.react) {
      if (boundaryMiddleware) router.use(boundaryMiddleware);
      router.use(defaultRouter.routes(), defaultRouter.allowedMethods());
    }
  } else {
    if (main?.react && (main.react.ErrorFallback || main.react.boundary)) {
      boundary = main.react.boundary ?? currentPath;
    }
    const boundaryMiddleware = react && errorBoundary(boundary);
    if (boundaryMiddleware) router.use(boundaryMiddleware);

    const mainRouter = main?.oak ?? router;

    if (index) {
      if (index.react && (index.react.ErrorFallback || index.react.boundary)) {
        mainRouter.use(
          errorBoundary(
            index.react.boundary ?? `${currentPath}/index`,
          ),
        );
      } else if (main?.oak && boundaryMiddleware) {
        mainRouter.use(boundaryMiddleware);
      }

      if (index.oak) {
        mainRouter.use("/", index.oak.routes(), index.oak.allowedMethods());
      } else if (react) {
        mainRouter.use(
          "/",
          defaultRouter.routes(),
          defaultRouter.allowedMethods(),
        );
      }

      if (boundaryMiddleware) mainRouter.use(boundaryMiddleware);
    }

    if (children) {
      let notFoundRouter: Router<SharedState> | undefined = undefined;
      for (const [name, child] of Object.entries(children)) {
        child.parent = options;
        const childRouter = generateRouter(
          child,
          currentPath,
          boundary,
        );
        if (name === "[...]") {
          notFoundRouter = childRouter;
        } else {
          mainRouter.use(
            `/${routerPathFromName(name)}`,
            childRouter.routes(),
            childRouter.allowedMethods(),
          );
        }
      }

      if (notFoundRouter) {
        mainRouter.use(
          `/${routerPathFromName("[...]")}`,
          notFoundRouter.routes(),
          notFoundRouter.allowedMethods(),
        );
      }
    }

    if (main?.oak) {
      router.use(mainRouter.routes(), mainRouter.allowedMethods());
    }
  }

  return router;
}
