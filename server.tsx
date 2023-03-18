import {
  Application,
  Context,
  ListenOptions,
  RouteParams,
  Router,
  RouterMiddleware,
  Status,
} from "x/oak/mod.ts";
import {
  ComponentType,
  Context as ReactContext,
  ReactNode,
  StrictMode,
} from "npm/react";
import { HelmetContext, HelmetProvider } from "npm/react-helmet-async";
import { renderToReadableStream as renderReactToReadableStream } from "npm/react-dom/server";
import {
  createMemoryRouter,
  RouteObject,
  RouterProvider,
} from "npm/react-router-dom";
import serialize from "npm/serialize-javascript";

import { AppErrorContext, HttpError, isHttpError } from "./error.tsx";
import {
  AppEnvironment,
  createAppContext,
  getEnv,
  isBrowser,
  isDevelopment,
  isTest,
} from "./env.ts";

if (isBrowser()) {
  throw new Error("Cannot import server.tsx in the browser.");
}

const encoder = new TextEncoder();

/**
 * An interface that defines the configuration for generating the HTML that wraps the server-side rendered react application.
 */
interface HTMLOptions<
  AppContext extends Record<string, unknown> = Record<string, unknown>,
> {
  helmet: HelmetContext.HelmetServerState;
  env: AppEnvironment;
  context: AppContext;
  devPort?: number;
  error?: HttpError<{ boundary?: string }>;
}

/** Generates the HTML that wraps the server-side rendered react application. */
function html<
  AppContext extends Record<string, unknown> = Record<string, unknown>,
>(
  { helmet, env, context, devPort, error }: HTMLOptions<AppContext>,
) {
  const errorJSON = HttpError.json(error);
  if (isDevelopment()) {
    if (error?.expose) errorJSON.expose = error.expose;
    if (error instanceof Error) {
      errorJSON.stack = error.stack;
    }
  }

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
    `<script>window.app.error = ${serialize(errorJSON)};</script>`,
    isDevelopment() && devPort &&
    `<script>window.app.devPort = ${
      serialize(devPort, { isJSON: true })
    };</script>`,
    isDevelopment() && `<script src="/live-reload.js"></script>`,
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

/**
 * Renders a React app to a readable stream that can be returned to the client.
 * This is the default `renderToReadableStream` used for rendering React apps.
 */
export async function renderToReadableStream<
  AppContext extends Record<string, unknown> = Record<string, unknown>,
>(
  context: Context<AppState<AppContext>>,
) {
  const { request, state } = context;
  const { route, providerFactory, Context } = state._app;
  const Provider = providerFactory(context);
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
          <Context.Provider value={appContext}>
            <Provider>
              <RouterProvider router={router} />
            </Provider>
          </Context.Provider>
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

/**
 * A record of application state when handling a request.
 */
export interface AppState<AppContext = Record<string, unknown>> {
  /** Application state that is meant for internal use only. */
  _app: {
    route: RouteObject;
    providerFactory: (
      context: Context<AppState<AppContext>>,
    ) => ComponentType<{ children: ReactNode }>;
    Context: ReactContext<AppContext>;
  };
  /** A container for the application's data and functions. */
  app: {
    /**
     * An object containing environment variables that will be shared with the browser.
     */
    env: AppEnvironment;
    /**
     * A container for the application's data that will be serialized and sent to the browser.
     * This data can be accessed via the `AppContext`.
     */
    context: AppContext;
    /** A function that renders the application to a readable stream and responds to the request with it. */
    render: () => Promise<void>;
    /** The port for the dev script's live reload server. */
    devPort?: number;
    /**
     * If an error occurs when handling the request, this property will be set to that error.
     * The error will be serialized and sent to the browser.
     * The browser will recreate the error for an `AppErrorBoundary` to catch.
     * If the server error is not getting caught, the boundary doesn't match the `AppErrorBoundary` you expect to catch it.
     */
    error?: HttpError<{ boundary?: string }>;
  };
}

/**
 * The default function for creating a provider for the application.
 */
function defaultProviderFactory<
  AppContext extends Record<string, unknown> = Record<string, unknown>,
>(
  context: Context<AppState<AppContext>>,
): ComponentType<{ children: ReactNode }> {
  return (({ children }) => <>{children}</>);
}

/** An interface that represents the options for creating an App Router. */
export interface AppRouterOptions<
  AppContext extends Record<string, unknown> = Record<string, unknown>,
> {
  /**
   * A react router route object.
   * The build script will automatically generate this for your application's routes.
   * The route object is a default export from `_main.tsx` in your routes directory.
   */
  route: RouteObject;
  /**
   * Default environment variables that you would like to share with the browser for all requests.
   */
  env?: AppEnvironment;
  /** Creates a provider that wraps the entire application. */
  providerFactory?: (
    context: Context<AppState<AppContext>>,
  ) => ComponentType<{ children: ReactNode }>;
  /** A context object for the App. State stored within the AppContext will be serialized and shared with the browser. */
  Context?: ReactContext<AppContext>;
  /**
   * A function used to render the application to a readable stream.
   * If you'd like to transform the stream before it is returned to the client,
   * you can wrap the default `renderToReadableStream` to pipe it through a transform stream.
   *
   * For example, the following `renderToReadableStream` function uses the default function
   * then pipe's it through a transform stream that adds a tailwindcss style sheet to the head of the HTML page using twind.
   *
   * ```ts
   * async renderToReadableStream(context: Context<AppState>) {
   *   return (await renderToReadableStream(context))
   *     .pipeThrough(new TwindStream(tw));
   * }
   * ```
   */
  renderToReadableStream?: typeof renderToReadableStream<AppContext>;
  /**
   * The Oak router for the application.
   * The router object will be generated automatically for the application's routes.
   * The object is the default export from the `_main.ts` file in the routes directory.
   */
  router?: Router;
  /**
   * The working directory of the application.
   * Defaults to the current working directory that the application is running from.
   */
  workingDirectory?: string;
  /** The port for the dev script's live reload server. */
  devPort?: number;
}

const TRAILING_SLASHES = /\/+$/;

/**
 * Creates an Oak router for your application.
 */
export function createAppRouter<
  AppContext extends Record<string, unknown> = Record<string, unknown>,
>(
  {
    route,
    env,
    providerFactory,
    Context,
    renderToReadableStream: renderAppToReadableStream,
    router,
    workingDirectory,
    devPort,
  }: AppRouterOptions<AppContext>,
) {
  renderAppToReadableStream ??= renderToReadableStream;
  router ??= new Router();
  workingDirectory ??= Deno.cwd();
  providerFactory ??= defaultProviderFactory;
  Context ??= createAppContext<AppContext>();

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
            providerFactory: providerFactory!,
            Context: Context!,
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
        const error = HttpError.from(cause);
        console.error("app error", error);

        response.status = error.status;
        state.app.error = error;
        await state.app.render();
      }
    })
    .use(router.routes(), router.allowedMethods());

  if (isDevelopment()) {
    let liveReloadScript = "";
    appRouter.use(async (context, next) => {
      const { request, response } = context;
      if (request.url.pathname === "/live-reload.js") {
        if (!liveReloadScript) {
          liveReloadScript = await (await fetch(
            new URL("./live-reload.js", import.meta.url),
          )).text();
        }
        response.headers.set("Content-Type", "text/javascript");
        response.body = liveReloadScript;
      } else {
        await next();
      }
    });
  }

  appRouter.get("/(.*)", async (context) => {
    try {
      await context.send({ root: `${workingDirectory}/public` });
    } catch (cause) {
      if (isHttpError(cause) && cause.status === Status.NotFound) {
        throw new HttpError(404, "Not found", { cause });
      } else {
        throw cause;
      }
    }
  });

  return appRouter;
}

/** Creates a Udibo React App. */
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
  /** The port your application will listen on. */
  port?: number;
}

/** Creates and serves a Udibo React App. */
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

/**
 * Wraps an API router with an error handler that responds with the error in json format.
 */
export function createApiRouter(router: Router) {
  return new Router()
    .use(async ({ response }, next) => {
      try {
        await next();
      } catch (cause) {
        const error = HttpError.from(cause);
        console.error("api error", error);

        response.status = error.status;
        response.body = HttpError.json(error);
      }
    })
    .use(router.routes(), router.allowedMethods());
}

/**
 * An Oak router that is used to render the application for get requests.
 * It is used for all route components that do not have their own route middleware.
 * The defaultRouter is not meant to be used directly by the user and is for internal use only.
 */
export const defaultRouter = new Router()
  .get("/", async (context: Context<AppState>) => {
    await context.state.app.render();
  });

/**
 * This middleware ensures all errors in the route are HttpErrors.
 * If an error isn't an HttpError, a new HttpError is created with it as the cause.
 * If a boundary is specified, it will add the boundary to the HttpError.
 * If an AppErrorBoundary exists with a matching boundary, it will be used to handle the error.
 * If a boundary is not specified, the first AppErrorBoundary without a boundary specified will handle the error.
 * If a boundary is specified, but no AppErrorBoundary exists with a matching boundary, the error will go unhandled.
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
 * Then the related react component for the route needs to either use `withAppErrorBoundary` or `AppErrorBoundary` to be able to catch the error during rendering.
 * The boundary identifier must match the one on the server.
 *
 * ```tsx
 * const MyComponentSafe = withAppErrorBoundary(MyComponent, {
 *  FallbackComponent: DefaultErrorFallback,
 *  boundary: "MyComponentErrorBoundary"
 * })
 * ```
 *
 * ```tsx
 * <AppErrorBoundary FallbackComponent={DefaultErrorFallback} boundary="MyComponentErrorBoundary">
 *   <MyComponent />
 * </AppErrorBoundary>
 * ```
 */
export function errorBoundary<
  P extends RouteParams<string> = RouteParams<string>,
  S extends AppState = AppState,
>(boundary?: string): RouterMiddleware<string, P, S> {
  return async (context, next) => {
    const { response, state } = context;
    const { app } = state;
    try {
      await next();
    } catch (cause) {
      const error = HttpError.from<{ boundary?: string }>(cause);
      if (isDevelopment()) error.expose = true;
      app.error = error;
      if (boundary) error.data.boundary = boundary;
      response.status = error.status;
      await state.app.render();
    }
  };
}
