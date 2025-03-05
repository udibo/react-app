import { buildOnce, type BuildOptions } from "@udibo/react-app/build";
import { postCSSPlugin } from "@udibo/esbuild-plugin-postcss";

import "./log.ts";
import postcssConfig from "./postcss.config.ts";

const buildOptions: BuildOptions = {
  entryPoints: ["./main.css"],
  esbuildPlugins: [
    postCSSPlugin(postcssConfig),
  ],
};
export default buildOptions;

if (import.meta.main) {
  buildOnce(buildOptions);
}
