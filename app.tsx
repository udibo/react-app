import {
  ComponentType,
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

export interface HydrateOptions {
  route: RouteObject;
  Provider?: ComponentType<{ children: ReactNode }>;
}

interface AppOptions extends HydrateOptions {
  Provider: ComponentType<{ children: ReactNode }>;
}

function App({ route, Provider }: AppOptions) {
  const router = createBrowserRouter([route]);

  return (
    <StrictMode>
      <HelmetProvider>
        <AppContext.Provider value={(window as AppWindow).app.context ?? {}}>
          <Provider>
            <RouterProvider router={router} />
          </Provider>
        </AppContext.Provider>
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
