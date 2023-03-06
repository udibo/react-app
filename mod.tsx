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
  HttpError,
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

export interface HydrateOptions<
  AppContext extends Record<string, unknown> = Record<string, unknown>,
> {
  /**
   * A react router route object.
   * The build script will automatically generate these for your application's routes.
   * The route object is a default export from `_main.tsx` in your routes directory.
   */
  route: RouteObject;
  /** Adds your own providers around the application. */
  Provider?: ComponentType<{ children: ReactNode }>;
  /** A context object for the App. */
  Context?: Context<AppContext>;
}

interface AppOptions<
  AppContext extends Record<string, unknown> = Record<string, unknown>,
> extends HydrateOptions<AppContext> {
  Provider: ComponentType<{ children: ReactNode }>;
  Context: Context<AppContext>;
}

function App<
  AppContext extends Record<string, unknown> = Record<string, unknown>,
>({ route, Provider, Context }: AppOptions<AppContext>) {
  const router = createBrowserRouter([route]);
  const errorJSON = (window as AppWindow).app.error;
  const context = (window as AppWindow<AppContext>).app.context ?? {};
  const appErrorContext = { error: errorJSON && new HttpError(errorJSON) };
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
 * Used to hydrate the app in the browser.
 * Hydration isn't required if you want to do server side rendering only.
 * This function will turn the application into an SPA.
 *
 * If you are using the default configuration, this will load the route generated from your application's routes.
 *
 * ```tsx
 * import { hydrate } from "x/udibo_react_app/app.tsx";
 *
 * import route from "./routes/_main.tsx";
 *
 * hydrate({ route });
 * ```
 *
 * You can optionally add a Provider argument to add your own providers around the application.
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
