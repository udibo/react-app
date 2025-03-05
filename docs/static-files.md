# Static files

- [Static files](#static-files)
  - [Introduction](#introduction)
  - [Public Directory](#public-directory)
  - [Serving Static Files](#serving-static-files)
  - [Build Artifacts](#build-artifacts)
  - [Static Assets](#static-assets)
  - [Best Practices](#best-practices)

## Introduction

Static files are an essential part of web applications, including images,
stylesheets, client-side JavaScript, fonts, and other assets that don't change
frequently. The Udibo React App framework provides a straightforward way to
serve these files to clients.

## Public Directory

The framework uses a `public` directory at the root of your project to store and
serve static files. This directory serves as the root path for all static file
requests.

```
my-app/
├── public/           # Static files directory
│   ├── build/        # Build artifacts
│   ├── images/       # Image files
│   ├── styles/       # CSS files
│   ├── scripts/      # Client-side JavaScript files
│   ├── fonts/        # Font files
│   └── ...           # Other static assets
├── routes/           # Application routes
└── ...
```

Any file placed in the `public` directory will be accessible via a URL path
relative to the root of your application. For example, a file at
`public/images/logo.png` would be accessible at `/images/logo.png` in your
application.

The example above shows the `public` directory with a build directory for build
artifacts. All of the other folders in the public directory are optional. You
can structure your public directory however you like.

If you'd like to have a different directory for your public files, you can
change the `publicDir` option in the server's configuration.

## Serving Static Files

The framework automatically configures the server to serve files from the
`public` directory. When a request comes in for a path that doesn't match any of
your defined routes, the server checks if a file exists at the corresponding
path in the `public` directory.

For example:

- Request for `/styles/main.css` → Serves `public/styles/main.css`
- Request for `/images/logo.png` → Serves `public/images/logo.png`

This behavior allows you to reference static files in your HTML, CSS, and
JavaScript without needing to write any additional server-side code to serve
them.

## Build Artifacts

When you build your React application, the build artifacts (compiled JavaScript,
CSS, and other assets) are automatically stored in the `public` directory. This
includes:

- Bundled and minified JavaScript files
- Compiled CSS files
- Optimized images and other assets
- Generated HTML files

The build process handles creating an optimized production build of your
application and placing it in the correct location for serving. This means you
don't need to manually configure the serving of these files - the framework
handles it automatically.

## Static Assets

To reference static assets in your React components, you can use absolute paths:

```jsx
// In a React component
function Logo() {
  return <img src="/images/logo.png" alt="Logo" />;
}
```

The same works for referencing them from static HTML files:

```html
<link rel="stylesheet" href="/styles/main.css" />
```

## Best Practices

1. **Organize your static files**: Keep your static files organized in
   subdirectories based on their type (images, styles, scripts, etc.).

2. **Optimize assets**: Compress and optimize images, minify CSS and JavaScript
   files to reduce load times. This framework automatically handles this for the
   build.

3. **Use versioning**: For cache-busting, consider using file versioning or
   content hashes in filenames for assets that change.

4. **Consider a CDN**: For production applications, consider using a Content
   Delivery Network (CDN) to serve static files for better performance.

5. **Don't store sensitive data**: Never store sensitive information in public
   static files, as they are accessible to anyone who knows the URL.
