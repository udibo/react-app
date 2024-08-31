import type { HttpErrorOptions } from "./error.tsx";

/** A constant used for internal purposes only. */
export const _env = {
  /** Inidicates whether the code is running on the server or not. */
  isServer: "Deno" in globalThis || "process" in globalThis,
};

/** A JSON representation of the initial app state. */
export interface AppData<
  SharedState extends Record<string | number, unknown> = Record<
    string | number,
    unknown
  >,
> {
  /** The environment that the application is running in. */
  env: string;
  /** The initial state for the app. */
  initialState: SharedState;
  /** The error that occurred when rendering the apps initially. */
  error?: HttpErrorOptions;
  /** The port for the dev script's live reload server. Defaults to 9001. */
  devPort?: number;
}

/**
 * A type representing the browser's window object augmented with an `app` property that is used for internal purposes only.
 */
export type AppWindow<
  SharedState extends Record<string | number, unknown> = Record<
    string | number,
    unknown
  >,
> = typeof window & {
  app?: AppData<SharedState>;
};

/**
 * A function that returns a boolean indicating whether the code is running on the server or not.
 *
 * This function can be used for disabling server side rendering (SSR) for components.
 *
 * In the following example, the BlogPost component will show a loading message initially when it is rendered on the server.
 * After the component is hydrated in the browser, the loading message will be replaced with the actual content once the request to get the post completes.
 * This example comes from `example/routes/blog/[id].tsx` and the only change is to import `isServer` and to not call `getPost(id)` if it returns `true`.
 *
 * ```tsx
 * import { useParams } from "react-router-dom";
 * import { Helmet, HttpError, isServer } from "@udibo/react-app";
 *
 * import { getPost } from "../../services/posts.tsx";
 *
 * export default function BlogPost() {
 *   const params = useParams();
 *   const id = Number(params.id);
 *   if (isNaN(id) || Math.floor(id) !== id || id < 0) {
 *     throw new HttpError(400, "Invalid id");
 *   }
 *
 *   const post = isServer() ? null : getPost(id);
 *   return post
 *     ? (
 *       <>
 *         <Helmet>
 *           <title>{post.title}</title>
 *           <meta name="description" content={post.content} />
 *         </Helmet>
 *         <h2>{post.title}</h2>
 *         <p>{post.content}</p>
 *       </>
 *     )
 *     : (
 *       <>
 *         <Helmet>
 *           <title>Loading...</title>
 *         </Helmet>
 *         <h2>Loading...</h2>
 *       </>
 *     );
 * }
 * ```
 *
 * @returns A boolean indicating whether the code is running on the server or not.
 */
export function isServer(): boolean {
  return _env.isServer;
}

/**
 * A function that returns a boolean indicating whether the code is running in the browser or not.
 *
 * @returns A boolean indicating whether the code is running in the browser or not.
 */
export function isBrowser(): boolean {
  return !isServer();
}

/**
 * A function that returns the environment the application is running in.
 * On the server, this value comes from the `APP_ENV` environment variable.
 * In the browser, this value is set on the `window.app.env` property.
 * If it is not set in either case, the default value is `development`.
 *
 * @returns The environment that the application is running in.
 */
export function getEnvironment(): string {
  return (isServer()
    ? Deno.env.get("APP_ENV")
    : (window as AppWindow).app?.env) ?? "development";
}

/**
 * A function that returns a boolean indicating whether the code is running in the test environment or not.
 *
 * @returns A boolean indicating whether the code is running in the test environment or not.
 */
export function isTest(): boolean {
  return getEnvironment() === "test";
}

/**
 * A function that returns a boolean indicating whether the code is running in the development environment or not.
 *
 * @returns A boolean indicating whether the code is running in the development environment or not.
 */
export function isDevelopment(): boolean {
  const env = getEnvironment();
  return !env || env === "development";
}

/**
 * A function that returns a boolean indicating whether the code is running in the production environment or not.
 *
 * @returns A boolean indicating whether the code is running in the production environment or not.
 */
export function isProduction(): boolean {
  return getEnvironment() === "production";
}
