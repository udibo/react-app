import { HttpError, HttpErrorOptions, isHttpError } from "x/http_error/mod.ts";
import {
  ComponentType,
  createContext,
  isValidElement,
  PropsWithChildren,
  ReactElement,
  useContext,
  useEffect,
  useState,
} from "npm/react";
import { useLocation } from "npm/react-router-dom";
import { ErrorBoundary } from "npm/react-error-boundary";
import type {
  ErrorBoundaryProps,
  FallbackProps,
} from "npm/react-error-boundary";

export { HttpError, isHttpError };
export type { ErrorBoundaryProps, FallbackProps, HttpErrorOptions };

/**
 * For internal use only.
 * Used to provider errors on the server to the browser.
 */
export const AppErrorContext = createContext<{ error?: HttpError }>({});

export type AppErrorBoundaryProps = ErrorBoundaryProps & {
  /** Used to associate errors on the server side with the boundary when using server side rendering. */
  boundary?: string;
};

/**
 * Any errors within the boundary will be captured by it.
 * Unlike ErrorBoundary, the AppErrorBoundary can be used to render errors on the server.
 * For the error on the server to be caught by it, it must have the same boundary.
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
 * Wraps a component with an AppErrorBoundary.
 * Any errors within the boundary will be captured by it.
 * Unlike withErrorBoundary, withAppErrorBoundary can be used to render errors on the server.
 * For the error on the server to be caught by it, it must have the same boundary.
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
 * A simple error fallback that will show the error and provide a button for trying again.
 * The error will clear when clicking the try again button or navigating to a different route.
 */
export function DefaultErrorFallback(
  { error, resetErrorBoundary }: FallbackProps,
) {
  const location = useLocation();
  const [initialLocation] = useState(location);
  useEffect(() => {
    if (location !== initialLocation) resetErrorBoundary();
  }, [location]);

  return (
    <div role="alert">
      <p>Something went wrong:</p>
      <pre>{error.message}</pre>
      {isHttpError(error) && error.status !== 404
        ? <button onClick={resetErrorBoundary}>Try again</button>
        : null}
    </div>
  );
}

/**
 * This component can be used to throw a 404 not found error.
 * It's used as the default wildcard route at the top level of your app.
 */
export function NotFound(): ReactElement {
  throw new HttpError(404, "Not found");
}
