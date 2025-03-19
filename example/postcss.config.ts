import type { PostCSSPluginOptions } from "@udibo/esbuild-plugin-postcss";
import tailwindcss from "@tailwindcss/postcss";

export default {
  modules: true,
  plugins: [tailwindcss()],
} as PostCSSPluginOptions;
