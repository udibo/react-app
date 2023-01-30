import * as path from "std/path/mod.ts";
import { serve } from "x/udibo_react_app/app_server.tsx";

import route from "./routes/_main.tsx";
import router from "./routes/_main.ts";
import { AppContext } from "./context.ts";

await serve({
  port: 9000,
  router,
  route,
  workingDirectory: path.dirname(path.fromFileUrl(import.meta.url)),
  Context: AppContext,
});
