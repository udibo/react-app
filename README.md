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

## Usage

This module has 2 entry points.

- [app.tsx](https://deno.land/x/udibo_react_app@0.1.0/app.tsx): For use in code
  that will be used both in the browser and on the server.
- [app_server.tsx](https://deno.land/x/udibo_react_app@0.1.0/app_server.tsx):
  For use in code that will only be used on the server.

You can look at the [examples](#examples) and
[deno docs](https://deno.land/x/udibo_react_app@0.1.0) to learn more about
usage.

### Tasks

To run the tests, use `deno task test` or `deno task test-watch`.

To check formatting and run lint, use `deno task check`.

To create a production build and to run the production build, use
`deno task build` and `deno task run`.

To run the application in development mode with live reloading, use
`deno task dev`.

## Examples

This repository contains one example for manually testing changes. To use it as
the base for a new project, you would need to update the `import_map.json` file
to use udibo_react_app from the deno.land/x registry.

TODO: Add more examples to other repositories to make it easy to clone them.

## Contributing

To contribute, please read the [contributing instruction](CONTRIBUTING.md).
