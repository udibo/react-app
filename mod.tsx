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
 * Gets the initial state that was set on the server before the page was rendered.
 *
 * On the server side, you can set the initial state before rendering the page using Oak's context.state:
 * ```ts
 * export default new Router()
 *   .get("/", async (context) => {
 *     context.state.initialState.posts = await getPosts();
 *     context.state.app.render();
 *   });
 * ```
 *
 * Then on the client side, you can access this state using the useInitialState hook:
 * ```ts
 * const PostsList = () => {
 *   const [posts, clearPosts] = useInitialState<Post[]>("posts");
 *   return (
 *     <div>
 *       {posts.map(post => <PostItem key={post.id} post={post} />)}
 *     </div>
 *   );
 * };
 * ```
 *
 * @param stateKey - The key of the state to retrieve, matching the key used on the server in context.state.initialState
 * @returns A tuple containing [value, clearFunction] where:
 *          - value: The initial state value for the given key if it was set on the server before rendering the page, otherwise undefined
 *          - clearFunction: A function to clear this initial state value so it won't be used again on re-renders
 * @template StateValue - The type of the state value being retrieved
 */
export function useInitialState<
  StateValue = unknown,
>(stateKey: string): [StateValue | undefined, () => void] {
  const initialState = useContext(InitialStateContext);
  return [
    initialState[stateKey] as StateValue | undefined,
    () => {
      delete initialState[stateKey];
    },
  ];
}
