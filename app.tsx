import {
  ComponentType,
  lazy as reactLazy,
  LazyExoticComponent,
  ReactNode,
  startTransition,
  StrictMode,
} from "$npm/react";
import { HelmetProvider } from "$npm/react-helmet-async";
import { hydrateRoot } from "$npm/react-dom/client";
import {
  createBrowserRouter,
  RouteObject,
  RouterProvider,
} from "$npm/react-router-dom";

import { AppContext, AppEnvironment, AppWindow } from "./env.ts";
export {
  AppContext,
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
export { HttpError, isHttpError } from "$x/http_error/mod.ts";
export type { HttpErrorOptions } from "$x/http_error/mod.ts";
export {
  AppErrorBoundary,
  DefaultErrorFallback,
  NotFound,
  withAppErrorBoundary,
} from "./error.tsx";
export type { AppErrorBoundaryProps, ErrorBoundaryProps } from "./error.tsx";

export interface AppState<AppContext = Record<string, unknown>> {
  /** A container for application data and functions. */
  app: {
    /**
     * Environment variables that will be shared with the browser.
     */
    env: AppEnvironment;
    /**
     * A container for your application's own data that is serialized and sent to the browser.
     * It can be accessed via AppContext.
     */
    context: AppContext;
    /**
     * If an error occurs when handling the request, this will be set to that error.
     * The error will be serialized and sent to the browser.
     * The browser will recreate the error for an AppErrorBoundary to catch.
     * If the server error is not getting caught, the boundary doesn't match the AppErrorBoundary you expect to catch it.
     */
    error?: HttpError<{ boundary?: string }>;
  };
}

export interface HydrateOptions {
  /**
   * A react router route object.
   * The build script will automatically generate these for your application's routes.
   * The route object is a default export from `_main.tsx` in your routes directory.
   */
  route: RouteObject;
  /** Adds your own providers around the application. */
  Provider?: ComponentType<{ children: ReactNode }>;
}

interface AppOptions extends HydrateOptions {
  Provider: ComponentType<{ children: ReactNode }>;
}

function App({ route, Provider }: AppOptions) {
  const router = createBrowserRouter([route]);
  const errorJSON = (window as AppWindow).app.error;
  const appErrorContext = { error: errorJSON && new HttpError(errorJSON) };
  return (
    <StrictMode>
      <HelmetProvider>
        <AppErrorContext.Provider value={appErrorContext}>
          <AppContext.Provider value={(window as AppWindow).app.context ?? {}}>
            <Provider>
              <RouterProvider router={router} />
            </Provider>
          </AppContext.Provider>
        </AppErrorContext.Provider>
      </HelmetProvider>
    </StrictMode>
  );
}

/**
 * Used to hydrate the app in the browser.
 * Hydration isn't required if you want to do server side rendering only.
 * This function will turn the application into an SPA.
 *
 * If you are using the default configuration, this will load the route generated from your application's routes.
 *
 * ```tsx
 * import { hydrate } from "$x/udibo_react_app/app.tsx";
 *
 * import route from "./routes/_main.tsx";
 *
 * hydrate({ route });
 * ```
 *
 * You can optionally add a Provider argument to add your own providers around the application.
 */
export function hydrate({ route, Provider }: HydrateOptions) {
  const hydrate = () =>
    startTransition(() => {
      hydrateRoot(
        document.body,
        <App
          route={route}
          Provider={Provider ?? (({ children }) => <>{children}</>)}
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
 * A file containing the react component for a route.
 * Optionally, it can export an ErrorFallback that will be used for an AppErrorBoundary on the component.
 */
export type RouteFile = {
  /** The react component for the route. */
  default: ComponentType;
  /** An ErrorFallback for an AppErrorBoundary around the react component for the route. */
  ErrorFallback?: ComponentType<FallbackProps>;
};

/**
 * For internal use only.
 * This is used in the generated _main.tsx file for routes to automatically add error boundaries to routes that have a FallbackComponent.
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
  const boundary = typeof boundaryOrFactory === "string"
    ? boundaryOrFactory
    : undefined;
  if (typeof boundaryOrFactory !== "string") factory = boundaryOrFactory;
  return reactLazy(async () => {
    const { default: Component, ErrorFallback } = await factory!();
    const errorBoundaryProps = {
      FallbackComponent: ErrorFallback,
    } as AppErrorBoundaryProps;
    if (boundary) errorBoundaryProps.boundary = boundary;

    return {
      default: errorBoundaryProps.FallbackComponent
        ? withAppErrorBoundary(Component, errorBoundaryProps)
        : Component,
    };
  });
}
