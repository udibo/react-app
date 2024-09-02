# Getting Started

This guide covers the basics of setting up, developing, and deploying an
application using the Udibo React App framework.

- [Getting Started](#getting-started)
  - [Setup](#setup)
    - [Copy example project](#copy-example-project)
    - [Manually create all the files](#manually-create-all-the-files)
  - [Required files](#required-files)
    - [deno.jsonc](#denojsonc)
    - [main.ts](#maints)
    - [log.ts](#logts)
    - [routes/main.ts](#routesmaints)
    - [routes/main.tsx](#routesmaintsx)
    - [routes/index.tsx](#routesindextsx)
    - [react.d.ts](#reactdts)
  - [Optional files](#optional-files)
    - [build.ts](#buildts)
    - [dev.ts](#devts)
    - [.gitignore](#gitignore)
    - [test-utils.tsx](#test-utilstsx)
    - [.github/\*](#github)
      - [.github/workflows/main.yml](#githubworkflowsmainyml)
      - [.github/codecov.yml](#githubcodecovyml)
    - [.vscode/\*](#vscode)
      - [.vscode/settings.json](#vscodesettingsjson)
  - [Tasks](#tasks)
  - [Routing](#routing)
  - [Error handling](#error-handling)
  - [Metadata](#metadata)
  - [Logging](#logging)
  - [Testing](#testing)
  - [Deployment](#deployment)

## Setup

There are 2 options for how to get started, you can either
[copy the example project](#copy-example-project) or
[manually create all the required files](#manually-create-all-the-required-files).

### Copy example project

For copying the example, you can use git clone or download it from the GitHub
repo. Below is a link to the example.

https://github.com/udibo/react-app-example

If you go to that link and click the Code button, the dropdown includes the
option to download it or the url for cloning it with git.

If you have git installed, you can run the following command to clone it.

```sh
git clone https://github.com/udibo/react-app-example.git
```

For more information on cloning a repository, see
[this guide](https://docs.github.com/en/repositories/creating-and-managing-repositories/cloning-a-repository#about-cloning-a-repository)
from GitHub.

For more information about the files in that example, see the
[required files](#required-files) and [optional files](#optional-files)
sections.

### Manually create all the files

To get started, you are going to need a folder for your project and to create a
few files in that directory. The following 2 sections lists those files and
explains their purpose.

## Required files

- [deno.jsonc](#denojsonc): The configuration for deno and contains a set of
  shortcuts for doing tasks.
- [main.ts](#maints): The main entrypoint for running the application.
- [log.ts](#logts): The configuration for how logs are handled.
- [routes/main.ts](#routesmaints): A wrapper around the server side of the
  application.
- [routes/main.tsx](#routesmaintsx): A wrapper around the client side of the
  application.
- [routes/index.tsx](#routesindextsx): The homepage for the application.
- [react.d.ts](#reactdts): Type definitions for React to enable autocompletion
  and type checking.

### deno.jsonc

This is the configuration for deno and contains a set of shortcuts for doing
tasks.

All of the tasks in this file can be used by typing `deno task [task]`. For
example: `deno task dev` would build and run the application in development mode
with hot reloading. All of the configuration options besides the tasks are
required. For more information about the tasks, see the [tasks section](#tasks).

The `nodeModulesDir` option is set to `true` in this configuration. This is
necessary for compatibility with certain VS Code extensions, such as the
TailwindCSS extension, and for tools like Playwright
([see this comment](https://github.com/denoland/deno/issues/16899#issuecomment-2307899834)).

While Deno typically doesn't use a `node_modules` directory, enabling this
option ensures better compatibility with tools and extensions that expect a
Node.js-like environment.

```jsonc
{
  "tasks": {
    // Builds the application.
    "build": "deno run -A --config=deno.jsonc jsr:@udibo/react-app@0.24.3/build",
    // Builds the application in development mode.
    "build-dev": "export APP_ENV=development NODE_ENV=development && deno task build",
    // Builds the application in production mode.
    "build-prod": "export APP_ENV=production NODE_ENV=production && deno task build",
    // Builds and runs the application in development mode, with hot reloading.
    "dev": "export APP_ENV=development NODE_ENV=development && deno run -A --config=deno.jsonc jsr:@udibo/react-app@0.24.3/dev",
    // Runs the application. Requires the application to be built first.
    "run": "deno run -A ./main.ts",
    // Runs the application in development mode. Requires the application to be built first.
    "run-dev": "export APP_ENV=development NODE_ENV=development && deno task run",
    // Runs the application in production mode. Requires the application to be built first.
    "run-prod": "export APP_ENV=production NODE_ENV=production && deno task run",
    // Runs the tests.
    "test": "export APP_ENV=test NODE_ENV=development && deno test -A --trace-leaks",
    // Runs the tests in watch mode.
    "test-watch": "export APP_ENV=test NODE_ENV=development && deno test -A --trace-leaks --watch",
    // Checks the formatting and runs the linter.
    "check": "deno lint && deno fmt --check",
    // Gets your branch up to date with master after a squash merge.
    "git-rebase": "git fetch origin main && git rebase --onto origin/main HEAD"
  },
  "compilerOptions": {
    "lib": ["esnext", "dom", "dom.iterable", "dom.asynciterable", "deno.ns"],
    "jsx": "react-jsx",
    "jsxImportSource": "react",
    "jsxImportSourceTypes": "@types/react"
  },
  "nodeModulesDir": true,
  "exclude": [
    "coverage",
    "node_modules",
    "public/build",
    "routes/_main.ts",
    "routes/_main.tsx"
  ],
  "imports": {
    "/": "./",
    "./": "./",
    "@udibo/react-app": "jsr:@udibo/react-app@0.24.3",
    "@std/assert": "jsr:@std/assert@1",
    "@std/log": "jsr:@std/log@0",
    "@std/path": "jsr:@std/path@1",
    "@std/testing": "jsr:@std/testing@1",
    "react": "npm:react@18",
    "@types/react": "npm:@types/react@18",
    "react-router-dom": "npm:react-router-dom@6",
    "react-helmet-async": "npm:react-helmet-async@2",
    "@testing-library/react": "npm:@testing-library/react@16",
    "global-jsdom": "npm:global-jsdom@24"
  }
}
```

### main.ts

The main entrypoint for running the application.

The serve function starts the application on the specified port. This example
uses port 9000 but you can use any port you want. Importing the "./log.ts" file
ensures logging is done with your logging configuration specified in that file.
The two _main files in the routes directory are the route and router generated
by the build script.

```ts
import * as path from "@std/path";
import { serve } from "@udibo/react-app/server";

import route from "./routes/_main.tsx";
import router from "./routes/_main.ts";
import "./log.ts";

await serve({
  port: 9000,
  router,
  route,
  workingDirectory: path.dirname(path.fromFileUrl(import.meta.url)),
});
```

### log.ts

The configuration for how logs are handled.

The react-app logger is used for logs made by the @udibo/react-app package. You
can change the configuration however you'd like. The logFormatter is designed to
handle the logs emitted by react-app. See the documentation for that function
for more details about how it expects calls to be made to the logging functions
and how those calls will translate into log messages.

```ts
import * as log from "@std/log";
import { isDevelopment, isServer, logFormatter } from "@udibo/react-app";

const level = isDevelopment() ? "DEBUG" : "INFO";
log.setup({
  handlers: {
    default: new log.ConsoleHandler(level, {
      formatter: logFormatter,
      useColors: isServer(),
    }),
  },
  loggers: { "react-app": { level, handlers: ["default"] } },
});
```

For more information, view our [logging guide](logging.md).

### routes/main.ts

A wrapper around the server side of the application.

This is where you should add middleware that you want to apply to all requests.
In the following example, it adds middleware that will set the response time
header and log information about the request. That middleware is not required,
it is just an example of middleware. For more information about middleware, view
our [HTTP middleware guide](http-middleware.md).

Each subdirectory in the routes directory can have a `main.ts` file that applies
middleware for all routes in that subdirectory. You can learn more about this in
the [routing section](routing.md).

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

### routes/main.tsx

A wrapper around the client side of the application.

This is a good place to define the layout for your website along with default
metadata for all pages. It's a good place to add providers for context shared by
your entire application. For example, theming context or information about the
current session. If your server has context you would like relayed to the
client, you can use the `useInitialState` function to access it.

Each subdirectory in the routes directory can have a `main.tsx` file that wraps
the entire route path. You can learn more about this in the [routing](#routing)
section.

```tsx
import { Suspense } from "react";
import { Link, Outlet } from "npm:react-router-dom@6";
import { DefaultErrorFallback, ErrorBoundary, Helmet } from "@udibo/react-app";
import "../log.ts";

import { Loading } from "../components/loading.tsx";

const navLinks = [
  { label: "Home", to: "/" },
  { label: "About", to: "/about" },
  { label: "Blog", to: "/blog" },
  { label: "Fake", to: "/fake" },
];

export default function Main() {
  return (
    <>
      <Helmet
        defaultTitle="Example"
        titleTemplate="Example | %s"
        htmlAttributes={{ lang: "en" }}
      >
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Helmet>
      <ul>
        {navLinks.map((link) => (
          <li key={link.label}>
            <Link to={link.to}>{link.label}</Link>
          </li>
        ))}
      </ul>
      <Suspense fallback={<Loading />}>
        <ErrorBoundary FallbackComponent={DefaultErrorFallback}>
          <Outlet />
        </ErrorBoundary>
      </Suspense>
    </>
  );
}
```

The ErrorBoundary around the Outlet will create an error boundary for the entire
application, if an error is thrown and not caught by another error boundary
first, the fallback component will be shown. For more information, view our
[error handling guide](error-handling.md).

### routes/index.tsx

The homepage for the application. The contents of the component aren't required,
just an example of a homepage.

Each subdirectory in the routes directory can have an `index.tsx` file that
represents the default view for that path. You can learn more about this in the
[routing section](routing.md).

```tsx
import { Helmet } from "@udibo/react-app";

export default function Index() {
  return (
    <>
      <Helmet>
        <title>Home</title>
        <meta
          name="description"
          content="This is a basic example of a Udibo React App."
        />
      </Helmet>
      <h1>Home</h1>
      <p>This is a basic example of a Udibo React App.</p>
      <ul>
        <li>
          <a href="https://github.com/udibo/react_app">GitHub Repository</a>
        </li>
        <li>
          <a href="https://deno.land/x/udibo_react_app">Deno docs</a>
        </li>
      </ul>
    </>
  );
}
```

### react.d.ts

This file is required for Deno's LSP to recognize the types for React and to
provide autocompletions.

```ts
declare module "react" {
  // @ts-types="@types/react"
  import React from "npm:react@18";
  export = React;
}
```

## Optional files

- [build.ts](#buildts): Builds the application with your own build options.
- [dev.ts](#devts): Starts a development server using your own build options.
- [test-utils.tsx](#test-utilstsx): Provides additional utilities for testing
  your application.
- [.gitignore](#gitignore): Contains a list of files that should not be
  committed.

### build.ts

If the default build configuration settings are insufficient for your
application, you can create a build script like shown below:

```ts
import { buildOnce, type BuildOptions } from "@udibo/react-app/build";
import "./log.ts";

// export the buildOptions so that you can use them in your dev script.
// You will need a dev script if you have non default build options.
export const buildOptions: BuildOptions = {
  // Add your own build options here if the defaults are not sufficient.
};

if (import.meta.main) {
  buildOnce(buildOptions);
}
```

Then update your deno config file's tasks section to use your build script:

```jsonc
"tasks": {
  // Builds the application.
  "build": "deno run -A ./build.ts",
  // Builds the application in development mode.
  "build-dev": "export APP_ENV=development NODE_ENV=development && deno task build",
  // Builds the application in production mode.
  "build-prod": "export APP_ENV=production NODE_ENV=production && deno task build",
}
```

For more information, view our [configuration guide](configuration.md).

### dev.ts

If the default build or dev configuration settings are insufficient for your
application, you can create a custom dev script like shown below:

```ts
import { startDev } from "@udibo/react-app/dev";
import "./log.ts";

// Import the build options from the build script
import { buildOptions } from "./build.ts";

startDev({
  buildOptions,
  // Add your own options here
});
```

Then update your deno config file's tasks section to use your dev script:

```jsonc
"tasks": {
   // Builds and runs the application in development mode, with hot reloading.
   "dev": "export APP_ENV=development NODE_ENV=development && deno run -A ./dev.ts",
}
```

For more information, view our [configuration guide](configuration.md).

### .gitignore

Contains a list of files that should not be committed. We don't need to commit
the build artifacts which are stored in the public directory or the router and
route scripts in the routes directory. We also don't need to commit the coverage
files.

```
# Build
public/build
public/test-build
routes/_main.tsx
routes/_main.ts

# Coverage
coverage

# Node modules
node_modules
```

### test-utils.tsx

Provides additional utilities for testing your application. This script sets up
the global document object, then re-exports all of the tools from react testing
library. It also overrides the current render function with one that is
disposable, making it easier to cleanup the global document object at the end of
each test.

We recommend writing tests for both your user interface and API. Tests help
ensure your application functions as it should and will alert you if changes
break your application.

```tsx
import "@udibo/react-app/global-jsdom";
import {
  cleanup,
  render as _render,
  type RenderOptions,
} from "@testing-library/react";
export * from "@testing-library/react";

export function render(
  ui: React.ReactElement,
  options?: Omit<RenderOptions, "queries">,
): ReturnType<typeof _render> & Disposable {
  const result = _render(ui, options);
  return {
    ...result,
    [Symbol.dispose]() {
      cleanup();
    },
  };
}
```

Below is an example of how to make use of this module in a test case. In this
test case, it renders the loading component and tests that the text content of
it matches what we expect it to. By `using` the screen returned by the render
function call, the test will call the cleanup function before the test finishes.

```tsx
import { assertEquals } from "@std/assert";
import { describe, it } from "@std/testing/bdd";

import { render } from "../test-utils.tsx";

import { Loading } from "./loading.tsx";

const loadingTests = describe("Loading component");

it(loadingTests, "renders loading message", () => {
  using screen = render(<Loading />);
  assertEquals(screen.getByText("Loading...").textContent, "Loading...");
});
```

If you'd prefer calling the cleanup function yourself, you would want to add an
afterEach hook to your test suite that calls the cleanup function.

```tsx
import { assertEquals } from "@std/assert";
import { describe, it } from "@std/testing/bdd";

import { cleanup, render } from "../test-utils.tsx";

import { Loading } from "./loading.tsx";

const loadingTests = describe({
  name: "Loading component",
  afterEach() {
    cleanup();
  },
});

it(loadingTests, "renders loading message", () => {
  const screen = render(<Loading />);
  assertEquals(screen.getByText("Loading...").textContent, "Loading...");
});
```

### .github/*

If you plan on using GitHub actions for CI/CD, you'll want some of the files in
this directory. If the default build configuration works for you, the examples
below. For more information, view our [CI/CD guide](ci-cd.md).

#### .github/workflows/main.yml

If you'd like a GitHub action that will test your code, upload coverage reports,
and deploy your code to Deno Deploy, you can use the following workflow for
that. If you are not going to upload your test coverage report to Codecov, just
omit the secret. If you are not using deploy, you can look at the referenced
script to see how to write a workflow for preparing a production build and
uploading it. If your configuration is unique, you can write your own CI and CD
workflows based on ours. Those can be found on GitHub in the `.github/workflows`
folder.

In this example, the CI step builds the application, checks the formatting,
lints it, and runs the tests. The CD step builds the application for production,
and deploys it to Deno Deploy.

```yml
name: CI/CD
on:
  pull_request:
  push:
    branches:
      - main
jobs:
  ci:
    name: CI
    uses: udibo/react-app/.github/workflows/ci.yml@0.24.3
    secrets:
      CODECOV_TOKEN: ${{ secrets.CODECOV_TOKEN }}
  cd:
    name: CD
    needs: ci
    uses: udibo/react-app/.github/workflows/deploy.yml@0.24.3
    with:
      project: udibo-react-app-example
```

#### .github/codecov.yml

If you are using codecov to report your test coverage, this file is a good
starting point for configuring it. It's recommended to ignore coverage for your
build artifacts.

```yml
comment: false
codecov:
  require_ci_to_pass: true
coverage:
  status:
    project:
      default:
        informational: true
ignore:
  - "public/build/**/*"
```

### .vscode/*

There is just one file required here if you are using VS code. That's the file
with the settings for VS code to use. If you'd like more details about other
configuration options like the ones for using the debugger or running tasks, see
the [development tools guide](development-tools.md#vs-code) for more
information.

#### .vscode/settings.json

Your vscode settings must have your deno.jsonc referenced so that the extension
knows how to work with your project. You can use unstable APIs if you want but
by default I left that disabled in this example. Your code will automatically
get formatted by the deno extension when you save. If there are parts of your
code you would like ignored by Deno's linter or formatter, you can configure
that in your [deno.jsonc](#denojsonc) file.

```json
{
  "deno.enable": true,
  "deno.lint": true,
  "deno.unstable": false,
  "deno.config": "./deno.jsonc",
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "denoland.vscode-deno",
  "editor.quickSuggestions": {
    "strings": true
  }
}
```

## Tasks

To run the tests, use `deno task test` or `deno task test-watch`.

To check formatting and run the linter, use `deno task check`.

The following 2 commands can be used for creating builds.

- `deno task build-dev`: Builds the application in development mode.
- `deno task build-prod`: Builds the application in production mode.

A build must be generated before you can run an application. You can use the
following 2 commands to run the application.

- `deno task run-dev`: Runs the application in development mode.
- `deno task run-prod`: Runs the application in production mode.

To run the application in development mode with live reloading, use
`deno task dev`.

When in development, identifiers are not minified and sourcemaps are generated
and linked.

The commands ending in `-dev` and `-prod` set the `APP_ENV` and `NODE_ENV`
environment variables. The `NODE_ENV` environment variable is needed for react.
If you use the `deno task build` or `deno task run` tasks, you should make sure
that you set both of those environment variables. Those environment variables
are also needed if you deploy to Deno Deploy.

The `deno task git-rebase` task is useful if you use squash and merge. If you
don't need it feel free to remove it.

If you'd like to customize your build or the tasks available, see the
[tasks section](configuration.md#tasks) of our
[configuration guide](configuration.md).

## Routing

This framework supports both file based routing and nesting routes within a
file. This makes it easy to organize your application and visualize it as a tree
just like how React makes it easy to organize and visualize your UI as a tree.

To learn more about routing, view our [routing guide](routing.md).

## Error handling

Error handling is a crucial aspect of both UI and API routes in this framework.
It allows you to gracefully manage and respond to various types of errors that
may occur during the execution of your application.

For more detailed information on implementing error handling in both UI and API
routes, including best practices and advanced techniques, please refer to our
comprehensive [error handling guide](./error-handling.md).

## Metadata

Metadata is crucial for improving SEO, social media sharing, and overall user
experience in your application. It is also where you can add scripts and styles
to your application.

For detailed information on implementing and managing metadata, including best
practices and advanced techniques, please refer to our
[Metadata guide](./metadata.md). For more information on how to style your
application, please refer to the [Styling guide](./styling.md).

## Logging

TODO: Briefly cover how to log and how it can be configured.

For more information, view our [logging guide](logging.md).

## Testing

TODO: Cover the basics of testing then link to the testing guide.

For more information, view our [testing guide](testing.md).

## Deployment

TODO: Link to the CI-CD guide section for deploymnet for more information about
deploying to other environments and for automating deployment with github
actions.
