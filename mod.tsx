import {
  ComponentType,
  Context,
  lazy as reactLazy,
  LazyExoticComponent,
  ReactNode,
  startTransition,
  StrictMode,
} from "npm/react";
import { HelmetProvider } from "npm/react-helmet-async";
import { hydrateRoot } from "npm/react-dom/client";
import {
  createBrowserRouter,
  RouteObject,
  RouterProvider,
} from "npm/react-router-dom";

import { AppWindow, createAppContext } from "./env.ts";
export {
  createAppContext,
  getEnv,
  isBrowser,
  isDevelopment,
  isProduction,
  isServer,
  isTest,
} from "./env.ts";
export type { AppEnvironment } from "./env.ts";
import {
  AppErrorBoundaryProps,
  AppErrorContext,
  FallbackProps,
  HttpError,
  withAppErrorBoundary,
} from "./error.tsx";
export {
  AppErrorBoundary,
  DefaultErrorFallback,
  ErrorResponse,
  HttpError,
  isErrorResponse,
  isHttpError,
  NotFound,
  useAutoReset,
  withAppErrorBoundary,
} from "./error.tsx";
export type {
  AppErrorBoundaryProps,
  ErrorBoundaryProps,
  FallbackProps,
  HttpErrorOptions,
} from "./error.tsx";

/**
 * An interface that defines the configuration for the application's hydration.
 */
export interface HydrateOptions<
  AppContext extends Record<string, unknown> = Record<string, unknown>,
> {
  /**
   * A react router route object.
   * The build script will automatically generate this for your application's routes.
   * The route object is a default export from `_main.tsx` in your routes directory.
   */
  route: RouteObject;
  /** A React Component that wraps the entire application. */
  Provider?: ComponentType<{ children: ReactNode }>;
  /** A context object for the App. */
  Context?: Context<AppContext>;
}

/** An interface that extends `HydrateOptions` and is used to configure the App Component. */
interface AppOptions<
  AppContext extends Record<string, unknown> = Record<string, unknown>,
> extends HydrateOptions<AppContext> {
  Provider: ComponentType<{ children: ReactNode }>;
  Context: Context<AppContext>;
}

/**
 * A React component used to render the application.
 */
function App<
  AppContext extends Record<string, unknown> = Record<string, unknown>,
>({ route, Provider, Context }: AppOptions<AppContext>) {
  const router = createBrowserRouter([route]);
  const rawError = (window as AppWindow).app.error;
  const { stack, ...errorOptions } = rawError ?? {};
  const error = rawError && new HttpError(errorOptions);
  if (error) {
    if (typeof stack === "string") {
      error.stack = stack;
    }
    console.error(error);
  }

  const context = (window as AppWindow<AppContext>).app.context ?? {};
  const appErrorContext = { error };
  return (
    <StrictMode>
      <HelmetProvider>
        <AppErrorContext.Provider value={appErrorContext}>
          <Context.Provider value={context}>
            <Provider>
              <RouterProvider router={router} />
            </Provider>
          </Context.Provider>
        </AppErrorContext.Provider>
      </HelmetProvider>
    </StrictMode>
  );
}

/**
 * This function is used to hydrate the application in the browser.
 * It turns the server rendered application into a single-page application (SPA).
 * Hydration is not required if only server-side rendering is desired.
 *
 * If the default configuration is used, this function will load the route generated from the application's routes.
 *
 * ```tsx
 * import { hydrate } from "x/udibo_react_app/app.tsx";
 *
 * import route from "./routes/_main.tsx";
 *
 * hydrate({ route });
 * ```
 *
 * An optional Provider argument can be used to include customer providers around the application.
 */
export function hydrate<
  AppContext extends Record<string, unknown> = Record<string, unknown>,
>({ route, Provider, Context }: HydrateOptions<AppContext>) {
  const hydrate = () =>
    startTransition(() => {
      hydrateRoot(
        document.body,
        <App
          route={route}
          Provider={Provider ?? (({ children }) => <>{children}</>)}
          Context={Context ?? createAppContext<AppContext>()}
        />,
      );
    });

  if (typeof requestIdleCallback !== "undefined") {
    requestIdleCallback(hydrate);
  } else {
    // Safari doesn't support requestIdleCallback
    // https://caniuse.com/requestidlecallback
    setTimeout(hydrate, 1);
  }
}

/**
 * An interface that defines a route file.
 * A route file exports a react component by default.
 * It can optionally export an `ErrorFallback` or `boundary` that will be used for an `AppErrorBoundary` around the react component that it exports by default.
 */
export type RouteFile = {
  /** The react component for the route. */
  default: ComponentType;
  /** An ErrorFallback for an AppErrorBoundary around the react component for the route. */
  ErrorFallback?: ComponentType<FallbackProps>;
  /** The boundary used by the route. If there is an ErrorFallback exported, exporting a boundary will override the default boundary. */
  boundary?: string;
};

/**
 * A function used to lazily load a component. This function takes in a factory that returns Promise that resolves to a React component.
 * The purpose of this function is to automatically add error boundaries to routes with an `ErrorFallback` or `boundary` export.
 * This function is intended for internal use only, and is typically used in the generated `_main.tsx` file for a routes directory.
 */
export function lazy<
  T extends RouteFile,
>(factory: () => Promise<T>): LazyExoticComponent<ComponentType>;
export function lazy<
  T extends RouteFile,
>(
  boundary: string,
  factory: () => Promise<T>,
): LazyExoticComponent<ComponentType>;
export function lazy<
  T extends RouteFile,
>(
  boundaryOrFactory?: string | (() => Promise<T>),
  factory?: () => Promise<T>,
): LazyExoticComponent<ComponentType> {
  let boundary = typeof boundaryOrFactory === "string"
    ? boundaryOrFactory
    : undefined;
  if (typeof boundaryOrFactory !== "string") factory = boundaryOrFactory;
  return reactLazy(async () => {
    const { default: Component, ErrorFallback, boundary: boundaryOverride } =
      await factory!();
    const errorBoundaryProps = {
      FallbackComponent: ErrorFallback,
    } as AppErrorBoundaryProps;
    if (boundaryOverride) boundary = boundaryOverride;
    if (boundary) errorBoundaryProps.boundary = boundaryOverride ?? boundary;

    return {
      default: errorBoundaryProps.FallbackComponent
        ? withAppErrorBoundary(Component, errorBoundaryProps)
        : Component,
    };
  });
}
