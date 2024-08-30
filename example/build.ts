import { buildOnce, type BuildOptions } from "@udibo/react-app/build";
import "./log.ts";

export const buildOptions: BuildOptions = {
  configPath: "../deno.jsonc",
};

if (import.meta.main) {
  buildOnce(buildOptions);
}
