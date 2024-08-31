# Metadata

- [Metadata](#metadata)
  - [Setting metadata](#setting-metadata)
  - [SEO](#seo)

## Setting metadata

[React Helmet Async](https://www.npmjs.com/package/react-helmet-async) is used
to manage all of your changes to the document head. You can add a Helmet tag to
any page that you would like to update the document head.

- Supports all valid head tags: title, base, meta, link, script, noscript, and
  style tags.
- Supports attributes for body, html and title tags.

The following example can be found in the [main route](example/routes/main.tsx)
of the example in this repository. The Helmet in the main route of a directory
will apply to all routes within the directory.

```tsx
import { Suspense } from "react";
import { DefaultErrorFallback, ErrorBoundary, Helmet } from "@udibo/react-app";
import { Outlet } from "react-router-dom";
import "../log.ts";

import { Loading } from "../components/loading.tsx";

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
      <Suspense fallback={<Loading />}>
        <ErrorBoundary FallbackComponent={DefaultErrorFallback}>
          <Outlet />
        </ErrorBoundary>
      </Suspense>
    </>
  );
}
```

More examples of Helmet tag usage can be found in the
[React Helmet Reference Guide](https://github.com/nfl/react-helmet#reference-guide).

## SEO

TODO: Explain the basics of setting up SEO metadata and using lighthouse to test
it.
