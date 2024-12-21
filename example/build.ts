import { buildOnce, type BuildOptions } from "@udibo/react-app/build";
import { postCSSPlugin } from "@udibo/esbuild-plugin-postcss";
import postcssImport from "postcss-import";
import autoprefixer from "autoprefixer";
import tailwindcss from "tailwindcss";
import tailwindcssForms from "@tailwindcss/forms";
import tailwindcssTypography from "@tailwindcss/typography";
import tailwindcssAspectRatio from "@tailwindcss/aspect-ratio";
import tailwindcssContainerQueries from "@tailwindcss/container-queries";

import "./log.ts";

export const buildOptions: BuildOptions = {
  entryPoints: ["./main.css"],
  esbuildPlugins: [
    postCSSPlugin({
      modules: true,
      plugins: [
        postcssImport,
        autoprefixer(),
        tailwindcss({
          content: [
            "./routes/**/*.tsx",
            "./components/**/*.tsx",
          ],
          plugins: [
            tailwindcssForms,
            tailwindcssTypography,
            tailwindcssAspectRatio,
            tailwindcssContainerQueries,
          ],
        }),
      ],
    }),
  ],
};

if (import.meta.main) {
  buildOnce(buildOptions);
}
