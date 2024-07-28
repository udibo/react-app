import { type Context, createContext } from "react";
import type { HttpError } from "@udibo/http-error";

/**
 * A context object that is used to provide errors on the server to the browser.
 * It takes an object with an optional `error` property, which represents the HttpError that occurred.
 * This context is intended for internal use and testing only.
 */
export const ErrorContext: Context<{ error?: HttpError }> = createContext<
  { error?: HttpError }
>({});

/**
 * A context object that is used to provide the initial state of the application to the browser.
 * This context is intended for internal use and testing only.
 */
export const InitialStateContext: Context = createContext({});
