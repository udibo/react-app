# Error handling

- [Error handling](#error-handling)
  - [UI](#ui)
    - [Adding error boundaries](#adding-error-boundaries)
      - [Exporting an ErrorFallback component](#exporting-an-errorfallback-component)
      - [Manually adding an error boundary](#manually-adding-an-error-boundary)
    - [SSR](#ssr)
  - [API](#api)
    - [Default Error Handling](#default-error-handling)
    - [Creating and Throwing HttpErrors](#creating-and-throwing-httperrors)
      - [Controlling Error Exposure](#controlling-error-exposure)
      - [Adding Additional Error Data](#adding-additional-error-data)
    - [Overriding Default Error Handling](#overriding-default-error-handling)

## UI

For UI routes, error handling typically involves using error boundaries to catch
and display errors in a user-friendly manner, preventing the entire application
from crashing due to a single component error.

### Adding error boundaries

There are two main ways to add error handling to UI routes, either by exporting
an `ErrorFallback` component from the route file or by manually adding an error
boundary to your component.

#### Exporting an ErrorFallback component

The simplest way to add error handling to a UI route is to export an
`ErrorFallback` component from the route file. The framework will automatically
wrap the route's default export with an error boundary using this fallback.

Example:

```tsx
import { FallbackProps, HttpError } from "@udibo/react-app";

export default function BlogPost() {
  // ... component logic
}

export function ErrorFallback({ error }: FallbackProps) {
  return (
    <div>
      <h1>Error</h1>
      <p>{error.message}</p>
    </div>
  );
}

// Optionally, you can specify a custom boundary name
export const boundary = "BlogPostErrorBoundary";
```

In this example, if an error occurs within the `BlogPost` component, the
`ErrorFallback` component will be rendered instead.

#### Manually adding an error boundary

For more control over error handling, you can manually add an error boundary to
your component using the `ErrorBoundary` component or the `withErrorBoundary`
higher-order component.

Using `ErrorBoundary`:

```tsx
import { DefaultErrorFallback, ErrorBoundary } from "@udibo/react-app";

export default function Blog() {
  return (
    <ErrorBoundary
      FallbackComponent={DefaultErrorFallback}
      boundary="BlogErrorBoundary"
    >
      {/* Blog content */}
    </ErrorBoundary>
  );
}
```

Using `withErrorBoundary`:

```tsx
import { DefaultErrorFallback, withErrorBoundary } from "@udibo/react-app";

function Blog() {
  // ... component logic
}

export default withErrorBoundary(Blog, {
  FallbackComponent: DefaultErrorFallback,
  boundary: "BlogErrorBoundary",
});
```

### SSR

In the browser, any errors that occur within a route will be caught by the
nearest error boundary. When rendering on the server, the errors will have a
boundary key added to them to indicate which error boundary they should be
associated with during rendering. If a route throws an error, it will default to
the nearest route's error boundary.

In the following example, any errors thrown in the route will automatically have
the boundary key set to the boundary for that route. If the route path is
`/blog/:id` and the UI route file doesn't export a boundary constant, any errors
thrown will have the `/blog/:id` boundary added to them. If the UI route file
does export a boundary constant, that will be used instead of the default.

```ts
import { HttpError } from "@udibo/react-app";
import { Router } from "@udibo/react-app/server";

import { getPost } from "../../services/posts.ts";
import type { PostsState } from "../../models/posts.ts";

export default new Router<PostsState>()
  .get("/", async (context) => {
    const { state, params } = context;
    const id = Number(params.id);
    if (isNaN(id) || Math.floor(id) !== id || id < 0) {
      throw new HttpError(400, "Invalid id");
    }

    state.app.initialState.posts = {
      [id]: getPost(id),
    };
    await state.app.render();
  });
```

Routes can have as many error boundaries as you need. If you want an error on
the server to be caught by a specific boundary when doing server-side rendering,
you'll need the error to be thrown with the boundary key set to the name of the
boundary you want to catch the error. This can be done automatically by using
the `errorBoundary` middleware. The following example shows how to use the
`errorBoundary` middleware to catch errors in a route. Now instead of the errors
having the routes boundary key added to them, it will have the
`BlogErrorBoundary` boundary key added to them instead.

```ts
import { HttpError } from "@udibo/react-app";
import { Router } from "@udibo/react-app/server";

import { getPost } from "../../services/posts.ts";
import type { PostsState } from "../../models/posts.ts";

export default new Router<PostsState>()
  .use(errorBoundary("BlogErrorBoundary"))
  .get("/", async (context) => {
    const { state, params } = context;
    const id = Number(params.id);
    if (isNaN(id) || Math.floor(id) !== id || id < 0) {
      throw new HttpError(400, "Invalid id");
    }

    state.app.initialState.posts = {
      [id]: getPost(id),
    };
    await state.app.render();
  });
```

Alternatively, you can throw an `HttpError` with the boundary key set to the
name of the boundary you want to catch the error. In the following example, the
invalid id error will be caught by the `BlogErrorBoundary` boundary instead of
the default boundary. Any other errors will still be caught by the route's
boundary.

```ts
import { HttpError } from "@udibo/react-app";
import { Router } from "@udibo/react-app/server";

import { getPost } from "../../services/posts.ts";
import type { PostsState } from "../../models/posts.ts";

export default new Router<PostsState>()
  .get("/", async (context) => {
    const { state, params } = context;
    const id = Number(params.id);
    if (isNaN(id) || Math.floor(id) !== id || id < 0) {
      throw new HttpError(400, "Invalid id", { boundary: "BlogErrorBoundary" });
    }

    state.app.initialState.posts = {
      [id]: getPost(id),
    };
    await state.app.render();
  });
```

If the error could come from somewhere else that doesn't throw an HttpError with
a boundary, you can catch and re-throw it as an HttpError with the correct
boundary like shown in the following example. It is doing the same thing as the
error boundary middleware, but only applying to the code within the try
statement. Any errors thrown within there will have their boundary set to
`BlogErrorBoundary`. Any errors thrown outside of there will have their boundary
set to the route's boundary.

```ts
import { HttpError } from "@udibo/react-app";
import { Router } from "@udibo/react-app/server";

import { getPost } from "../../services/posts.ts";
import type { PostsState } from "../../models/posts.ts";

export default new Router<PostsState>()
  .get("/", async (context) => {
    const { state, params } = context;
    const id = Number(params.id);
    if (isNaN(id) || Math.floor(id) !== id || id < 0) {
      throw new HttpError(400, "Invalid id");
    }

    try {
      state.app.initialState.posts = {
        [id]: getPost(id),
      };
    } catch (cause) {
      const error = HttpError.from<{ boundary?: string }>(cause);
      if (isDevelopment()) error.expose = true;
      error.data.boundary = "BlogErrorBoundary";
      throw error;
    }
    await state.app.render();
  });
```

## API

In API routes, error handling involves catching and properly formatting errors,
setting appropriate HTTP status codes, and potentially logging errors for
debugging purposes. The framework provides utilities to streamline this process
and ensure consistent error responses across your API.

### Default Error Handling

By default, errors thrown in API routes are caught and handled automatically.
The response body is set to an `ErrorResponse` object representing the error.
This object typically includes:

- `status`: The HTTP status code
- `message`: A description of the error
- `data`: Additional error details (if provided)

These errors are also logged as API route errors, which can be useful for
debugging and monitoring purposes.

### Creating and Throwing HttpErrors

The framework provides an `HttpError` class that you can use to create and throw
custom errors in your API routes. Here's how you can use it:

```typescript
import { HttpError } from "@udibo/react-app";

// ...

if (someErrorCondition) {
  throw new HttpError(400, "Invalid input");
}
```

#### Controlling Error Exposure

You can use the `expose` property to control whether the error message is
exposed to the client:

```typescript
throw new HttpError(400, "Invalid input", { expose: false });
```

When `expose` is set to `false`, the client will receive a generic error message
instead of the specific one you provided. This is useful for hiding sensitive
information or internal error details from users. HTTP errors with a status code
of 500 or greater are not exposed to the client by default, they will only be
exposed if you explicitly set `expose` to `true`. The inverse is true for HTTP
errors with a status code between 400 and 499, they will be exposed to the
client by default, but you can set `expose` to `false` to hide them.

Non-HTTP errors will be converted into an HttpError with a status code of 500,
with the original error being set as the cause. The cause will be logged but not
exposed to the client.

#### Adding Additional Error Data

You can add extra context to your errors by including additional data:

```typescript
throw new HttpError(400, "Form validation failed", {
  field: "email",
  reason: "Invalid format",
});
```

This additional data will be included in the `ErrorResponse` object sent to the
client. It's important to note that this data is shared with the client, so be
careful not to include any sensitive information.

### Overriding Default Error Handling

If you need more control over error handling, you can override the default
behavior by adding custom middleware to the root of your API routes. Here's an
example of how to do this:

```ts
import { Router } from "@udibo/react-app/server";
import { ErrorResponse, HttpError } from "@udibo/react-app";
import * as log from "@std/log";

export default new Router()
  .use(async ({ request, response }, next) => {
    try {
      await next();
    } catch (cause) {
      const error = HttpError.from(cause);
      log.error("API Error", error);

      response.status = error.status;
      const extname = path.extname(request.url.pathname);
      if (error.status !== 404 || extname === "") {
        response.body = new ErrorResponse(error);
      }
    }
  });
```

This middleware catches any errors thrown in subsequent middleware or route
handlers. It converts the error to an `HttpError`, sets the appropriate status
code, and formats the response body. You can customize this further to fit your
specific error handling needs, such as integrating with error tracking services
or applying different handling logic based on the error type.
