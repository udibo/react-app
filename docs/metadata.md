# Metadata

- [Metadata](#metadata)
  - [Setting metadata](#setting-metadata)
  - [SEO](#seo)
    - [Essential SEO Meta Tags](#essential-seo-meta-tags)
    - [SEO Best Practices](#seo-best-practices)
    - [Testing SEO with Lighthouse](#testing-seo-with-lighthouse)
      - [How to Use Lighthouse](#how-to-use-lighthouse)
      - [Key SEO Metrics in Lighthouse](#key-seo-metrics-in-lighthouse)
      - [Fixing Common SEO Issues](#fixing-common-seo-issues)

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
import { Outlet } from "react-router";
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

Search Engine Optimization (SEO) is crucial for ensuring your web application is
discoverable by search engines and ranks well in search results.

### Essential SEO Meta Tags

Here's how to implement essential SEO meta tags using React Helmet:

```tsx
<Helmet>
  {/* Primary Meta Tags */}
  <title>Your Page Title</title>
  <meta name="title" content="Your Page Title" />
  <meta
    name="description"
    content="A compelling description of your page content in 150-160 characters."
  />

  {/* Open Graph */}
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://yourdomain.com/page-path" />
  <meta property="og:title" content="Your Page Title" />
  <meta
    property="og:description"
    content="A compelling description of your page content."
  />
  <meta
    property="og:image"
    content="https://yourdomain.com/path-to-image.jpg"
  />

  {/* Canonical URL */}
  <link rel="canonical" href="https://yourdomain.com/page-path" />
</Helmet>;
```

### SEO Best Practices

1. **Unique Title and Description**: Each page should have a unique, descriptive
   title (50-60 characters) and meta description (150-160 characters).

2. **Structured Data**: Implement structured data (JSON-LD) to help search
   engines understand your content better:

```tsx
<Helmet>
  <script type="application/ld+json">
    {`
      {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": "Article Title",
        "author": {
          "@type": "Person",
          "name": "Author Name"
        },
        "datePublished": "2023-01-01T08:00:00+08:00",
        "image": "https://yourdomain.com/article-image.jpg"
      }
    `}
  </script>
</Helmet>;
```

3. **Responsive Design**: Ensure your site is mobile-friendly with the viewport
   meta tag:

```tsx
<meta name="viewport" content="width=device-width, initial-scale=1.0" />;
```

4. **Semantic HTML**: Use proper heading hierarchy (h1, h2, etc.) and semantic
   HTML elements throughout your application.

### Testing SEO with Lighthouse

[Lighthouse](https://developers.google.com/web/tools/lighthouse) is an
open-source tool from Google that helps improve the quality of web pages by
auditing performance, accessibility, SEO, and more.

#### How to Use Lighthouse

1. **Chrome DevTools**:
   - Open Chrome DevTools (F12 or Right-click > Inspect)
   - Navigate to the "Lighthouse" tab
   - Select "SEO" among the categories to audit
   - Click "Generate report"

2. **Lighthouse CLI**:
   ```bash
   # Install Lighthouse globally
   npm install -g lighthouse

   # Run Lighthouse audit
   lighthouse https://yourdomain.com --only-categories=seo --view
   ```

3. **Programmatic Usage**: You can integrate Lighthouse into your CI/CD pipeline
   to automatically test SEO on each deployment.

#### Key SEO Metrics in Lighthouse

Lighthouse checks for these important SEO factors:

- Document has a meta description
- Document has a valid `robots.txt`
- Document has a valid canonical URL
- Links have descriptive text
- Page is mobile-friendly
- Document uses legible font sizes
- Structured data is valid

#### Fixing Common SEO Issues

If Lighthouse identifies SEO issues, here's how to address them:

1. **Missing Meta Description**:
   ```tsx
   <Helmet>
     <meta name="description" content="Your compelling description here" />
   </Helmet>;
   ```

2. **Invalid Canonical URL**:
   ```tsx
   <Helmet>
     <link rel="canonical" href="https://yourdomain.com/correct-path" />
   </Helmet>;
   ```

3. **Non-descriptive Link Text**: Replace links like "Click here" with
   descriptive text like "Learn more about our services".

By implementing these SEO best practices and regularly testing with Lighthouse,
you can improve your application's visibility in search engines and provide a
better experience for users finding your content through search.
