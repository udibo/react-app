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

import { AppContext, AppWindow } from "./env.ts";
import {
  AppErrorBoundaryProps,
  AppErrorContext,
  FallbackProps,
  HttpError,
  withAppErrorBoundary,
} from "./error.tsx";

export interface HydrateOptions {
  route: RouteObject;
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

export type RouteFile = {
  default: ComponentType;
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
