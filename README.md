# Udibo React App

[![JSR](https://jsr.io/badges/@udibo/react-app)](https://jsr.io/@udibo/react-app)
[![JSR Score](https://jsr.io/badges/@udibo/react-app/score)](https://jsr.io/@udibo/react-app)
[![CI/CD](https://github.com/udibo/react-app/actions/workflows/main.yml/badge.svg)](https://github.com/udibo/react-app/actions/workflows/main.yml)
[![codecov](https://codecov.io/gh/udibo/react-app/branch/main/graph/badge.svg?token=G5XCR01X8E)](https://codecov.io/gh/udibo/react-app)
[![license](https://img.shields.io/github/license/udibo/react-app)](https://github.com/udibo/react-app/blob/main/LICENSE)

## Description

Udibo React App is a [React](https://react.dev) framework for building
full-stack web applications with [Deno](https://deno.com).

On the frontend, it uses [React Router](https://reactrouter.com) to handle
client side routing and
[React Helmet Async](https://www.npmjs.com/package/react-helmet-async) to manage
all of your changes to metadata for your website. Client side routing enables a
faster user experience by fetching the new data it needs for the next page when
navigating your site instead of having to fetch and re-render a whole new page.

On the backend, it uses the [Oak](https://jsr.io/@oak/oak) middleware framework
for handling HTTP requests. If you are coming from using Node.js, the Oak
middleware framework is very similar to [Express](https://expressjs.com/) but
leverages async functions instead of callbacks to provide a better developer
experience.

For bundling your user interface code for the browser, Udibo React App uses
[esbuild](https://esbuild.github.io/). It can generate bundles for your
application very quickly. Udibo React App's dev script enables automatic
rebuilds and reloads of your application as you make changes to it, which makes
it so you can see the effects of your changes quickly.

Ontop of tying together those tools for the frontend and backend, Udibo React
App provides file based routing for both the user interface and the API. Routes
for the user interface will automatically be pre-rendered on the server by
default, making your application load quickly.

Whether you're a beginner or an experienced developer, the Udibo React App
framework is a valuable resource for learning and building robust web
applications. It provides a solid foundation for creating scalable and
performant projects, enabling developers to deliver high-quality software
solutions.

## Features

- Supports TypeScript and JavaScript out of the box
- File based routing like [Next.js](https://nextjs.org),
  [Remix](https://remix.run/) and [Fresh](https://fresh.deno.dev) for both your
  application's UI and API
- Server side rendering
- Easy to extend
- Error boundaries that work both on the server and in the browser
- Quick builds with hot reloading
- Can run on the edge with [Deno Deploy](https://deno.com/deploy)

## Documentation

The documentation for how to use all of the entrypoints for this framework's
package can be found on JSR
([@udibo/react-app](https://jsr.io/@udibo/react-app/doc)).

In addition to that documentation for the code below is a list of guides for how
to use the framework.

- [Getting Started](docs/getting-started.md)
- [Configuration](docs/configuration.md)
- [Development tools](docs/development-tools.md)
- [Routing](docs/routing.md)
- [HTTP Middleware](docs/http-middleware.md)
- [Static Files](docs/static-files.md)
- [Metadata](docs/metadata.md)
- [Styling](docs/styling.md)
- [State Management](docs/state-management.md)
- [Forms](docs/forms.md)
- [Error Handling](docs/error-handling.md)
- [Testing](docs/testing.md)
- [Logging](docs/logging.md)
- [CI/CD](docs/ci-cd.md)

## Contributing

To contribute, please read the [contributing instruction](CONTRIBUTING.md).
