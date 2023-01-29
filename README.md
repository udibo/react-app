# Udibo React App

[![release](https://img.shields.io/badge/release-0.1.0-success)](https://github.com/udibo/react_app/releases/tag/0.1.0)
[![deno doc](https://doc.deno.land/badge.svg)](https://deno.land/x/udibo_react_app@0.1.0)
[![CI](https://github.com/udibo/react_app/workflows/CI/badge.svg)](https://github.com/udibo/react_app/actions?query=workflow%3ACI)
[![codecov](https://codecov.io/gh/udibo/react_app/branch/main/graph/badge.svg?token=G5XCR01X8E)](https://codecov.io/gh/udibo/react_app)
[![license](https://img.shields.io/github/license/udibo/react_app)](https://github.com/udibo/react_app/blob/main/LICENSE)

A React Framework for [Deno](https://deno.land). It makes it easy to create
highly interactive apps that have server side rendering with file based routing
for both your UI and API.

Apps are created using [React Router](https://reactrouter.com),
[React Helmet Async](https://www.npmjs.com/package/react-helmet-async), and
[Oak](https://deno.land/x/oak).

## Features

- TypeScript out of the box
- File-system routing like [Next.js](https://nextjs.org),
  [Remix](https://remix.run/) and [Fresh](https://fresh.deno.dev) for both the
  UI and API
- Nested routes
- Server side rendering
- Easy to extend
- Error boundaries that work both on the server and in the browser
- Quick builds with hot reloading
- Can run on the edge with [Deno Deploy](https://deno.land/)

## Usage

This module has 2 entry points.

- [app.tsx](https://deno.land/x/udibo_react_app@0.1.0/app.tsx): For use in code
  that will be used both in the browser and on the server.
- [app_server.tsx](https://deno.land/x/udibo_react_app@0.1.0/app_server.tsx):
  For use in code that will only be used on the server.

You can look at the [examples](#examples) and
[deno docs](https://deno.land/x/udibo_react_app@0.1.0) to learn more about
usage.

### Examples

This repository contains one example for manually testing changes. To use it as
the base for a new project, you would need to update the `import_map.json` file
to use udibo_react_app from the deno.land/x registry.

TODO: Add more examples to other repositories to make it easy to clone them.

### Tasks

To run the tests, use `deno task test` or `deno task test-watch`.

To check formatting and run lint, use `deno task check`.

To create a production build and to run the production build, use
`deno task build` and `deno task run`.

To run the application in development mode with live reloading, use
`deno task dev`.

### Routing

Udibo React Apps have 2 types of routes, UI Routes and API Routes. UI Routes
that do not have an API Route with the same path will default to rendering the
application on the server. The naming convention is the same for both types of
routes.

#### UI Routes

All tsx/jsx files in your routes directory will be treated as UI routes. They
should have a React component as their default export.

It's recommended to use [React Router](https://reactrouter.com) components and
hooks for navigation within your app. Udibo React App uses Router Components to
connect all your routes together.

Parameterized routes can be created by wrapping your parameter name in brackets.
For example, `/blog/[id].tsx` would handle requests like `/blog/123`, setting
the id paramter to `"123"`. The parameters can be accessed using the React
Router [useParams](https://reactrouter.com/en/main/hooks/use-params) hook.

A wildcard route that will catch all requests that didn't have any other matches
can be created by naming a React file `[...].tsx`. The key for the parameter
will be "*" and can be accessed the same way as named parameters.

#### API Routes

All ts/js files in your routes directory will be treated as API routes. They
should have an Oak router as their default export.

If you create an API route that relates to a UI route, it should call
`state.app.render()` to render the app on the server. The render function will
render the application as a readable stream and respond to the client with it.

Parameterized and wildcard routes work just like they do for UI routes. But the
parameters are stored on the context's params property. The key for wildcard
parameters will be "0".

```ts
import { Router } from "x/oak/mod.ts";
import { AppState } from "x/udibo_react_app/app_server.tsx";

export default new Router<AppState>()
  .get("/", async (context) => {
    const { state, params } = context;
    await state.app.render();
  });
```

#### Error handling

There are 2 ways to add error handling to your UI routes.

The easiest way is to add an ErrorFallback export to your UI Route. The related
API router will automatically have error boundary middleware added to it, that
will match the route path. For example, the `/blog/[id]` route would have the
error's boundary identifier set to `"/blog/[id]"`. Then the AppErrorBoundary
added around your component will have a matching boundary identifier.

If you'd like to nest an error boundary within your UI route component, you can
use AppErrorBoundary or withAppErrorBoundary. If you do it this way, you will
need to add errorBoundary middleware to your router to ensure any errors in that
route are associated with the AppErrorBoundary you added.

```ts
const router = new Router()
  .use(errorBoundary("MyComponentErrorBoundary"));
```

Then the related UI route component needs to either use `withAppErrorBoundary`
or `AppErrorBoundary` to be able to catch the error during rendering. The
boundary identifier must match the one on the server.

```tsx
const MyComponentSafe = withAppErrorBoundary(MyComponent, {
  FallbackComponent: DefaultErrorFallback,
  boundary: "MyComponentErrorBoundary",
});
```

```tsx
<AppErrorBoundary
  FallbackComponent={DefaultErrorFallback}
  boundary="MyComponentErrorBoundary"
>
  <MyComponent />
</AppErrorBoundary>;
```

#### Ignore files

You can have the build script ignore files in your routes directory by adding an
underscore prefix to their name.

#### Build artifacts

The only reserved file names are `_main.ts` and `_main.tsx` at the root of your
routes directory. Those files are generated during the build process.

- `_main.ts`: Exports an Oak router that connects all the Oak router files
  together.
- `_main.tsx`: Exports a React Router route object that connects all your React
  component files together.

#### Import map

Deno has support for npm modules, however deno deploy doesn't yet. Because of
that, the import map currently imports all npm modules from esm.sh. To ensure
all npm dependencies are using the same version of react, they need to have
their version pinned. Once Deno Deploy has npm support, I'll switch from using
esm.sh to npm specifier imports.

## Contributing

To contribute, please read the [contributing instruction](CONTRIBUTING.md).
