/** @jsxRuntime automatic */
/** @jsxImportSource npm:react@18 */
/** @jsxImportSourceTypes npm:@types/react@18 */
/**
 * This module provides utilities for handling errors in a React application.
 * It includes the http-error module for creating and handling HTTP errors.
 *
 * @module
 */
import {
  ErrorResponse,
  HttpError,
  isErrorResponse,
  isHttpError,
} from "@udibo/http-error";
import type { HttpErrorOptions } from "@udibo/http-error";
import {
  isValidElement,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type {
  ComponentType,
  PropsWithChildren,
  ReactElement,
  ReactNode,
} from "react";
import { useLocation } from "react-router-dom";
import { ErrorBoundary as ReactErrorBoundary } from "react-error-boundary";
import type {
  ErrorBoundaryProps as ReactErrorBoundaryProps,
  FallbackProps,
} from "react-error-boundary";

import { isDevelopment } from "./env.ts";
import { ErrorContext } from "./context.ts";

export { ErrorResponse, HttpError, isErrorResponse, isHttpError };
export type { FallbackProps, HttpErrorOptions };

/** The props for an application error boundary. */
export type ErrorBoundaryProps = ReactErrorBoundaryProps & {
  /** Used to associate errors on the server side with the boundary when using server side rendering. */
  boundary?: string;
};

/**
 * A component that captures any errors within the boundary.
 * For an error on the server to be caught by it, it must have the same `boundary` property.
 *
 * This component can either be used directly or as a higher-order component with the `withErrorBoundary` function.
 *
 * If your route is exporting an `ErrorFallback` component, you don't need to use this component directly.
 * Your route component will be automatically wrapped with an error boundary.
 *
 * In the following example, the `DisplayId` component will throw a 400 bad request error if the id is not a positive integer.
 * If an error occurs, it will be caught by the `ErrorBoundary` and the `ErrorFallback` component will be rendered.
 *
 * ```tsx
 * import { useParams } from "react-router-dom";
 * import { ErrorBoundary, DefaultErrorFallback, HttpError } from "@udibo/react-app";
 *
 * export const boundary = "MyPage";
 * export const ErrorFallback = DefaultErrorFallback;
 *
 * export defualt function DisplayId(): ReactElement {
 *   const params = useParams();
 *   const id = Number(params.id);
 *   if (isNaN(id) || Math.floor(id) !== id || id < 0) {
 *     throw new HttpError(400, "Invalid id");
 *   }
 *   return (
 *     <>
 *       <h2>Id</h2>
 *       <p>{id}</p>
 *     </>
 *   );
 * }
 * ```
 *
 * If no boundary parameter is provided to the component, it will capture any errors that occur within it that are not captured already.
 * This should only be used without a boundary at the top level of the app.
 *
 * ```tsx
 * import { ErrorBoundary, DefaultErrorFallback } from "@udibo/react-app";
 * import { Outlet } from "react-router-dom";
 *
 * import { Loading } from "../components/Loading.tsx";
 *
 * export default function Main(): ReactElement {
 *   return (
 *     <>
 *       <h1>My App</h1>
 *       <Suspense fallback={<Loading />}>
 *         <ErrorBoundary FallbackComponent={DefaultErrorFallback}>
 *           <Outlet />
 *         </ErrorBoundary>
 *       </Suspense>
 *     </>
 *   );
 * }
 * ```
 *
 * If you'd like to nest an error boundary within your route component, you can use the `boundary` prop to associate errors with it.
 *
 * In the following example, the `DisplayId` component will throw a 400 bad request error if the id is not a positive integer.
 * If an error occurs, it will be caught by the `ErrorBoundary` within the `MyPage` component and the `DefaultErrorFallback` component will be rendered.
 *
 * ```tsx
 * import { useParams } from "react-router-dom";
 * import { ErrorBoundary, DefaultErrorFallback, HttpError } from "@udibo/react-app";
 *
 * export const boundary = "MyPage";
 *
 * function DisplayId(): ReactElement {
 *   const params = useParams();
 *   const id = Number(params.id);
 *   if (isNaN(id) || Math.floor(id) !== id || id < 0) {
 *     throw new HttpError(400, "Invalid id");
 *   }
 *   return (
 *     <>
 *       <h2>Id</h2>
 *       <p>{id}</p>
 *     </>
 *   );
 * }
 *
 * export defualt function MyPage(): ReactElement {
 *   return (
 *     <div>
 *       <h1>My Component</h1>
 *       <ErrorBoundary
 *         FallbackComponent={DefaultErrorFallback}
 *         boundary={boundary}
 *       >
 *         <DisplayId />
 *       </ErrorBoundary>
 *     </div>
 *   );
 * }
 * ```
 *
 * Because a boundary string is exported from that route, error boundary middleware will automatically be added to the server side route
 * to capture any errors that occur within it and associate them with that boundary.
 *
 * In the following example, the route will throw a 400 bad request error if the id is not a positive integer.
 * It will be associated with the `MyPage` boundary.
 *
 * ```ts
 * import { HttpError } from "@udibo/react-app";
 * import { ServerState } from "@udibo/react-app/server";
 * import { Router } from "@oak/oak";
 *
 * export default new Router<ServerState>()
 *   .get("/", async (context) => {
 *     const { state, params } = context;
 *     const id = Number(params.id);
 *     if (isNaN(id) || Math.floor(id) !== id || id < 0) {
 *       throw new HttpError(400, "Invalid id");
 *     }
 *     await state.app.render();
 *   });
 * ```
 *
 * On the server, you can use the `errorBoundary` middleware to associate server side errors with a boundary.
 * If you do that, your route doesn't need to export a boundary.
 *
 * ```ts
 * import { HttpError } from "@udibo/react-app";
 * import { errorBoundary, ServerState } from "@udibo/react-app/server";
 * import { Router } from "@oak/oak";
 *
 * export default new Router<ServerState>()
 *   .use(errorBoundary("MyPage"))
 *   .get("/", async (context) => {
 *     const { state, params } = context;
 *     const id = Number(params.id);
 *     if (isNaN(id) || Math.floor(id) !== id || id < 0) {
 *       throw new HttpError(400, "Invalid id");
 *     }
 *     await state.app.render();
 *   });
 * ```
 *
 * You can also manually assign boundaries to errors. This is useful if your page has multiple error boundaries.
 *
 * In the following example, the `DisplayId` component will throw a 400 bad request error if the id is not a positive integer.
 * That error will have a boundary of "DisplayId" and will be handled by the `ErrorBoundary` with the same boundary.
 * If any other errors occur outside of that boundary, they will be handled by the `ErrorBoundary` with the boundary "MyPage".
 *
 * ```tsx
 * import { useParams } from "react-router-dom";
 * import { ErrorBoundary, DefaultErrorFallback, HttpError } from "@udibo/react-app";
 *
 * export const boundary = "MyPage";
 * export const ErrorFallback = DefaultErrorFallback;
 *
 * function DisplayId(): ReactElement {
 *   const params = useParams();
 *   const id = Number(params.id);
 *   if (isNaN(id) || Math.floor(id) !== id || id < 0) {
 *     throw new HttpError(400, "Invalid id", { boundary: "DisplayId" });
 *   }
 *   return (
 *     <>
 *       <h2>Id</h2>
 *       <p>{id}</p>
 *     </>
 *   );
 * }
 *
 * export defualt function MyPage(): ReactElement {
 *   return (
 *     <div>
 *       <h1>My Component</h1>
 *       <ErrorBoundary
 *         FallbackComponent={DefaultErrorFallback}
 *         boundary="DisplayId"
 *       >
 *         <DisplayId />
 *       </ErrorBoundary>
 *     </div>
 *   );
 * }
 * ```
 *
 * ```ts
 * import { HttpError } from "@udibo/react-app";
 * import { ServerState } from "@udibo/react-app/server";
 * import { Router } from "@oak/oak";
 *
 * export default new Router<ServerState>()
 *   .get("/", async (context) => {
 *     const { state, params } = context;
 *     const id = Number(params.id);
 *     if (isNaN(id) || Math.floor(id) !== id || id < 0) {
 *       throw new HttpError(400, "Invalid id", { boundary: "DisplayId" });
 *     }
 *     await state.app.render();
 *   });
 * ```
 *
 * @param props - The properties for an application error boundary.
 * @returns An application error boundary component.
 */
export function ErrorBoundary(
  props: PropsWithChildren<ErrorBoundaryProps>,
): ReactNode {
  const { children, boundary, ...errorBoundaryProps } = props;
  const errorContext = useContext(ErrorContext);
  const initialError = errorContext.error ?? null;
  const [error, setError] = useState(initialError);

  useEffect(() => {
    return () => {
      setTimeout(() => {
        delete errorContext.error;
      }, 0);
    };
  }, []);

  if (!error || boundary !== error.data.boundary) {
    return (
      <ReactErrorBoundary
        {...errorBoundaryProps}
      >
        {children}
      </ReactErrorBoundary>
    );
  }

  const fallbackProps = {
    error,
    resetErrorBoundary: (...args) => {
      setError(null);
      errorBoundaryProps.onReset?.({
        args,
        reason: "imperative-api",
      });
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
      "ErrorBoundary requires either a fallback, fallbackRender, or FallbackComponent prop.",
    );
  }
}

/**
 * A higher-order component that wraps a component with an `ErrorBoundary`. Any errors within the boundary will be captured by it.
 * For the error on the server to be caught by it, it must have the same `boundary`.
 *
 * In the following example, the `DisplayId` component will throw a 400 bad request error if the id is not a positive integer.
 * If an error occurs, it will be caught by the `ErrorBoundary` that wraps the DisplayId component and the `DefaultErrorFallback` component will be rendered.
 *
 * ```tsx
 * import { useParams } from "react-router-dom";
 * import { ErrorBoundary, DefaultErrorFallback, HttpError } from "@udibo/react-app";
 *
 * function DisplayId(): ReactElement {
 *   const params = useParams();
 *   const id = Number(params.id);
 *   if (isNaN(id) || Math.floor(id) !== id || id < 0) {
 *     throw new HttpError(400, "Invalid id", { boundary: "DisplayId" });
 *   }
 *   return (
 *     <>
 *       <h2>Id</h2>
 *       <p>{id}</p>
 *     </>
 *   );
 * }
 *
 * export default withErrorBoundary(DisplayId, { FallbackComponent: DefaultErrorFallback, boundary: "DisplayId" });
 * ```
 *
 * @param Component - The component to wrap with an error boundary.
 * @param errorBoundaryProps - The properties for the error boundary.
 * @returns A component that is wrapped with an error boundary.
 */
export function withErrorBoundary<P>(
  Component: ComponentType<P>,
  errorBoundaryProps: ErrorBoundaryProps,
): ComponentType<P> {
  const Wrapped = ((props: P) => {
    return (
      <ErrorBoundary {...errorBoundaryProps}>
        <Component
          {
            // deno-lint-ignore no-explicit-any
            ...props as any
          }
        />
      </ErrorBoundary>
    );
  }) as ComponentType<P>;

  // Format for display in DevTools
  const name = Component.displayName || Component.name || "Unknown";
  Wrapped.displayName = `withErrorBoundary(${name})`;

  return Wrapped;
}

/**
 * A hook that automatically resets the error boundary if the location changes.
 * It takes a `reset` function and generates a new reset function that prevents multiple calls to the reset callback.
 *
 * Here is an example of a simple ErrorFallback component that uses the `useAutoReset` hook:
 *
 * ```tsx
 * import { useAutoReset } from "@udibo/react-app";
 *
 * export function ErrorFallback({ error, resetErrorBoundary }: FallbackProps): ReactElement {
 *   const reset = useAutoReset(resetErrorBoundary);
 *
 *   return (
 *     <div role="alert">
 *       <p>{error.message || "Something went wrong"}</p>
 *       {isDevelopment() && error.stack ? <pre>{error.stack}</pre> : null}
 *       <button onClick={reset}>Try again</button>
 *     </div>
 *   );
 * }
 * ```
 *
 * That example is the same as the `DefaultErrorFallback` component in this module.
 *
 * @param reset - A function for resetting the error boundary.
 * @returns A reset function that automatically resets the error boundary if the location changes.
 */
export function useAutoReset(reset: () => void): () => void {
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
 *
 * @param props - The properties for the error fallback.
 * @returns A simple error fallback component.
 */
export function DefaultErrorFallback(
  { error, resetErrorBoundary }: FallbackProps,
): ReactElement {
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
 *
 * @returns This function never returns, it always throws a 404 not found error.
 */
export function NotFound(): ReactElement {
  throw new HttpError(404, "Not found");
}
