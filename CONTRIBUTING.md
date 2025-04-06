# Contributing

To contribute, create an issue or comment on an existing issue that you would
like to work on. All code contributions require test coverage and must pass
formatting/lint checks before being approved and merged.

## Prerequisites

You must install `deno` and `docker` to be able to run the application and it's
tests locally.

- https://deno.land
- https://docs.docker.com/get-docker/

If you are using WSL 2, you should install Docker Desktop on windows, then
[turn on Docker Desktop WSL 2](https://docs.docker.com/desktop/features/wsl/#turn-on-docker-desktop-wsl-2)

## Development

For development, the tests and example application can be run with deno.

To be able to run the tests, you will need to start up the services it depends
on. After starting the services it will apply all the migrations for them. You
can choose to just start the tests or just start udibo locally in your
development environment. If the test services are not started before running the
tests, all tests that depend on them will fail.

```sh
deno task start
# or
deno task start-dev
deno task start-test
```

To run the tests, use `deno task test` or `deno task test-watch`.

To check formatting and run lint, use `deno task check`.

To create a production build and to run the production build, use
`deno task build` and `deno task run`.

To run the application in development mode with live reloading, use
`deno task dev`.

This repository uses squash merging. If your branch is merged into main, you can
get your branch back up to date with `deno task git-rebase`. Alternatively, you
can delete your branch and create a new one off of the main branch.

To learn more about working on this framework, see the [documentation](docs).
