import { HttpError, HttpErrorOptions, isHttpError } from "x/http_error/mod.ts";
import {
  ComponentType,
  createContext,
  isValidElement,
  PropsWithChildren,
  ReactElement,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "npm/react";
import { useLocation } from "npm/react-router-dom";
import { ErrorBoundary } from "npm/react-error-boundary";
import type {
  ErrorBoundaryProps,
  FallbackProps,
} from "npm/react-error-boundary";

import { isDevelopment } from "./env.ts";

export { HttpError, isHttpError };
export type { ErrorBoundaryProps, FallbackProps, HttpErrorOptions };

/**
 * A context object that is used to provide errors on the server to the browser.
 * It takes an object with an optional `error` property, which represents the HttpError that occurred.
 * This context is intended for internal use only.
 */
export const AppErrorContext = createContext<{ error?: HttpError }>({});

export type AppErrorBoundaryProps = ErrorBoundaryProps & {
  /** Used to associate errors on the server side with the boundary when using server side rendering. */
  boundary?: string;
};

/**
 * A component that captures any errors within the boundary.
 * Unlike `ErrorBoundary`, the `AppErrorBoundary` can be used to render errors on the server.
 * For the error on the server to be caught by it, it must have the same `boundary`.
 */
export function AppErrorBoundary(
  props: PropsWithChildren<AppErrorBoundaryProps>,
) {
  const { children, boundary, ...errorBoundaryProps } = props;
  const errorContext = useContext(AppErrorContext);
  const initialError = errorContext.error ?? null;
  const [error, setError] = useState(initialError);

  useEffect(() => {
    return () => {
      if (error) setError(null);
    };
  }, []);

  if (!error || boundary !== error.data.boundary) {
    return (
      <ErrorBoundary
        {...errorBoundaryProps}
      >
        {children}
      </ErrorBoundary>
    );
  }

  delete errorContext.error;

  const fallbackProps = {
    error,
    resetErrorBoundary: (...args: unknown[]) => {
      setError(null);
      errorBoundaryProps.onReset?.(...args);
    },
  } as FallbackProps;

  const { fallback, fallbackRender, FallbackComponent } = errorBoundaryProps;
  if (isValidElement(fallback)) {
    return fallback;
  } else if (typeof fallbackRender === "function") {
    return fallbackRender(fallbackProps);
  } else if (FallbackComponent) {
    return <FallbackComponent {...fallbackProps} />;
  } else {
    throw new Error(
      "AppErrorBoundary requires either a fallback, fallbackRender, or FallbackComponent prop.",
    );
  }
}

/**
 * A higher-order component that wraps a component with an `AppErrorBoundary`. Any errors within the boundary will be captured by it.
 * Unlike `withErrorBoundary`, `withAppErrorBoundary` can be used to render errors on the server.
 * For the error on the server to be caught by it, it must have the same `boundary`.
 */
export function withAppErrorBoundary<P>(
  Component: ComponentType<P>,
  errorBoundaryProps: AppErrorBoundaryProps,
): ComponentType<P> {
  const Wrapped = ((props) => {
    return (
      <AppErrorBoundary {...errorBoundaryProps}>
        <Component
          {
            // deno-lint-ignore no-explicit-any
            ...props as any
          }
        />
      </AppErrorBoundary>
    );
  }) as ComponentType<P>;

  // Format for display in DevTools
  const name = Component.displayName || Component.name || "Unknown";
  Wrapped.displayName = `withAppErrorBoundary(${name})`;

  return Wrapped;
}

/**
 * A hook that automatically resets the error boundary if the location changes.
 * It takes a `reset` function and generates a new reset function that prevents multiple calls to the reset callback.
 */
export function useAutoReset(reset: () => void) {
  const location = useLocation();
  const [initialLocation] = useState(location);

  const resetOnce = useMemo(() => {
    let resetCalled = false;
    return () => {
      if (!resetCalled) {
        resetCalled = true;
        reset();
      }
    };
  }, []);

  useEffect(() => {
    if (location !== initialLocation) resetOnce();
  }, [location]);

  return reset;
}

/**
 * A simple error fallback component that can be used to show the error and provide a button for trying again.
 * It takes a `FallbackProps` object with an `error` property, which represents the error that occurred, and
 * a `resetErrorBoundary` function which is used to reset the error boundary.
 * The error boundary automatically resets if the location changes.
 */
export function DefaultErrorFallback(
  { error, resetErrorBoundary }: FallbackProps,
) {
  const reset = useAutoReset(resetErrorBoundary);

  return (
    <div role="alert">
      <p>{error.message || "Something went wrong"}</p>
      {isDevelopment() && error.stack ? <pre>{error.stack}</pre> : null}
      <button onClick={reset}>Try again</button>
    </div>
  );
}

/**
 * A component that can be used to throw a 404 not found error. It is used as the default wildcard route at the top level of the app.
 */
export function NotFound(): ReactElement {
  throw new HttpError(404, "Not found");
}
