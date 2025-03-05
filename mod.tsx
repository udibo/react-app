import { useContext } from "react";
import * as reactHelmetAsync from "react-helmet-async";
const reactHelmetAsyncFixed = reactHelmetAsync;
const helmet = reactHelmetAsyncFixed.default ??
  reactHelmetAsync;
export const Helmet = helmet.Helmet;

export {
  getEnvironment,
  isBrowser,
  isDevelopment,
  isProduction,
  isServer,
  isTest,
} from "./env.ts";
import { InitialStateContext } from "./context.ts";
export { HttpError, withErrorBoundary } from "./error.tsx";
export type { ErrorBoundaryProps, FallbackProps } from "./error.tsx";
export {
  DefaultErrorFallback,
  ErrorBoundary,
  ErrorResponse,
  isErrorResponse,
  isHttpError,
  NotFound,
  useAutoReset,
} from "./error.tsx";
export type { HttpErrorOptions } from "./error.tsx";
export { logFormatter } from "./log.ts";

/**
 * Gets the initial state of the application.
 *
 * @returns The initial state of the application.
 */
export function useInitialState<
  SharedState extends Record<string | number, unknown> = Record<
    string | number,
    unknown
  >,
>(): SharedState {
  return useContext(InitialStateContext) as SharedState;
}
