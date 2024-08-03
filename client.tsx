/** @jsxRuntime automatic */
/** @jsxImportSource npm:react@18 */
/** @jsxImportSourceTypes npm:@types/react@18 */
/**
 * This module is meant for internal use only. It contains functions used to render the application.
 * It is only expected to be imported from the `_main.tsx` file in the routes directory that is generated by the build script.
 *
 * @module
 */
import { lazy as reactLazy, startTransition, StrictMode } from "react";
import type { ComponentType, LazyExoticComponent } from "react";
import * as reactHelmetAsync from "react-helmet-async";
const reactHelmetAsyncFixed = reactHelmetAsync;
const { HelmetProvider } = reactHelmetAsyncFixed.default ??
  reactHelmetAsync;
import { hydrateRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import type { RouteObject } from "react-router-dom";

import { type AppWindow, isDevelopment } from "./env.ts";
import { ErrorContext, InitialStateContext } from "./context.ts";
import { HttpError, withErrorBoundary } from "./error.tsx";
import type { ErrorBoundaryProps, FallbackProps } from "./error.tsx";
import { getLogger } from "./log.ts";

/**
 * An interface that defines the configuration for the application's hydration.
 */
export interface HydrateOptions {
  /**
   * A react router route object.
   * The build script will automatically generate this for your application's routes.
   * The route object is the default export from the generated `_main.tsx` file in your routes directory.
   */
  route: RouteObject;
}
type AppOptions = HydrateOptions;

/**
 * A React component used to render the application.
 *
 * @param options - The configuration for rendering the application.
 */
function App<
  AppState extends Record<string | number, unknown> = Record<
    string | number,
    unknown
  >,
>(options: AppOptions) {
  const log = getLogger();
  const { route } = options;
  const router = createBrowserRouter([route]);
  const rawError = (window as AppWindow).app?.error;
  const { stack, ...errorOptions } = rawError ?? {};
  const error = rawError && new HttpError(errorOptions);
  if (error) {
    if (typeof stack === "string") {
      error.stack = stack;
    }
    log.error("Server error", error);
  }

  if (isDevelopment()) {
    const devPort = (window as AppWindow).app?.devPort ?? 9001;
    const source = new EventSource(`http://localhost:${devPort}/live-reload`);
    source.addEventListener("open", () => {
      log.info("Live reload: Waiting for change");
    });
    source.addEventListener("close", () => {
      log.info("Live reload: Stopped");
    });
    source.addEventListener("error", (event) => {
      log.error("Live reload: Error", event);
    });
    source.addEventListener("reload", () => {
      log.info("Live reload: Reloading");
      location.reload();
    });

    globalThis.addEventListener("beforeunload", () => source.close());
  }

  const initialState = (window as AppWindow<AppState>).app?.initialState ??
    {} as AppState;
  const appErrorContext = { error };
  return (
    <StrictMode>
      <HelmetProvider>
        <ErrorContext.Provider value={appErrorContext}>
          <InitialStateContext.Provider value={initialState}>
            <RouterProvider router={router} />
          </InitialStateContext.Provider>
        </ErrorContext.Provider>
      </HelmetProvider>
    </StrictMode>
  );
}

/**
 * This function is used to hydrate the application in the browser.
 * It turns the server-rendered application into a single-page application (SPA).
 * Hydration is not required if only server-side rendering is desired.
 *
 * Example usage:
 * ```tsx
 * import { hydrate } from "@udibo/react-app";
 * import route from "./routes/_main.tsx";
 *
 * hydrate({ route });
 * ```
 *
 * @param options - The configuration for the application's hydration.
 *   - `route`: A react router route object. The build script will automatically generate this for your application's routes.
 *              The route object is the default export from the generated `_main.tsx` file in your routes directory.
 */
export function hydrate<
  AppState extends Record<string | number, unknown> = Record<
    string | number,
    unknown
  >,
>(options: HydrateOptions): void {
  const { route } = options;
  const hydrate = () =>
    startTransition(() => {
      hydrateRoot(
        document.getElementById("root"),
        <App<AppState> route={route} />,
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
 * It can optionally export an `ErrorFallback` or `boundary` that will be used for an `ErrorBoundary` around the react component that it exports by default.
 */
export type RouteFile = {
  /** The react component for the route. */
  default: ComponentType;
  /** An ErrorFallback for an ErrorBoundary around the react component for the route. */
  ErrorFallback?: ComponentType<FallbackProps>;
  /** The boundary used by the route. If there is an ErrorFallback exported, exporting a boundary will override the default boundary. */
  boundary?: string;
};

/**
 * A function used to lazily load a component. This function takes in a factory that returns a Promise that resolves to a React component.
 * The purpose of this function is to automatically add error boundaries to routes with an `ErrorFallback` or `boundary` export.
 * This function is intended for internal use only, and is typically used in the generated `_main.tsx` file for a routes directory.
 *
 * @param boundary - The boundary used by the route being imported.
 * @param factory - A factory that returns a Promise that resolves to a React component.
 * @returns A React component that is lazily loaded.
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
    try {
      const { default: Component, ErrorFallback, boundary: boundaryOverride } =
        await factory!();
      const errorBoundaryProps = {
        FallbackComponent: ErrorFallback,
      } as ErrorBoundaryProps;
      if (boundaryOverride) boundary = boundaryOverride;
      if (boundary) errorBoundaryProps.boundary = boundaryOverride ?? boundary;

      return {
        default: errorBoundaryProps.FallbackComponent
          ? withErrorBoundary(Component, errorBoundaryProps)
          : Component,
      };
    } catch (error) {
      const log = getLogger();
      log.error("Error loading component", error, { boundary });
      window.location.reload();
      throw error;
    }
  });
}
