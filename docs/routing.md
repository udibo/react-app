# Routing

This framework supports both file based routing and nesting routes within a
file. This makes it easy to organize your application and visualize it as a tree
just like how React makes it easy to organize and visualize your UI as a tree.

- [Routing](#routing)
  - [Route types](#route-types)
  - [Naming convention](#naming-convention)
  - [Main routes](#main-routes)
    - [UI](#ui)
    - [API](#api)
  - [Index routes](#index-routes)
    - [UI](#ui-1)
    - [API](#api-1)
  - [Named routes](#named-routes)
    - [UI](#ui-2)
    - [API](#api-2)
  - [Parameterized routes](#parameterized-routes)
    - [UI](#ui-3)
    - [API](#api-3)
  - [Inline routing](#inline-routing)
    - [UI](#ui-4)
    - [API](#api-4)
  - [Query parameters](#query-parameters)
    - [UI](#ui-5)
    - [API](#api-5)
  - [Error handling](#error-handling)
  - [Metadata](#metadata)

## Route types

There are 2 types of routes, UI routes and API routes. UI routes that do not
have an API route with the same path will default to rendering the application
on the server. The naming convention is the same for both types of routes.

UI routes are defined in files with `.tsx` or `.jsx` extensions, while API
routes are defined in files with `.ts` or `.js` extensions. The framework
determines the route type based on these file extensions:

- UI routes (`.tsx` or `.jsx`): These routes define the user interface
  components and layouts. They are responsible for rendering the visual elements
  of your application and handling client-side interactions.

- API routes (`.ts` or `.js`): These routes define server-side endpoints that
  handle data processing, database interactions, and other backend
  functionalities. They typically return data in formats like JSON for
  consumption by the UI or external clients.

For example, a file named `blog.tsx` would be treated as a UI route, rendering a
blog page component, while `blog.ts` would be treated as an API route, perhaps
handling operations like fetching or updating blog posts.

This distinction allows you to organize your frontend and backend code within
the same directory structure, making it easier to manage related functionality.

## Naming convention

Each directory can have a [main route](#main-routes) that wraps all the routes
in that directory. Each directory can have an [index route](#index-routes) that
will be used when accessing the route directly. For example, the path `/blog` in
our example has a main UI route that contains layout and default metadata for
all subroutes, and it has an index route that would be used when accessing
`/blog` without a subroute path.

Besides the reserved main and index route names, you can also create
[named routes](#named-routes) and [parameterized routes](#parameterized-routes).
The closest main route to it's directory path would be used to wrap the route.

If you would like to include files or subdirectories in your routes directory
that are not routes you can do so by prefixing the file or directory name with
an underscore. The only names that cannot be used are `_main.ts` and `_main.tsx`
in the root of your routes directory. Those 2 files are generated by the
framework and should not be modified.

## Main routes

Main routes are special routes that act as wrappers for all the routes within a
directory. They are useful for creating shared layouts, adding common metadata,
or applying middleware to all routes in a specific directory.

To create a main route for a directory, you need to create a file named
`main.tsx` (for UI routes) or `main.ts` (for API routes) in that directory.

By using main routes, you can easily apply common functionality, layouts, or
middleware to groups of related routes, keeping your code DRY and organized.

### UI

For UI routes, the `main.tsx` file should export a default React component that
will wrap all the routes in that directory. This component typically includes
shared layout elements and can also set default metadata using Helmet.

Here's an example of a main route for a blog route:

```tsx
import { Suspense } from "react";
import { Outlet } from "react-router-dom";
import { DefaultErrorFallback, ErrorBoundary, Helmet } from "@udibo/react-app";

import { Loading } from "../../components/loading.tsx";

export const boundary = "/blog";

export default function Blog() {
  return (
    <>
      <Helmet defaultTitle="Example | Blog" titleTemplate="Example | Blog | %s">
        <title></title>
      </Helmet>
      <h1>Blog</h1>
      <Suspense fallback={<Loading />}>
        <ErrorBoundary
          FallbackComponent={DefaultErrorFallback}
          boundary={boundary}
        >
          <Outlet />
        </ErrorBoundary>
      </Suspense>
    </>
  );
}
```

In this example, the main route for the blog route:

- Sets a default title and title template for all blog pages
- Adds a common "Blog" heading
- Wraps all child routes in a Suspense component for loading states
- Provides an ErrorBoundary for handling errors within the blog section

The `<Outlet />` component is where child routes will be rendered.

### API

For API routes, the `main.ts` file should export a default Router that will be
used as middleware for all routes in that directory. This is useful for adding
common middleware or error handling for a group of related API routes.

Here's an example of a main route for API endpoints:

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

In this example, the main route for the API:

- Adds middleware to log request information and response time for all API
  routes in this directory
- Sets a custom header with the response time

## Index routes

Index routes are special routes that are rendered when a user navigates to the
root of a directory. They are useful for displaying default content or a list of
items for a particular section of your application.

To create an index route, you need to create a file named `index.tsx` (for UI
routes) or `index.ts` (for API routes) in the directory you want to define the
index for.

By using index routes, you can provide meaningful content or functionality for
directory-level URLs, improving the overall structure and user experience of
your application.

### UI

For UI routes, the `index.tsx` file should export a default React component that
will be rendered when the user navigates to the directory's path.

Here's an example of an index route for a blog section:

```tsx
import { Link } from "react-router-dom";
import { Helmet } from "@udibo/react-app";

import { getPosts } from "../../services/posts.tsx";

export default function BlogIndex() {
  const posts = getPosts();
  return posts
    ? (
      <>
        <Helmet>
          <title>Blog Posts</title>
          <meta name="description" content="List of all blog posts" />
        </Helmet>
        <h1>Blog Posts</h1>
        <ul>
          {Object.entries(posts).map(([id, post]) => (
            <li key={`${id}`}>
              <Link to={`${id}`}>{post.title}</Link>
            </li>
          ))}
        </ul>
      </>
    )
    : <div>Loading posts...</div>;
}
```

In this example, the index route for the blog section:

- Sets the page title and meta description using Helmet
- Displays a list of blog posts with links to individual post pages
- Shows a loading message while posts are being fetched

This component will be rendered when a user navigates to the `/blog` path.

### API

For API routes, the `index.ts` file should export a default Router that will
handle requests to the directory's path.

Here's an example of an index route for the blog API:

```ts
import { Router } from "@udibo/react-app/server";

import { getPosts } from "../../services/posts.ts";
import type { PostsState } from "../../models/posts.ts";

export default new Router<PostsState>()
  .get("/", async (context) => {
    const { state } = context;

    state.app.initialState.posts = getPosts();
    await state.app.render();
  });
```

In this example, the index route for the blog API:

- Handles GET requests to the `/blog` path
- Fetches all posts and adds them to the initial state
- Renders the application with the fetched data

## Named routes

Named routes are similar to index routes, but they are used for subroutes that
don't have additional subroutes of their own. They allow you to create specific
pages or endpoints within a directory structure.

To create a named route, you simply create a file with the desired name (e.g.,
`about.tsx` for a UI route or `about.ts` for an API route) in the appropriate
directory.

The key difference between named routes and index routes is their purpose and
location in the URL structure:

- Index routes (`index.tsx` or `index.ts`) handle requests to the root of a
  directory (e.g., `/blog`).
- Named routes (e.g., `about.tsx` or `posts.ts`) handle requests to specific
  subroutes within a directory (e.g., `/about` or `/api/blog/posts`).

By using a combination of index routes, named routes, and nested routes, you can
create a well-organized and intuitive routing structure for your application.

### UI

For UI routes, the named route file should export a default React component that
will be rendered when the user navigates to that specific path.

Here's an example of a named route for an "About" page:

```tsx
import { Helmet } from "@udibo/react-app";

export default function About() {
  return (
    <>
      <Helmet>
        <title>About</title>
        <meta
          name="description"
          content="Udibo React App is a React Framework for Deno."
        />
      </Helmet>
      <h1>About</h1>
      <h2>Udibo React App</h2>
      <p>A React Framework for Deno.</p>
    </>
  );
}
```

In this example, the named route for the "About" page:

- Sets the page title and meta description using Helmet
- Displays content specific to the About page

This component will be rendered when a user navigates to the `/about` path.

### API

For API routes, the named route file should export a default Router that will
handle requests to that specific path.

Here's an example of a named route for a blog posts API:

```ts
import { HttpError } from "@udibo/react-app";
import { Router } from "@udibo/react-app/server";

import { getPost, getPosts } from "../../../services/posts.ts";
import type { PostsState } from "../../../models/posts.ts";

export default new Router<PostsState>()
  .get("/", (context) => {
    const { response } = context;
    response.body = getPosts();
  })
  .get("/:id", (context) => {
    const { response, params } = context;
    const id = parseFloat(params.id);
    if (isNaN(id) || Math.floor(id) !== id || id < 0) {
      throw new HttpError(400, "Invalid id");
    }
    const post = getPost(id);
    if (!post) throw new HttpError(404, "Not found");
    response.body = post;
  });
```

In this example, the named route for the blog posts API:

- Handles GET requests to `/api/blog/posts` to fetch all posts
- Handles GET requests to `/api/blog/posts/:id` to fetch a specific post by ID
- Implements error handling for invalid IDs and non-existent posts

Named routes allow you to create specific functionality for individual pages or
API endpoints within your application's route structure. They are particularly
useful for standalone pages or API endpoints that don't require nested routing.

## Parameterized routes

Parameterized routes allow you to create dynamic routes that can handle variable
parts in the URL path. These are useful for creating pages or API endpoints that
deal with specific resources identified by an ID or other variable information.

To create a parameterized route, you name your file with square brackets around
the parameter name, like `[id].tsx` for UI routes or `[id].ts` for API routes.

Parameterized routes allow you to create flexible and dynamic routes that can
handle a wide range of URL patterns. They are particularly useful for:

- Displaying details of specific items (e.g., product pages, user profiles)
- Handling CRUD operations on resources with unique identifiers
- Creating reusable route components that can work with different data based on
  the path parameters

By combining parameterized routes with other routing techniques, you can create
a powerful and flexible routing system for your application that can handle
complex URL structures and data relationships.

### UI

For UI routes, the parameterized route file should export a default React
component that can access and use the route parameters.

Here's an example of a parameterized route for a blog post page:

```ts
import { useParams } from "react-router-dom";
import { Helmet, HttpError } from "@udibo/react-app";

import { getPost } from "../../services/posts.tsx";

export default function BlogPost() {
  const params = useParams();
  const id = Number(params.id);
  if (isNaN(id) || Math.floor(id) !== id || id < 0) {
    throw new HttpError(400, "Invalid id");
  }
  const post = getPost(id);
  return post
    ? (
      <>
        <Helmet>
          <title>{post.title}</title>
          <meta name="description" content={post.content} />
        </Helmet>
        <h2>{post.title}</h2>
        <p>{post.content}</p>
      </>
    )
    : (
      <>
        <Helmet>
          <title>Loading...</title>
        </Helmet>
        <h2>Loading...</h2>
      </>
    );
}
```

In this example, the parameterized route for a blog post:

- Uses the `useParams` hook from React Router to access the `id` parameter
- Validates the `id` parameter and throws an error if it's invalid
- Fetches the post data based on the `id`
- Renders the post title and content, or a loading state if the post is not yet
  available

This component will be rendered when a user navigates to paths like `/blog/1`,
`/blog/2`, etc.

### API

For API routes, the parameterized route file should export a default Router that
can handle requests with the specified parameter.

Here's an example of a parameterized route for a single blog post API:

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

In this example, the parameterized route for the blog post API:

- Handles GET requests to `/blog/:id`
- Extracts and validates the `id` parameter from the request
- Fetches the specific post data and adds it to the initial state
- Renders the application with the fetched data

## Inline routing

You can also nest routes within a file. This is useful for several reasons:

1. Keeping all child routes in a single file for better organization
2. Locating related routes together for improved readability
3. Enabling route reuse across different parts of your application

Inline routing allows you to define a set of routes once and then reuse them in
multiple contexts, promoting code reusability and maintaining a DRY (Don't
Repeat Yourself) approach in your routing structure.

### UI

For UI routes, inline routing allows you to define nested routes within a single
component. This approach is particularly useful for creating complex UI flows or
wizards, where multiple steps or views are closely related. Here's an example of
how you can implement inline routing for a blog post creation process:

```tsx
import { useState } from "react";
import { Link, Route, Routes, useNavigate } from "react-router-dom";

function BlogPostForm({ title, setTitle, content, setContent, onSubmit }) {
  return (
    <form onSubmit={onSubmit}>
      <div>
        <label htmlFor="title">Title:</label>
        <input
          type="text"
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      <div>
        <label htmlFor="content">Content:</label>
        <textarea
          id="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
      </div>
      <button type="submit">Submit</button>
    </form>
  );
}

function BlogPostPreview({ title, content }) {
  return (
    <div>
      <h2>{title}</h2>
      <p>{content}</p>
    </div>
  );
}

function BlogPostCreator() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    // Here you would typically save the blog post
    console.log("Blog post submitted:", { title, content });
    // Navigate to the preview
    navigate("preview");
  };

  return (
    <div>
      <h1>Create a Blog Post</h1>
      <nav>
        <Link to="">Edit</Link> | <Link to="preview">Preview</Link>
      </nav>

      <Routes>
        <Route
          path=""
          element={
            <BlogPostForm
              title={title}
              setTitle={setTitle}
              content={content}
              setContent={setContent}
              onSubmit={handleSubmit}
            />
          }
        />
        <Route
          path="preview"
          element={<BlogPostPreview title={title} content={content} />}
        />
      </Routes>
    </div>
  );
}

export default BlogPostCreator;
```

In this example:

1. We define a `BlogPostCreator` component that has routes for the edit form and
   the preview components.

2. We use `useState` hooks to manage the state of the blog post title and
   content.

3. We include a simple navigation menu using `Link` components to switch between
   the edit form and the preview.

4. We use `Routes` and `Route` components to define inline routes:
   - The root path (`""`) renders the form for editing the blog post.
   - The `"preview"` path renders a preview of the blog post.

5. The form submission handler (`handleSubmit`) prevents the default form
   submission, logs the blog post data, and then navigates to the preview route
   using the `useNavigate` hook.

6. Both the form and the preview have access to the same state (`title` and
   `content`), allowing for real-time preview as the user types.

This structure maintains the nested routing within the `BlogPostCreator`
component, allowing users to switch between editing and previewing the blog post
without leaving the page, while also keeping the form and preview in the same
file.

Nested routes do not need to be in the routes directory. They can be in any
directory. This makes it easy to make re-usable components that have their own
sub-routes. For example, you could create a comment form component that can be
used on multiple pages, that includes the option to preview it.

### API

Inline routing for API routes allows you to define multiple endpoints within a
single file. This can be particularly useful for organizing related endpoints or
for creating different versions of an API. Let's look at an example:

```ts
import { HttpError } from "@udibo/react-app";
import { Router } from "@udibo/react-app/server";

import { getPost, getPosts } from "../../../services/posts.ts";
import type { PostsState } from "../../../models/posts.ts";

export default new Router<PostsState>()
  .get("/", (context) => {
    const { response } = context;
    response.body = getPosts();
  })
  .get("/:id", (context) => {
    const { response, params } = context;
    const id = parseFloat(params.id);
    if (isNaN(id) || Math.floor(id) !== id || id < 0) {
      throw new HttpError(400, "Invalid id");
    }
    const post = getPost(id);
    if (!post) throw new HttpError(404, "Not found");
    response.body = post;
  });
```

In this example, we have a single file that defines two routes:

1. A GET route for `/api/blog/posts` that returns all posts.
2. A GET route for `/api/blog/posts/:id` that returns a specific post by ID.

Both routes are defined using the `Router` class from `@udibo/react-app/server`.
This approach allows you to keep related endpoints together in one file, making
it easier to manage and maintain your API.

Now, let's discuss how this approach can be used for API versioning:

Suppose you want to create a new version (v2) of your API while maintaining the
old version (v1). You can use inline routing to achieve this:

1. Keep your existing v1 API file as is (e.g., `v1/posts.ts`).
2. Create a new file for v2 (e.g., `v2/posts.ts`).
3. In the v2 file, import the v1 router and extend or modify it as needed.

Here's an example of how you might structure a v2 API file:

```ts
import { Router } from "@udibo/react-app/server";
import v1Router from "../v1/posts.ts";

const v2Router = new Router();

// Add or override routes for v2
v2Router.get("/", (context) => {
  // New implementation for getting all posts in v2
  // This will override the v1 implementation
});

v2Router.get("/featured", (context) => {
  // New endpoint specific to v2
  // Get featured posts
});

// Fallback to v1 routes
v2Router.use(v1Router.routes());

export default v2Router;
```

In this example:

1. We import the v1 router.
2. We create a new v2 router.
3. We add or override routes specific to v2.
4. We fallback to v1 routes.

This approach allows you to:

- Reuse existing functionality from v1.
- Override specific endpoints with new implementations in v2.
- Add new endpoints that are only available in v2.

By using inline routing for API versions, you can maintain backwards
compatibility while introducing new features or changes in your API. This method
provides a clean and organized way to manage multiple versions of your API
within the same application.

## Query parameters

### UI

Query parameters are a way to pass additional information to a route without
changing the route structure. React Router provides an easy way to access these
parameters using the `useSearchParams` hook.

Here's how you can use query parameters in your React components:

```tsx
import { useSearchParams } from "react-router-dom";

export default function Post() {
  const [searchParams] = useSearchParams();
  const id = Number(searchParams.get("id"));
  if (isNaN(id) || Math.floor(id) !== id || id < 0) {
    throw new HttpError(400, "Invalid id");
  }
  const post = getPost(id);
  return post
    ? (
      <>
        <Helmet>
          <title>{post.title}</title>
          <meta name="description" content={post.content} />
        </Helmet>
        <h2>{post.title}</h2>
        <p>{post.content}</p>
      </>
    )
    : (
      <>
        <Helmet>
          <title>Loading...</title>
        </Helmet>
        <h2>Loading...</h2>
      </>
    );
}
```

In this example, the `id` variable will contain the value of the `id` parameter
from the URL. For example, if the URL is `/blog/post?id=1`, the `id` variable
will contain `1`. This example is the same as the
[parameterized routes](#parameterized-routes) example, but it uses the
`useSearchParams` hook to access the id from a query parameter instead of the
`useParams` hook to access the id from a path parameter.

### API

In Oak, you can access query parameters using the
`context.request.url.searchParams` property. This property is an instance of
`URLSearchParams`, which provides methods to read, append, and manipulate query
parameters.

Here's how you can access query parameters in your Oak routes:

```ts
import { Router } from "@udibo/react-app/server";

export default new Router()
  .get("/", (context) => {
    const { searchParams } = context.request.url;

    // Get a single query parameter
    const id = searchParams.get("id");

    // Get all values for a query parameter (useful for repeated parameters)
    const tags = searchParams.getAll("tag");

    // Check if a parameter exists
    const hasFilter = searchParams.has("filter");

    // Iterate over all query parameters
    for (const [key, value] of searchParams) {
      console.log(`${key}: ${value}`);
    }

    // Use the query parameters in your logic
    if (id) {
      // Handle request with id
    } else {
      // Handle request without id
    }

    // Respond with the parsed query parameters
    context.response.body = { id, tags, hasFilter };
  });
```

In this example:

1. We access the `searchParams` from the `context.request.url`.
2. We use various methods provided by `URLSearchParams` to interact with the
   query parameters:
   - `get()`: Retrieves the first value associated with the given search
     parameter.
   - `getAll()`: Returns all values associated with the given search parameter.
   - `has()`: Returns a boolean indicating if the given search parameter exists.
3. We can iterate over all query parameters using a `for...of` loop.
4. We use the parsed query parameters in our route logic and response.

This approach allows you to handle query parameters flexibly in your API routes,
whether you're dealing with single values, multiple values for the same
parameter, or checking for the presence of specific parameters.

Remember to validate and sanitize query parameters as needed, especially when
using them to query databases or other sensitive operations. You may want to
implement additional error handling for cases where expected query parameters
are missing or have invalid values.

## Error handling

Error handling is a crucial aspect of both UI and API routes in this framework.
It allows you to gracefully manage and respond to various types of errors that
may occur during the execution of your application.

For more detailed information on implementing error handling in both UI and API
routes, including best practices and advanced techniques, please refer to our
comprehensive [Error handling guide](./error-handling.md).

## Metadata

Metadata is crucial for improving SEO, social media sharing, and overall user
experience in your application. It is also where you can add scripts and styles
to your application.

For detailed information on implementing and managing metadata, including best
practices and advanced techniques, please refer to our
[Metadata guide](./metadata.md). For more information on how to style your
application, please refer to the [Styling guide](./styling.md).
