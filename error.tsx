import { HttpError, HttpErrorOptions, isHttpError } from "$x/http_error/mod.ts";
import {
  ComponentType,
  createContext,
  isValidElement,
  PropsWithChildren,
  ReactElement,
  useContext,
  useEffect,
  useState,
} from "$npm/react";
import { ErrorBoundary, withErrorBoundary } from "$npm/react-error-boundary";
import type {
  ErrorBoundaryProps,
  FallbackProps,
} from "$npm/react-error-boundary";

export { ErrorBoundary, HttpError, isHttpError, withErrorBoundary };
export type { ErrorBoundaryProps, FallbackProps, HttpErrorOptions };

export const AppErrorContext = createContext<{ error?: HttpError }>({});

export type AppErrorBoundaryProps = ErrorBoundaryProps & { boundary?: string };

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
 * This component can be used to throw a 404 not found error.
 * It's used as the default wildcard route at the top level of your app.
 */
export function NotFound(): ReactElement {
  throw new HttpError(404, "Not found");
}
