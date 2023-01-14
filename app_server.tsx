import * as path from "$std/path/mod.ts";
import { isHttpError } from "$x/http_error/mod.ts";
import {
  Application,
  Context,
  etag,
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

import { AppContext, AppEnvironment, getEnv, isTest } from "./env.ts";

const encoder = new TextEncoder();

export interface HTMLOptions<
  AppContext extends Record<string, unknown> = Record<string, unknown>,
> {
  helmet: HelmetContext.HelmetServerState;
  env: AppEnvironment;
  context: AppContext;
}

function html<
  AppContext extends Record<string, unknown> = Record<string, unknown>,
>(
  { helmet, env, context }: HTMLOptions<AppContext>,
) {
  const headTags = [
    helmet.base.toString(),
    helmet.title.toString(),
    helmet.priority.toString(),
    helmet.meta.toString(),
    helmet.link.toString(),
    helmet.style.toString(),
    helmet.script.toString(),
    helmet.noscript.toString(),
  ].filter((tag: string) => Boolean(tag));

  return {
    start: `\
<!DOCTYPE html>
<html ${helmet.htmlAttributes.toString()}>
  <head>
    ${headTags.join("\n    ")}
    <script>
      window.app = {
        env: ${serialize(env, { isJSON: true })},
        context: ${serialize(context, { isJSON: true })},
      };
    </script>
    <script type="module" src="/${
      isTest() ? "test/" : ""
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
  const { env, context: appContext } = state.app;
  const { pathname, search } = request.url;
  const location = `${pathname}${search}`;
  const helmetContext = {} as HelmetContext;

  const router = createMemoryRouter([route], {
    initialEntries: [location],
  });

  const stream = await renderReactToReadableStream(
    <StrictMode>
      <HelmetProvider context={helmetContext}>
        <AppContext.Provider value={appContext}>
          <Provider>
            <RouterProvider router={router} />
          </Provider>
        </AppContext.Provider>
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
        }
        await next();
      } catch (error) {
        console.error("app error", error);

        response.status = isHttpError(error) ? error.status : 500;
        if (path.extname(request.url.pathname) === "") {
          // put error on state.app
          // maybe state.app.error = // json for error
          // implement AppError in error.ts
          await state.app.render();
        }
      }
    })
    .use(router.routes(), router.allowedMethods())
    .get("/(.*)", async (context: Context<AppState<unknown>>, next) => {
      const { request, response, state } = context;
      if (path.extname(request.url.pathname) === "") {
        response.status = 404;
        await state.app.render();
      } else {
        await next();
      }
    })
    .use(async (context) => {
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
  });

  const listenOptions = {} as ListenOptions;
  if (typeof port === "number") listenOptions.port = port;
  await app.listen(listenOptions);
}

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

export interface Middleware<
  P extends RouteParams<string> = RouteParams<string>,
  S extends AppState = AppState,
> {
  type: MiddlewareType;
  middlewares: RouterMiddleware<string, P, S>[];
}

export function middleware<
  P extends RouteParams<string> = RouteParams<string>,
  S extends AppState = AppState,
>(
  type: MiddlewareType,
  ...middlewares: RouterMiddleware<string, P, S>[]
): Middleware<P, S> {
  return { type, middlewares };
}

export function addMiddleware<
  P extends RouteParams<string> = RouteParams<string>,
  S extends AppState = AppState,
>(router: Router, ...middlewares: Middleware<P, S>[]) {
  for (const entry of middlewares) {
    const [middleware, ...middlewares] = entry.middlewares;
    router[entry.type as "all"]("/", middleware, ...middlewares);
  }
}

export const defaultRouter = new Router()
  .get("/", async (context: Context<AppState>) => {
    await context.state.app.render();
  });
