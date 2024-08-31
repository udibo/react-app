/** @jsxRuntime automatic */
/** @jsxImportSource npm:react@18 */
/** @jsxImportSourceTypes npm:@types/react@18 */
import { useContext } from "react";
import * as reactHelmetAsync from "react-helmet-async";
const reactHelmetAsyncFixed = reactHelmetAsync;
const helmet = reactHelmetAsyncFixed.default ??
  reactHelmetAsync;
export const Helmet = helmet.Helmet;
import type { LogRecord } from "@std/log";
import { HttpError } from "./error.tsx";

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

/**
 * A log formatter function that can be used for formatting log messages from your application.
 *
 * With this formatter, you can log messages with additional context.
 * If there is an error, it should be passed as the argument after the message.
 * The last argument should be an object that contains additional context.
 * All internal log messages are generated using that call signature style.
 *
 * Below is an example of how to use this formatter with the `@std/log` module:
 * ```ts
 * import { HttpError, logFormatter } from "@udibo/react-app";
 * import * as log from "@std/log";
 *
 * const level = isDevelopment() ? "DEBUG" : "INFO";
 * log.setup({
 *   handlers: {
 *     default: new log.ConsoleHandler(level, {
 *       formatter: logFormatter,
 *     }),
 *   },
 *   loggers: { "react-app": { level, handlers: ["default"] } },
 * });
 *
 * log.info("example", { a: 1, b: "x" });
 * // 2024-07-28T23:48:02.435Z INFO: example {"a":1,"b":"x"}
 * log.warn("example", { a: 1, b: "x" });
 * // 2024-07-28T23:48:02.435Z WARN: example {"a":1,"b":"x"}
 * const errors = [
 *   new Error("Something went wrong"),
 *   new HttpError(500, "Something went wrong"),
 * ];
 * log.error("regular error", errors[0], { a: 1, b: "x" });
 * // 2024-07-28T23:48:02.435Z ERROR: regular error {"name":"Error","message":"Something went wrong","stack":"@http://localhost:9000/build/_main.js:1:10808\n"} {"a":1,"b":"x"}
 * log.error("http error", errors[1], { a: 1, b: "x" });
 * // 2024-07-28T23:48:02.435Z ERROR: http error {"name":"InternalServerError","message":"Something went wrong","status":500,"expose":false,"stack":"_HttpError@http://localhost:9000/build/chunk-6ZBSCUFP.js:160:9589\n@http://localhost:9000/build/_main.js:1:10842\n"} {"a":1,"b":"x"}
 * log.critical("regular error", errors[0], { a: 1, b: "x" });
 * // 2024-07-28T23:48:02.435Z CRITICAL: regular error {"name":"Error","message":"Something went wrong","stack":"@http://localhost:9000/build/_main.js:1:10808\n"} {"a":1,"b":"x"}
 * log.critical("http error", errors[1], { a: 1, b: "x" });
 * // 2024-07-28T23:48:02.435Z CRITICAL: http error {"name":"InternalServerError","message":"Something went wrong","status":500,"expose":false,"stack":"_HttpError@http://localhost:9000/build/chunk-6ZBSCUFP.js:160:9589\n@http://localhost:9000/build/_main.js:1:10842\n"} {"a":1,"b":"x"}
 * ```
 *
 * @param logRecord A record of a log message.
 * @returns Formatted log message
 */
export function logFormatter(logRecord: LogRecord): string {
  const { msg, levelName, datetime, args } = logRecord;
  let message = `${datetime.toISOString()} ${levelName}: ${msg}`;
  let data = args[0];
  if (data instanceof Error) {
    const error = data;
    data = args[1];
    if (error instanceof HttpError) {
      const errorJSON = HttpError.json(error);
      errorJSON.expose = (error as HttpError)?.expose;
      if (!errorJSON.expose) {
        errorJSON.message = error.message;
      }
      errorJSON.stack = error.stack;
      message += ` ${JSON.stringify(errorJSON)}`;
    } else {
      const errorJSON = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
      message += ` ${JSON.stringify(errorJSON)}`;
    }
  }

  if (data) {
    message += ` ${JSON.stringify(data)}`;
  }

  return message;
}
