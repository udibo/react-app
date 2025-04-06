# Development tools

TODO: Make an outline then fill it in with details.

- [Development tools](#development-tools)
  - [VS Code](#vs-code)
    - [Configuration](#configuration)
    - [Debugging](#debugging)
  - [Docker](#docker)
  - [Cursor](#cursor)

## VS Code

### Configuration

TODO: Cover how to configure VS Code.

### Debugging

TODO: Explain how to use the debugger

## Docker

TODO: Cover how docker can be used to spin up databases and other services
locally that your application may depend on.

TODO: Explain the tasks added to the example that creates a postgres database
for the dev server and one for the test server.

TODO: Explain how to add the secrets for connecting to it to the respective env
files. In development have .env.production use the development database. Explain
that users should not commit actual secrets to the env files. If they want to
connect to a remote database when manually testing their production build, they
should add that file to their .gitignore to prevent it from getting committed.

TODO: Link to the databasse guide for more information about using postgres or
other databases.

## Cursor

Cursor is an AI code editor. It is a fork of VS Code, so everything in the
[VS Code section](#vs-code) would apply for this editor too. This section covers
usage unique to Cursor.
