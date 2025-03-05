# HTTP middleware

- [HTTP middleware](#http-middleware)
  - [Introduction](#introduction)
  - [Middleware Basics](#middleware-basics)
    - [Middleware Structure](#middleware-structure)
    - [The Context Object](#the-context-object)
    - [The Next Function](#the-next-function)
  - [Adding Middleware to Routes](#adding-middleware-to-routes)
    - [Global Middleware](#global-middleware)
    - [Route-Specific Middleware](#route-specific-middleware)
    - [Directory-Level Middleware](#directory-level-middleware)
  - [Common Middleware Patterns](#common-middleware-patterns)
    - [Logging and Timing](#logging-and-timing)
    - [Error Handling](#error-handling)
    - [Authentication and Authorization](#authentication-and-authorization)
    - [Response Transformation](#response-transformation)
  - [Middleware Execution Order](#middleware-execution-order)
  - [Best Practices](#best-practices)

## Introduction

HTTP middleware is a powerful concept in web applications that allows you to
intercept and process HTTP requests and responses before they reach your route
handlers or after they leave them. In the Udibo React App framework, middleware
functions are essential for implementing cross-cutting concerns such as logging,
authentication, error handling, and more.

This guide covers how to create and use middleware in your Udibo React App
server routes.

## Middleware Basics

### Middleware Structure

Middleware in the Udibo React App framework follows the standard Oak middleware
pattern. A middleware function takes two parameters:

1. `context` - An object containing information about the current request and
   response
2. `next` - A function that calls the next middleware in the chain

Here's the basic structure of a middleware function:

```ts
(async (context, next) => {
  // Code to run before the next middleware

  await next();

  // Code to run after the next middleware
});
```

### The Context Object

The `context` object provides access to the request, response, and state
objects:

```ts
(async (context, next) => {
  const { request, response, state, params } = context;

  // Access request information
  const url = request.url;
  const method = request.method;
  const headers = request.headers;

  // Modify response
  response.headers.set("X-Custom-Header", "Value");

  // Access route parameters
  const id = params.id;

  // Access or modify state
  state.app.initialState.user = { name: "John" };

  await next();
});
```

### The Next Function

The `next` function is used to pass control to the next middleware in the chain.
It returns a Promise that resolves when all downstream middleware have
completed.

```ts
(async (context, next) => {
  // Code executed before the route handler

  await next();

  // Code executed after the route handler
});
```

## Adding Middleware to Routes

### Global Middleware

To add middleware that applies to all routes in your application, you can add it
to the main router in your `routes/main.ts` file:

```ts
import { Router } from "@udibo/react-app/server";
import * as log from "@std/log";

export default new Router()
  .use(async (context, next) => {
    const { request, response } = context;
    const start = Date.now();
    try {
      await next();
    } finally {
      const responseTime = Date.now() - start;
      response.headers.set("X-Response-Time", `${responseTime}ms`);
      log.info(
        `${request.method} ${request.url.href}`,
        { status: response.status, responseTime },
      );
    }
  });
```

This middleware will be applied to all routes in your application.

### Route-Specific Middleware

You can add middleware to specific routes by chaining the `.use()` method before
defining the route:

```ts
import { HttpError } from "@udibo/react-app";
import { Router } from "@udibo/react-app/server";

export default new Router()
  .get("/public", (context) => {
    // Public route accessible to everyone
    context.response.body = { message: "Public data" };
  })
  .use(async (context, next) => {
    // Check if user is authenticated
    const token = context.request.headers.get("Authorization");
    if (!token || !isValidToken(token)) {
      throw new HttpError(401, "Unauthorized");
    }

    // Add user information to the state
    context.state.user = getUserFromToken(token);

    await next();
  })
  .get("/protected", (context) => {
    // This route is protected by the middleware above
    const { user } = context.state;
    context.response.body = { message: `Hello, ${user.name}!` };
  });
```

In this example, the authentication middleware is only applied to routes defined
after it, so the `/public` route is accessible without authentication, but the
`/protected` route requires authentication.

### Directory-Level Middleware

Each subdirectory in the routes directory can have a `main.ts` file that applies
middleware to all routes in that directory. This is useful for organizing
related routes and applying common middleware to them.

For example, in `routes/api/main.ts`:

```ts
import { ErrorResponse, HttpError } from "@udibo/react-app";
import { Router } from "@udibo/react-app/server";
import * as log from "@std/log";

export default new Router()
  .use(async (context, next) => {
    // This middleware applies to all routes in the /api directory
    context.response.headers.set("Content-Type", "application/json");

    try {
      await next();
    } catch (cause) {
      const error = HttpError.from(cause);
      log.error("API Error", error);

      context.response.status = error.status;
      context.response.body = new ErrorResponse(error);
    }
  });
```

This middleware will be applied to all routes in the `/api` directory, setting
the content type to JSON and handling errors.

## Common Middleware Patterns

### Logging and Timing

Logging middleware is useful for debugging and monitoring your application:

```ts
import { Router } from "@udibo/react-app/server";
import * as log from "@std/log";

export default new Router()
  .use(async (context, next) => {
    const { request, response } = context;
    const start = Date.now();

    log.info(`Request: ${request.method} ${request.url.pathname}`);

    try {
      await next();
    } finally {
      const responseTime = Date.now() - start;
      response.headers.set("X-Response-Time", `${responseTime}ms`);

      log.info(
        `Response: ${request.method} ${request.url.pathname}`,
        { status: response.status, responseTime },
      );
    }
  });
```

### Error Handling

Error handling middleware can catch errors thrown in route handlers and format
them appropriately:

```ts
import { ErrorResponse, HttpError } from "@udibo/react-app";
import { Router } from "@udibo/react-app/server";
import * as log from "@std/log";
import * as path from "@std/path";

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

### Authentication and Authorization

Authentication middleware verifies the identity of users, while authorization
middleware checks if they have permission to access a resource:

```ts
import { HttpError } from "@udibo/react-app";
import { Router } from "@udibo/react-app/server";

// Authentication middleware
const authenticate = async (context, next) => {
  const token = context.request.headers.get("Authorization");
  if (!token) {
    throw new HttpError(401, "Authentication required");
  }

  try {
    const user = await verifyToken(token);
    context.state.user = user;
  } catch (error) {
    throw new HttpError(401, "Invalid token");
  }

  await next();
};

// Authorization middleware
const requireAdmin = async (context, next) => {
  const { user } = context.state;
  if (!user || user.role !== "admin") {
    throw new HttpError(403, "Admin access required");
  }

  await next();
};

export default new Router()
  .use(authenticate)
  .get("/profile", (context) => {
    // Accessible to any authenticated user
    const { user } = context.state;
    context.response.body = { profile: user };
  })
  .use(requireAdmin)
  .get("/admin", (context) => {
    // Only accessible to admins
    context.response.body = { message: "Admin dashboard" };
  });
```

### Response Transformation

Middleware can transform responses before they're sent to the client:

```ts
import { Router } from "@udibo/react-app/server";

const wrapResponse = async (context, next) => {
  await next();

  // Only transform JSON responses
  if (
    context.response.headers.get("Content-Type")?.includes("application/json")
  ) {
    const originalBody = context.response.body;

    context.response.body = {
      success: context.response.status < 400,
      data: originalBody,
      timestamp: new Date().toISOString(),
    };
  }
};

export default new Router()
  .use(wrapResponse)
  .get("/data", (context) => {
    context.response.body = { name: "Example" };
    // Response will be transformed to:
    // { success: true, data: { name: "Example" }, timestamp: "..." }
  });
```

## Middleware Execution Order

Middleware functions are executed in the order they are added to the router.
When a request is received:

1. Middleware is executed from top to bottom until a `next()` call
2. When `next()` is called, control passes to the next middleware
3. After the last middleware calls `next()`, the route handler is executed
4. After the route handler completes, control returns back up the middleware
   chain
5. Any code after the `await next()` call is executed in reverse order (bottom
   to top)

This flow allows middleware to process both the request (before `next()`) and
the response (after `next()`).

## Best Practices

1. **Keep middleware focused**: Each middleware function should have a single
   responsibility.

2. **Handle errors properly**: Use try/catch blocks around `next()` calls to
   catch errors from downstream middleware.

3. **Be mindful of performance**: Heavy processing in middleware can slow down
   all requests.

4. **Use middleware composition**: Break complex middleware into smaller,
   reusable functions.

5. **Consider middleware order**: The order in which middleware is applied
   matters.

6. **Pass data between middleware**: Use the `context.state` object to pass data
   between middleware functions.

7. **Document your middleware**: Add comments explaining what each middleware
   does, especially for complex logic.

8. **Test your middleware**: Write unit tests for your middleware functions to
   ensure they behave as expected.
