# Configuration

This guide covers the configuration options available for your project.

- [Configuration](#configuration)
  - [Tasks](#tasks)
  - [Compiler options](#compiler-options)
  - [Formatting and linting](#formatting-and-linting)
  - [Imports](#imports)
  - [Server](#server)
  - [Build](#build)
    - [workingDirectory](#workingdirectory)
    - [routesUrl](#routesurl)
    - [publicUrl](#publicurl)
    - [configPath](#configpath)
    - [esbuildPlugins](#esbuildplugins)
    - [entryPoints](#entrypoints)
  - [Development](#development)
    - [devPort](#devport)
    - [entryPoint](#entrypoint)
    - [isBuildArtifact](#isbuildartifact)
    - [buildOptions](#buildoptions)
  - [Environment variables](#environment-variables)
    - [Required Environment Files](#required-environment-files)
      - [.env.development](#envdevelopment)
      - [.env.production](#envproduction)
      - [.env.test](#envtest)
    - [Environment Variables Usage](#environment-variables-usage)
    - [Loading Environment Variables](#loading-environment-variables)
    - [Custom Environment Files](#custom-environment-files)
      - [.env.local](#envlocal)
    - [Environment Files and Version Control](#environment-files-and-version-control)
    - [Accessing Environment Variables](#accessing-environment-variables)

## Tasks

To learn more about using the default tasks, see the
[tasks](getting-started.md#tasks) section in the getting started guide. The
default tasks include:

- `build`: Builds the application in production mode.
- `run`: Runs the application in production mode. Requires the application to be
  built first.
- `dev`: Builds and runs the application in development mode, with hot
  reloading.
- `test`: Runs the tests.
- `test-watch`: Runs the tests in watch mode.
- `check`: Checks the formatting and runs the linter.
- `git-rebase`: Gets your branch up to date with master after a squash merge.

If you need to customize your build options to be different from the default,
follow the instructions for adding the [build.ts](getting-started.md#buildts)
and [dev.ts](getting-started.md#devts) files in the getting started guide. Then
for more information on the build configuration options available, see the
[build](#build) section of this guide.

You can add any tasks that you want to your configuration, for more information
on how to do so, see Deno's
[task runner](https://docs.deno.com/runtime/manual/tools/task_runner/) guide.

If you remove or rename any of the default tasks and you make use of our GitHub
workflows, you may need to modify them to use different tasks. See the
[CI/CD](ci-cd.md) guide for more information.

## Compiler options

The default compiler options from the
[getting started guide](getting-started.md#denojson) should be sufficient for
most use cases. If you need to customize them, you can do so by modifying the
`compilerOptions` in the `deno.json` file.

```json
{
  "compilerOptions": {
    "lib": ["esnext", "dom", "dom.iterable", "dom.asynciterable", "deno.ns"],
    "jsx": "react-jsx",
    "jsxImportSource": "react",
    "jsxImportSourceTypes": "@types/react"
  }
}
```

For more information about the available options, see Deno's
[configuring TypeScript in Deno guide](https://docs.deno.com/runtime/manual/advanced/typescript/configuration/).

## Formatting and linting

You can configure Deno's formatter and linter to include or ignore files or
directories by adding the fmt or lint key to your configuration. Alternatively,
if you only want to exclude the same files or directories for both, you can
update the top level excludes array. Below is the default excludes array from
the [getting started guide](getting-started.md#denojsonc). It ensures that the
formatter ignores coverage report json files, your npm dependencies stored in
the node_modules directory, and the build artifacts from this framework.

```json
{
  "exclude": [
    "coverage",
    "node_modules",
    "public/build",
    "routes/_main.ts",
    "routes/_main.tsx"
  ]
}
```

## Imports

The imports section of the `deno.json` file is used to configure an import map
for resolving bare specifiers. It makes it so that you don't have to specify the
version everywhere that your dependency is used and provides one centralized
place for updating those versions.

For example, if your import map has the entry `"react": "npm:react@18"`, you'll
be able to import react like `import React from "react"` and it will resolve to
`npm:react@18`.

The default import map from the
[getting started guide](getting-started.md#denojsonc) also has 2 entries in it
that make it easy to import files relative to the root of your project. Instead
of having to import files with a path relative to the current file, you can
import them with a path relative to the root of your project. For example, if
you have your shared components in the components directory, you can import them
like `import Button from "/components/Button.tsx"` instead of
`import Button from "../../components/Button.tsx"`.

```json
{
  "imports": {
    "/": "./",
    "./": "./"
  }
}
```

For more information about import maps, see Deno's
[import map](https://docs.deno.com/runtime/manual/basics/import_maps/)
documentation.

## Server

In all of the examples, the main entry point for the application is the
`main.ts` or `main.tsx` file. This is the file that is used to start the
application and contains the configuration for starting it. For most
applications, you can just use the serve function to start your application. If
a port is not specified, the operating system will choose an available port
automatically. The route and router options come from geenerated build
artifacts. The configuration for logging is stored in the `log.ts` file, for
more information about configuring logging, see the [logging](logging.md) guide.

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
});
```

## Build

When building your application, you can customize various aspects of the build
process. Let's explore the available configuration options and how to use them
effectively.

### workingDirectory

The working directory is the root of your application. All other paths in your
configuration will be resolved relative to this directory. By default, this is
your current working directory.

This is particularly useful when you need to run builds from different locations
or in CI/CD pipelines where the working directory might not be the project root.

### routesUrl

This specifies where your route files are located. The build process uses this
directory to generate the routing configuration for both client and server. By
default, it looks for routes in the `./routes` directory.

During the build, two important files will be generated in this directory:

- `_main.ts`: Handles server-side routing with Oak
- `_main.tsx`: Manages client-side routing with React Router

### publicUrl

This is where your built files will be served from. It's the directory that
contains all your static assets. By default, files are output to the `./public`
directory.

The build process will create:

- `public/build`: For your production and development builds
- `public/test-build`: For your test builds

### configPath

Points to your Deno configuration file, which contains important settings like
import maps and compiler options. The build process will automatically search
for either `deno.json` or `deno.jsonc` in your working directory.

### esbuildPlugins

Use this option to enhance your build process with additional functionality
through esbuild plugins. The plugins are inserted in a specific order: after the
Deno resolver but before the Deno loader plugin. This ensures compatibility
while allowing you to extend the build process.

For example, you can add PostCSS support to process your CSS files. First,
create a `postcss.config.ts` file:

```ts
import type { PostCSSPluginOptions } from "@udibo/esbuild-plugin-postcss";
import autoprefixer from "autoprefixer";

export default {
  plugins: [
    autoprefixer(),
  ],
} satisfies PostCSSPluginOptions;
```

Then in your build script, import and use the PostCSS plugin:

```ts
import { buildOnce, type BuildOptions } from "@udibo/react-app/build";
import { logFormatter } from "@udibo/react-app";
import { postCSSPlugin } from "@udibo/esbuild-plugin-postcss";

import * as log from "@std/log";
import postcssConfig from "./postcss.config.ts";

const buildOptions: BuildOptions = {
  entryPoints: ["./styles/main.css"],
  esbuildPlugins: [
    postCSSPlugin(postcssConfig),
  ],
};
export default buildOptions;

if (import.meta.main) {
  buildOnce(buildOptions);
}
```

### entryPoints

Need to build additional assets beyond your main application? Use entry points
to specify extra files that should be processed during the build.

This is perfect for:

- Building separate CSS files
- Compiling worker scripts
- Processing other assets

Here's how to put it all together in a custom build script:

```ts
import { buildOnce, type BuildOptions } from "@udibo/react-app/build";
import { logFormatter } from "@udibo/react-app";

import * as log from "@std/log";

const buildOptions: BuildOptions = {
  entryPoints: ["./styles/main.css", "./workers/sw.ts"],
  esbuildPlugins: [
    // Your plugins here
  ],
};
export default buildOptions;

if (import.meta.main) {
  buildOnce(buildOptions);
}
```

## Development

Setting up a great development environment is crucial for productivity.

The development server provides several powerful features to enhance your
development workflow:

- Watches your files and automatically rebuilds when changes are detected
- Reloads your browser sessions when builds complete successfully
- Intelligently tracks build artifacts to prevent unnecessary rebuilds
- Automatically restarts your server to reflect the latest changes

Let's look at how you can customize the development server to suit your needs.

### devPort

The development server needs a port for its live reload functionality. By
default, it uses port 9001. This port is separate from your main application
port, handling only the live reload functionality.

### entryPoint

Every application needs a starting point. By default, the development server
looks for `./main.ts`. This is typically your server's entry point that sets up
your application and starts listening for requests.

### isBuildArtifact

When files change, you don't want to trigger rebuilds for generated files. This
function helps the development server identify which files to ignore during live
reloading.

The development server comes with a built-in function that checks common build
artifacts, but you can customize it for your needs. For example:

```ts
import { startDev } from "@udibo/react-app/dev";

import "./log.ts";
import buildOptions from "./build.ts";

startDev({
  buildOptions,
  isBuildArtifact: (pathname) => {
    return pathname.includes("generated/") ||
      pathname.endsWith(".gen.ts") ||
      pathname.includes("temp/");
  },
});
```

### buildOptions

Your development server needs to know how to build your application. If you have
a custom build script, you can pass in the build options from your build script.

```ts
import { startDev } from "@udibo/react-app/dev";

import buildOptions from "./build.ts";

startDev({
  buildOptions,
});
```

## Environment variables

The Udibo React App framework uses environment variables to configure different
aspects of your application based on the current environment (development,
production, or test). These variables are loaded from `.env` files.

### Required Environment Files

The framework requires three environment files for different operational modes:

#### .env.development

Used when running the application in development mode with `deno task dev`.

```env
APP_ENV=development
NODE_ENV=development
```

#### .env.production

Used when building and running the application in production mode with
`deno task build` and `deno task run`.

```env
APP_ENV=production
NODE_ENV=production
```

#### .env.test

Used when running tests with `deno task test`.

```env
APP_ENV=test
NODE_ENV=development
```

### Environment Variables Usage

These environment variables serve specific purposes:

- `APP_ENV`: Used by the application to determine the current environment. The
  framework provides utility functions like `isDevelopment()`, `isProduction()`,
  and `getEnvironment()` to check the current environment.
- `NODE_ENV`: Used by React and other libraries to optimize for development or
  production. For example, React includes additional warnings and development
  tools when `NODE_ENV` is set to `development`.

### Loading Environment Variables

The framework loads environment variables from the appropriate `.env` file based
on the task being run. This is configured in the `deno.json` file:

```json
{
  "tasks": {
    "build": {
      "description": "Builds the application in production mode.",
      "command": "deno run -A --env-file --env-file=.env.production ./build.ts"
    },
    "run": {
      "description": "Runs the application in production mode. Requires the application to be built first.",
      "command": "deno run -A --env-file --env-file=.env.production ./main.ts"
    },
    "dev": {
      "description": "Builds and runs the application in development mode, with hot reloading.",
      "command": "deno run -A --env-file --env-file=.env.development ./dev.ts"
    },
    "test": {
      "description": "Runs the tests.",
      "command": "deno test -A --trace-leaks --env-file --env-file=.env.test"
    }
  }
}
```

### Custom Environment Files

You can create additional environment files for specific needs:

#### .env.local

For local development with environment-specific variables that shouldn't be
committed to version control, such as API keys or database credentials:

```env
# Local development secrets - DO NOT COMMIT
ADMIN_USER=admin
ADMIN_PASSWORD=secure_password
API_KEY=your_api_key
```

To use a local environment file alongside the default ones, update your tasks in
`deno.json`:

```json
{
  "tasks": {
    "dev": {
      "description": "Builds and runs the application in development mode, with hot reloading.",
      "command": "deno run -A --env-file --env-file=.env.development --env-file=.env.local ./dev.ts"
    }
  }
}
```

When multiple `--env-file` flags are provided, variables from later files will
override those from earlier files if they have the same name.

### Environment Files and Version Control

It's important to handle environment files properly with version control:

- **Commit to version control**: The basic environment files
  (`.env.development`, `.env.production`, and `.env.test`) should be committed
  as they contain default configuration without secrets.
- **Exclude from version control**: Any environment files containing secrets or
  personal configuration should be excluded.

If you add local env files containing secrets, add them to your `.gitignore`
file to exclude them from version control:

```
# Environment variables with secrets
.env.local
.env.*.local
```

### Accessing Environment Variables

On the server, you can access environment variables using Deno's API:

```ts
// Server-side
const apiKey = Deno.env.get("API_KEY");

// Check the current environment
import { isDevelopment, isProduction } from "@udibo/react-app";

if (isDevelopment()) {
  // Development-specific code
}

if (isProduction()) {
  // Production-specific code
}

if (isServer()) {
  // Server-specific code
}

if (isBrowser()) {
  // Client-specific code
}
```

For client-side access to environment variables, you'll need to explicitly pass
them through your server-side rendering process, as client-side code cannot
directly access environment variables for security reasons.

These functions can be used to determine the current environment, they work on
the server and in the client:

- `isDevelopment()`: Returns `true` if the environment is `development` or not
  set.
- `isProduction()`: Returns `true` if the environment is `production`.
- `isTest()`: Returns `true` if the environment is `test`.
- `getEnvironment()`: Returns the current environment.

Then the following functions can be used to determine if code is running on the
server or the client:

- `isServer()`: Returns `true` if the code is running on the server.
- `isBrowser()`: Returns `true` if the code is running in the browser.
