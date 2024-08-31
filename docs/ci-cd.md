# CI/CD

Continuous integration and continuous deployment is a process for developing
apps faster, safer, and more efficiently. It is the automation of the manual,
repetitive, and error prone tasks involved in integrating and deploying changes.
The [ci](#ci) section covers building and testing your application. The
[CD](#cd) section covers automating deploying your changes.

- [CI/CD](#cicd)
  - [CI](#ci)
    - [GitHub actions](#github-actions)
  - [CD](#cd)
    - [GitHub actions](#github-actions-1)
      - [Deno Deploy](#deno-deploy)
      - [AWS](#aws)

## CI

Continuous integration is all about building and testing your application to
ensure changes made will work correctly if merged into the codebase. It will
help you identify any conflicts or error caused by changes. This can be used to
show the results of testing a change. It also helps developers identify and
correct issues earlier.

GitHub actions is one of the environments where this automation can exist. Other
code hosting platforms have similar offerings. While this document doesn't cover
all of them, you can develop it based on the steps described in this section.

### GitHub actions

TODO: Go over using our CI workflow and what our CI workflow example is doing.
Describe how they can take and modify our CI workflow if it doesn't meet their
needs.

## CD

Continuous deployment is about building and deploying your application after a
change has passed CI. It can involve deploying to both staging and production
environments. Automating deployment can help release software updates to
customers as soon as they have been validated.

GitHub actions is one of the environments where this automation can exist. Other
code hosting platforms have similar offerings. While this document doesn't cover
all of them, you can develop it based on the steps described in this section.

### GitHub actions

TODO: Go over using our CD workflow and what our CD workflow example is doing.
Describe how they can take and modify our CD workflow if it doesn't meet their
needs.

#### Deno Deploy

TODO: Write instructions on this. Link back to Deno Deploy documentation.

#### AWS

TODO: Describe how to do this with docker.
