# Styling

This guide covers the various approaches to styling your Deno React application.
It explains how to use plain CSS, CSS modules, and CSS-in-JS libraries, as well
as how to set up and use preprocessors like PostCSS, Sass, Less, and Stylus. The
guide also includes detailed instructions for integrating Tailwind CSS (both v3
and v4) and explains how to use multiple preprocessors together in the same
project. Each section provides setup instructions with code examples to help you
implement your preferred styling approach.

- [Styling](#styling)
  - [CSS](#css)
  - [PostCSS](#postcss)
    - [Setup](#setup)
    - [Tailwindcss v3](#tailwindcss-v3)
      - [Setup](#setup-1)
    - [Tailwindcss v4](#tailwindcss-v4)
      - [Setup](#setup-2)
      - [Key Changes in Tailwind CSS v4](#key-changes-in-tailwind-css-v4)
    - [Sass](#sass)
      - [Setup](#setup-3)
    - [Less](#less)
      - [Setup](#setup-4)
    - [Stylus](#stylus)
      - [Setup](#setup-5)
  - [Using Multiple Preprocessors](#using-multiple-preprocessors)

## CSS

CSS (Cascading Style Sheets) is the standard styling language for web
applications. In a Deno React application, you can use CSS in several ways:

1. **Plain CSS files**: Create `.css` files and add links to them from your HTML
   or JSX files.
2. **CSS Modules**: Use `.module.css` files for component-scoped styling.
3. **CSS-in-JS libraries**: Libraries like
   [styled-components](https://styled-components.com/) or
   [emotion](https://emotion.sh/).
4. **Preprocessors**: Use preprocessors like [Sass](https://sass-lang.com/) or
   [Less](https://lesscss.org/) for enhanced CSS capabilities.

## PostCSS

[PostCSS](https://postcss.org/) is a tool for transforming CSS with JavaScript
plugins. It allows you to use modern CSS features, automate routine CSS
operations, and integrate various CSS tools.

To use PostCSS in your application, you can leverage the
`@udibo/esbuild-plugin-postcss` plugin. This plugin integrates PostCSS with
esbuild, allowing you to process your CSS files during the build process.

### Setup

1. First, create a `postcss.config.ts` file in your project root:

```ts
import type { PostCSSPluginOptions } from "@udibo/esbuild-plugin-postcss";
import postcssImport from "postcss-import";
import autoprefixer from "autoprefixer";

export default {
  modules: true, // Enable CSS modules if needed
  plugins: [
    postcssImport, // Allows @import rules in CSS
    autoprefixer, // Adds vendor prefixes to CSS
  ],
} as PostCSSPluginOptions;
```

2. Then, update your build script to use the PostCSS plugin:

```ts
import { buildOnce, type BuildOptions } from "@udibo/react-app/build";
import { postCSSPlugin } from "@udibo/esbuild-plugin-postcss";

import postcssConfig from "./postcss.config.ts";

const buildOptions: BuildOptions = {
  entryPoints: ["./routes/main.css"], // Your main CSS entry point
  esbuildPlugins: [
    postCSSPlugin(postcssConfig),
  ],
};

export default buildOptions;

if (import.meta.main) {
  buildOnce(buildOptions);
}
```

3. Make sure to add the necessary dependencies to your `deno.json` or
   `deno.jsonc`:

```json
{
  "imports": {
    "@udibo/esbuild-plugin-postcss": "jsr:@udibo/esbuild-plugin-postcss@^0.1",
    "autoprefixer": "npm:autoprefixer@10",
    "postcss-import": "npm:postcss-import@16"
  }
}
```

### Tailwindcss v3

[Tailwind CSS](https://tailwindcss.com/) is a utility-first CSS framework that
allows you to build designs directly in your markup. It provides low-level
utility classes that let you build completely custom designs without ever
leaving your HTML.

#### Setup

1. Create a `tailwind.config.ts` file:

```ts
import type { Config } from "tailwindcss";

export default {
  content: [
    "{routes,components}/**/*.{ts,tsx,js,jsx}", // Paths to your components
  ],
} as Config;
```

2. Update your `postcss.config.ts` to include Tailwind CSS:

```ts
import type { PostCSSPluginOptions } from "@udibo/esbuild-plugin-postcss";
import postcssImport from "postcss-import";
import autoprefixer from "autoprefixer";
import tailwindcss from "tailwindcss";

import tailwindcssConfig from "./tailwind.config.ts";

export default {
  modules: true,
  plugins: [
    postcssImport,
    autoprefixer,
    tailwindcss(tailwindcssConfig),
  ],
} as PostCSSPluginOptions;
```

3. Create a main CSS file (e.g., `main.css`) with Tailwind directives:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

4. Add Tailwind CSS and its plugins to your `deno.json` or `deno.jsonc`:

```json
{
  "imports": {
    "tailwindcss": "npm:tailwindcss@3"
  }
}
```

5. For better IDE support, you can add this to your `.vscode/settings.json`:

```json
{
  "files.associations": {
    "*.css": "tailwindcss"
  },
  "editor.quickSuggestions": {
    "strings": true
  }
}
```

### Tailwindcss v4

[Tailwind CSS v4](https://tailwindcss.com/) is a major update to the
utility-first CSS framework with significant improvements in performance,
developer experience, and features. It introduces a new engine called Oxide,
built in Rust, which provides faster builds and a more streamlined development
experience. The plugins postcss-import and autoprefixer are needed in Tailwind
CSS v4.

#### Setup

1. Update your `postcss.config.ts` to include Tailwind CSS v4:

```ts
import type { PostCSSPluginOptions } from "@udibo/esbuild-plugin-postcss";
import tailwindcss from "@tailwindcss/postcss";

export default {
  modules: true,
  plugins: [
    tailwindcss(),
  ],
} as PostCSSPluginOptions;
```

3. Create a main CSS file (e.g., `main.css`) with Tailwind directives:

```css
@import "tailwindcss";
```

4. Add Tailwind CSS v4 to your `deno.json` or `deno.jsonc`:

```json
{
  "imports": {
    "tailwindcss": "npm:tailwindcss@4",
    "@tailwindcss/postcss": "npm:@tailwindcss/postcss@4"
  }
}
```

5. For better IDE support, you can add this to your `.vscode/settings.json`:

```json
{
  "files.associations": {
    "*.css": "tailwindcss"
  },
  "editor.quickSuggestions": {
    "strings": true
  }
}
```

#### Key Changes in Tailwind CSS v4

1. **Built-in Plugins**: Official plugins are now included in the main package
   and accessed via the `plugins` property.

2. **No Need for Autoprefixer**: Tailwind CSS v4 handles vendor prefixing
   internally, so autoprefixer is no longer needed.

3. **New Color System**: The color system has been redesigned with a new palette
   and improved naming conventions.

4. **Simplified Configuration**: Many configuration options have been simplified
   or removed.

5. **Improved Performance**: The new Oxide engine provides significantly faster
   builds.

6. **CSS Variables by Default**: All colors are now implemented using CSS
   variables by default.

7. **New Syntax for Arbitrary Properties**: The syntax for arbitrary properties
   has been updated to use square brackets.

For a complete guide to migrating from v3 to v4, see the
[official Tailwind CSS v4 upgrade guide](https://tailwindcss.com/docs/upgrade-guide).

### Sass

[Sass](https://sass-lang.com/) (Syntactically Awesome Style Sheets) is a CSS
preprocessor that adds features like variables, nested rules, mixins, and
functions to CSS.

#### Setup

1. Update your `postcss.config.ts` file to include the Sass preprocessor:

```ts
import type { PostCSSPluginOptions } from "@udibo/esbuild-plugin-postcss";
import postcssImport from "postcss-import";
import autoprefixer from "autoprefixer";
import { sassPreprocessor } from "@udibo/esbuild-plugin-postcss/sass";

export default {
  modules: true,
  plugins: [
    postcssImport,
    autoprefixer,
  ],
  preprocessors: [
    sassPreprocessor(), // Use Sass preprocessor with default options
  ],
} as PostCSSPluginOptions;
```

2. Update your build script to include Sass files as entry points:

```ts
import { buildOnce, type BuildOptions } from "@udibo/react-app/build";
import { postCSSPlugin } from "@udibo/esbuild-plugin-postcss";

import postcssConfig from "./postcss.config.ts";

const buildOptions: BuildOptions = {
  entryPoints: ["./styles/main.scss"], // Your main Sass entry point
  esbuildPlugins: [
    postCSSPlugin(postcssConfig),
  ],
};

export default buildOptions;
```

3. Create `.scss` or `.sass` files with Sass syntax:

```scss
@use "sass:list";
@use "sass:color";

$font-stack: Helvetica, Arial;
$primary-color: #333;

body {
  $font-stack: list.append($font-stack, sans-serif);
  font: $font-stack;
}

a {
  color: $primary-color;

  &:hover {
    color: color.scale($primary-color, $lightness: 20%);
  }
}
```

You can also pass options to the Sass preprocessor in your postcss.config.ts
file:

```ts
sassPreprocessor({
  // Sass options here
  style: "compressed",
  loadPaths: ["./node_modules"],
});
```

For more information about Sass options, see the
[Sass documentation](https://sass-lang.com/documentation/js-api).

### Less

[Less](https://lesscss.org/) is a CSS preprocessor that extends CSS with dynamic
behavior such as variables, mixins, operations, and functions.

#### Setup

1. Update your `postcss.config.ts` file to include the Less preprocessor:

```ts
import type { PostCSSPluginOptions } from "@udibo/esbuild-plugin-postcss";
import postcssImport from "postcss-import";
import autoprefixer from "autoprefixer";
import { lessPreprocessor } from "@udibo/esbuild-plugin-postcss/less";

export default {
  modules: true,
  plugins: [
    postcssImport,
    autoprefixer,
  ],
  preprocessors: [
    lessPreprocessor(), // Use Less preprocessor with default options
  ],
} as PostCSSPluginOptions;
```

2. Update your build script to include Less files as entry points:

```ts
import { buildOnce, type BuildOptions } from "@udibo/react-app/build";
import { postCSSPlugin } from "@udibo/esbuild-plugin-postcss";

import postcssConfig from "./postcss.config.ts";

const buildOptions: BuildOptions = {
  entryPoints: ["./styles/main.less"], // Your main Less entry point
  esbuildPlugins: [
    postCSSPlugin(postcssConfig),
  ],
};

export default buildOptions;
```

3. Create `.less` files with Less syntax:

```less
@primary-color: #333;
@font-stack: Helvetica, Arial, sans-serif;

body {
  font: @font-stack;
}

a {
  color: @primary-color;

  &:hover {
    color: lighten(@primary-color, 20%);
  }
}
```

You can also pass options to the Less preprocessor in your postcss.config.ts
file:

```ts
lessPreprocessor({
  // Less options here
  math: "always",
  paths: ["./node_modules"],
});
```

For more information about Less options, see the
[Less documentation](https://lesscss.org/api/).

### Stylus

[Stylus](https://stylus-lang.com/) is an expressive, dynamic, and robust CSS
preprocessor that offers a more concise syntax compared to CSS, along with
powerful features like variables, mixins, and functions.

#### Setup

1. Update your `postcss.config.ts` file to include the Stylus preprocessor:

```ts
import type { PostCSSPluginOptions } from "@udibo/esbuild-plugin-postcss";
import postcssImport from "postcss-import";
import autoprefixer from "autoprefixer";
import { stylusPreprocessor } from "@udibo/esbuild-plugin-postcss/stylus";

export default {
  modules: true,
  plugins: [
    postcssImport,
    autoprefixer,
  ],
  preprocessors: [
    stylusPreprocessor(), // Use Stylus preprocessor with default options
  ],
} as PostCSSPluginOptions;
```

2. Update your build script to include Stylus files as entry points:

```ts
import { buildOnce, type BuildOptions } from "@udibo/react-app/build";
import { postCSSPlugin } from "@udibo/esbuild-plugin-postcss";

import postcssConfig from "./postcss.config.ts";

const buildOptions: BuildOptions = {
  entryPoints: ["./styles/main.styl"], // Your main Stylus entry point
  esbuildPlugins: [
    postCSSPlugin(postcssConfig),
  ],
};

export default buildOptions;
```

3. Create `.styl` files with Stylus syntax:

```stylus
primary-color = #333
font-stack = Helvetica, Arial, sans-serif

body
  font: font-stack

a
  color: primary-color
  
  &:hover
    color: lighten(primary-color, 20%)
```

You can also pass options to the Stylus preprocessor in your postcss.config.ts
file:

```ts
stylusPreprocessor({
  // Stylus options here
  compress: true,
  paths: ["./node_modules"],
});
```

For more information about Stylus options, see the
[Stylus documentation](https://stylus-lang.com/docs/js-api).

## Using Multiple Preprocessors

You can use multiple preprocessors in the same project by adding them to the
preprocessors array in your postcss.config.ts file:

```ts
import type { PostCSSPluginOptions } from "@udibo/esbuild-plugin-postcss";
import postcssImport from "postcss-import";
import autoprefixer from "autoprefixer";
import { sassPreprocessor } from "@udibo/esbuild-plugin-postcss/sass";
import { lessPreprocessor } from "@udibo/esbuild-plugin-postcss/less";
import { stylusPreprocessor } from "@udibo/esbuild-plugin-postcss/stylus";

export default {
  modules: true,
  plugins: [
    postcssImport,
    autoprefixer,
  ],
  preprocessors: [
    sassPreprocessor(),
    lessPreprocessor(),
    stylusPreprocessor(),
  ],
} as PostCSSPluginOptions;
```

Then update your build script to include entry points for all preprocessor file
types:

```ts
import { buildOnce, type BuildOptions } from "@udibo/react-app/build";
import { postCSSPlugin } from "@udibo/esbuild-plugin-postcss";

import postcssConfig from "./postcss.config.ts";

const buildOptions: BuildOptions = {
  entryPoints: [
    "./styles/main.scss",
    "./styles/components.less",
    "./styles/utilities.styl",
  ],
  esbuildPlugins: [
    postCSSPlugin(postcssConfig),
  ],
};

export default buildOptions;
```

This allows you to use different preprocessors for different parts of your
application, giving you flexibility in your styling approach.
