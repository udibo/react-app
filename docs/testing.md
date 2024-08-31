# Testing

TODO: Make an outline then fill it in with details.

- [Testing](#testing)
  - [Running tests](#running-tests)
    - [Deno](#deno)
    - [Docker](#docker)
  - [Writing tests](#writing-tests)
    - [Server](#server)
    - [User interface](#user-interface)
      - [React testing library](#react-testing-library)
      - [Playwright](#playwright)
  - [Coverage reports](#coverage-reports)

## Running tests

### Deno

TODO: Talk about using the test tasks. Link to the development tools guide for
more details about the tasks.

### Docker

TODO: Explain how docker can be used for running application dependencies like
postgres along with how to setup running your tests in a docker container.

## Writing tests

TODO: Cover the basics of writing tests, linking to Deno's guides on that
subject. Be sure to mention BDD, Mocking, Fake time and timers, Snapshot
testing, and type assertions.

### Server

TODO: Cover writing tests for server routes. End to end tests for endpoints for
both the API and UI. Use snapshot testing for UI route responses since they
return HTML pages.

### User interface

TODO: Cover testing components and writing end to end tests for routes using
react testing library and playwright

#### React testing library

#### Playwright

TODO: See https://github.com/denoland/deno/issues/16899 for information about
this. Write a guide on it. If possible include a link to how to include it's
coverage in the coverage reports.

## Coverage reports

TODO: Write how to see coverage in console. Link to development tools section on
using codecov.
