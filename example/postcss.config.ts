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
} satisfies PostCSSPluginOptions;
