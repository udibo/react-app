# State Management

This guide covers the various approaches to managing state in your application.

- [State Management](#state-management)
  - [Server to Client State Transfer](#server-to-client-state-transfer)
    - [Setting Initial State on the Server](#setting-initial-state-on-the-server)
    - [Accessing Initial State in Components](#accessing-initial-state-in-components)
  - [React State Management](#react-state-management)
    - [Component State](#component-state)
    - [Context API](#context-api)
    - [Reducers](#reducers)
  - [React Query Integration](#react-query-integration)

## Server to Client State Transfer

Udibo React App provides a powerful mechanism for passing initial state from the
server to the client during server-side rendering. This is handled through the
`initialState` property in your server routes.

### Setting Initial State on the Server

In your server route files (`.ts` files), you can set initial state before
rendering:

```ts
interface PostsState {
  posts: Post[];
}

export default new Router<PostsState>()
  .get("/", async (context) => {
    const { state } = context;

    // Fetch data and set it in initialState
    state.app.initialState.posts = await getPosts();
    await state.app.render();
  });
```

### Accessing Initial State in Components

In your React components, use the `useInitialState` hook to access state that
was set on the server:

```tsx
import { useInitialState } from "@udibo/react-app";

function PostsList() {
  const [posts, clearPosts] = useInitialState<Post[]>("posts");

  // clearPosts() can be called to remove this initial state
  // so it won't be used on subsequent re-renders

  return (
    <div>
      {posts?.map((post) => <PostItem key={post.id} post={post} />)}
    </div>
  );
}
```

The `useInitialState` hook returns a tuple containing:

1. The initial state value (or undefined if not set)
2. A function to clear the initial state

## React State Management

This section covers the basics of state management using hooks in React. For
more information see
[React's official guide on managing state](https://18.react.dev/learn/managing-state).

### Component State

For simple component-level state, use React's built-in `useState` hook:

```tsx
import { useState } from "react";

function Counter() {
  const [count, setCount] = useState(0);

  return (
    <button onClick={() => setCount(count + 1)}>
      Count: {count}
    </button>
  );
}
```

### Context API

For sharing state between components without prop drilling, use React's Context
API. The framework provides built-in support for context:

```tsx
// contexts/ThemeContext.tsx
import { createContext, useContext, useState } from "react";

const ThemeContext = createContext<{
  theme: string;
  setTheme: (theme: string) => void;
}>({
  theme: "light",
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState("light");

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
```

Add the provider in your `routes/main.tsx`:

```tsx
export default function Main() {
  return (
    <ThemeProvider>
      <Outlet />
    </ThemeProvider>
  );
}
```

Now you can use the `useTheme` hook in any component to access or modify the
theme:

```tsx
function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <button
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
      className={`theme-toggle ${theme}`}
    >
      Switch to {theme === "light" ? "dark" : "light"} mode
    </button>
  );
}

function ThemedComponent() {
  const { theme } = useTheme();

  return (
    <div className={`themed-content ${theme}`}>
      <h1>Current theme: {theme}</h1>
      <p>This content adapts to the current theme</p>
    </div>
  );
}
```

### Reducers

For complex state logic, use `useReducer`:

```tsx
import { useReducer } from "react";

type Action =
  | { type: "increment" }
  | { type: "decrement" }
  | { type: "reset" };

function reducer(state: number, action: Action) {
  switch (action.type) {
    case "increment":
      return state + 1;
    case "decrement":
      return state - 1;
    case "reset":
      return 0;
  }
}

function Counter() {
  const [count, dispatch] = useReducer(reducer, 0);

  return (
    <div>
      Count: {count}
      <button onClick={() => dispatch({ type: "increment" })}>+</button>
      <button onClick={() => dispatch({ type: "decrement" })}>-</button>
      <button onClick={() => dispatch({ type: "reset" })}>Reset</button>
    </div>
  );
}
```

## React Query Integration

For managing server state, caching, and data fetching, you can integrate React
Query. This section shows how to set up React Query for both client and
server-side rendering.

The following example will build up to having a Posts component that can render
in the browser or on the server. When rendered in the browser, it will use fetch
to make an API call to get the posts. When rendered on the server, it will
directly interact with the database to prefetch the query results so that it can
render the page without doing a fetch request.

First, create a shared query configuration:

```ts
// queries/posts.ts
import { ErrorResponse } from "@udibo/react-app";
import { QueryClient } from "@tanstack/react-query";
import type { Post } from "../database/schema/posts.ts";

export interface GetPostsResponse {
  posts: Post[];
}

// Define the client-side query function
export async function getPosts(): Promise<GetPostsResponse> {
  const response = await fetch("/api/posts");
  if (!response.ok) {
    throw await ErrorResponse.toError(response);
  }
  return response.json();
}

// Create a function that returns the query configuration
export function getPostsQuery() {
  return {
    queryKey: ["posts"] as const,
    queryFn: getPosts,
  };
}
```

Create the server-side implementation:

```ts
// services/posts.ts
import { HttpError } from "@udibo/react-app";
import { db } from "../database/mod.ts";
import { postsTable } from "../database/schema/posts.ts";
import type { GetPostsResponse } from "../queries/posts.ts";

export async function getPosts(): Promise<GetPostsResponse> {
  try {
    const posts = await db
      .select()
      .from(postsTable)
      .limit(10);

    return { posts };
  } catch (cause) {
    if (cause instanceof HttpError) throw cause;
    throw new HttpError(500, "Failed to get posts", { cause });
  }
}
```

Create a shared QueryClient configuration:

```ts
// query-client.ts
import { QueryClient } from "@tanstack/react-query";

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // With SSR, we usually want to set some default staleTime
        // above 0 to avoid refetching immediately on the client
        staleTime: 60 * 1000,
      },
    },
  });
}
```

Create reusable server middleware for React Query:

```ts
// middleware/react-query.ts
import { dehydrate } from "@tanstack/react-query";
import { createQueryClient } from "../query-client.ts";

export async function withReactQuery(context, next) {
  const { state } = context;

  // Create query client if it doesn't exist
  if (!state.queryClient) {
    state.queryClient = createQueryClient();
    // Set up dehydration to occur when serializing initialState for the client.
    state.app.initialState.queryState = {
      toJSON: () => dehydrate(state.queryClient),
    };
  }

  await next();
}
```

Set up the QueryClient provider in your `routes/main.tsx`, using `useMemo` to
ensure the client persists across re-renders:

```tsx
import { useMemo } from "react";
import { Hydrate, QueryClientProvider } from "@tanstack/react-query";
import { useInitialState } from "@udibo/react-app";
import { createQueryClient } from "../query-client.ts";

export default function Main() {
  const queryClient = useMemo(
    () => createQueryClient(),
    [],
  );

  // Get the dehydrated state from the server
  const [queryState] = useInitialState("queryState");

  return (
    <QueryClientProvider client={queryClient}>
      <Hydrate state={queryState}>
        <Outlet />
      </Hydrate>
    </QueryClientProvider>
  );
}
```

On the server side, use the middleware and prefetch the data using the
server-side implementation:

```ts
// routes/posts.ts
import { Router } from "@udibo/react-app/server";
import { withReactQuery } from "../middleware/react-query.ts";
import { getPostsQuery } from "../queries/posts.ts";
import { getPosts } from "../services/posts.ts";

export default new Router()
  .use(withReactQuery)
  .get("/", async (context) => {
    const { state } = context;
    const { queryClient } = state;
    // Get the data directly from the database
    const posts = await getPosts();
    // Prefetch using the server-side result
    state.queryClient.prefetchQuery(getPostsQuery(), {
      initialData: posts,
    });
    await state.app.render();
  });
```

Then use React Query hooks in your components:

```tsx
import { useQuery } from "@tanstack/react-query";
import { getPostsQuery } from "../queries/posts.ts";

function Posts() {
  // Use the centralized query configuration
  const { data: posts, isLoading } = useQuery(getPostsQuery());

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      {posts.map((post) => <PostItem key={post.id} post={post} />)}
    </div>
  );
}
```
