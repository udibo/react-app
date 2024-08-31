import * as path from "@std/path";
import { serve } from "@udibo/react-app/server";

import route from "./routes/_main.tsx";
import router from "./routes/_main.ts";
import "./log.ts";

await serve({
  port: 9000,
  router,
  route,
  workingDirectory: path.dirname(path.fromFileUrl(import.meta.url)),
});
