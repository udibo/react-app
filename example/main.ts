import * as path from "$std/path/mod.ts";
import { etag, Router } from "$x/oak/mod.ts";
import { serve } from "$x/udibo_react_app/app_server.tsx";

import { route } from "./_app.tsx";
import { router as appRouter } from "./_app.ts";
import { apiRouter } from "./api/main.ts";

const router = new Router()
  .use(async (context, next) => {
    const { request, response } = context;
    const start = Date.now();
    try {
      await next();
    } finally {
      const dt = Date.now() - start;
      response.headers.set("X-Response-Time", `${dt}ms`);
      console.log({
        status: response.status,
        method: request.method,
        href: request.url.href,
        responseTime: dt,
      });
    }
  })
  .use("/api", apiRouter.routes(), apiRouter.allowedMethods())
  .use(etag.factory())
  .use(appRouter.routes(), appRouter.allowedMethods());

await serve({
  port: 9000,
  router,
  route,
  root: path.dirname(path.fromFileUrl(import.meta.url)),
});
