import * as path from "$std/path/mod.ts";
import { serve } from "$x/udibo_react_app/app_server.tsx";

import { route } from "./_app.tsx";
import { router } from "./_app.ts";
import { apiRouter } from "./api/main.ts";

router.use("/api", apiRouter.routes(), apiRouter.allowedMethods());

await serve({
  port: 9000,
  router,
  route,
  root: path.dirname(path.fromFileUrl(import.meta.url)),
});
