# Database

- [Database](#database)
  - [Scorage options](#scorage-options)
    - [Deno.kv](#denokv)
      - [Using in local development and testing](#using-in-local-development-and-testing)
      - [Using in production](#using-in-production)
        - [Deno Deploy](#deno-deploy)
        - [VPS](#vps)
    - [Drizzle (PostgreSQL, MySQL, or SQLite)](#drizzle-postgresql-mysql-or-sqlite)
      - [Using docker for local developement and testing](#using-docker-for-local-developement-and-testing)
      - [Using remote services in production](#using-remote-services-in-production)

## Scorage options

### Deno.kv

#### Using in local development and testing

#### Using in production

##### Deno Deploy

##### VPS

Cover the scaling limitations of this. It would use SQLite on the machine and it
wouldn't be distributed.

### Drizzle (PostgreSQL, MySQL, or SQLite)

TODO: Cover the basics of drizzle.

TODO: Include a reference to this issue for Deno not supporting drizzle kit
studio. https://github.com/denoland/deno/issues/28022

TODO: Cover using `deno task drizzle-kit generate --custom` to generate the
initial migration for installing extensions. The example did that to install the
uuidv7 extension.

#### Using docker for local developement and testing

TODO: Cover how you can use docker in development for creating a local
PostgreSQL database for testing purposes. Provide both a development and testing
database to connect to. The testing one will be used by tests and the
development one will be used for the dev version of the site. Include how to
reset them.

TODO: Use OTEL logging guide and look at fresh for example of how to setup
docker to run postgres.

#### Using remote services in production

Describe connecting to a database service. Use Neon serverless database's free
plan in this section.
