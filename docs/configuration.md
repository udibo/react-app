# Configuration

This guide covers the configuration options available for your project.

- [Configuration](#configuration)
  - [Tasks](#tasks)
  - [Compiler options](#compiler-options)
  - [Formatting and linting](#formatting-and-linting)
  - [Imports](#imports)
  - [Server](#server)
  - [Build](#build)
    - [esbuild](#esbuild)
  - [Development](#development)
  - [Environment variables](#environment-variables)

## Tasks

To learn more about using the default tasks, see the
[tasks](getting-started.md#tasks) section in the getting started guide. Each
task has a description of what it does in a comment above the task declaration.

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
[getting started guide](getting-started.md#denojsonc) should be sufficient for
most use cases. If you need to customize them, you can do so by modifying the
`compilerOptions` in the `deno.jsonc` file.

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

The imports section of the `deno.jsonc` file is used to configure an import map
for resolving bare specifiers. It makes it so that you don't have to specify the
version everywhere that your dependency is used and provides one centralized
place for updating those versions.

For example, if your import map has the entry `"react": "npm:react@18.3.1"`,
you'll be able to import react like `import React from "react"` and it will
resolve to `npm:react@18.3.1`.

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
artifacts. The working directory is the directory that contains the main entry
point file. The configuration for logging is stored in the `log.ts` file, for
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
  workingDirectory: path.dirname(path.fromFileUrl(import.meta.url)),
});
```

## Build

TODO: Include link to esbuild plugins. Link to our styling guide for examples of
using common styling plugins for esbuild.

### esbuild

## Development

## Environment variables

TODO: Cover the basics of environment variables, with a focus on how to use
dotfiles for development, production, and test environment variables. Update
tasks to use dotfiles.
