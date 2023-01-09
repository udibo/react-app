import { Router } from "$x/oak/mod.ts";
import { HttpError, isHttpError } from "$x/http_error/mod.ts";

import { blogRouter } from "./blog/main.ts";

const apiRouter = new Router()
  .use(async ({ response }, next) => {
    try {
      await next();
    } catch (cause) {
      console.error("api error", cause);

      response.status = isHttpError(cause) ? cause.status : 500;
      response.body = cause;
    }
  });

apiRouter.use("/blog", blogRouter.routes(), blogRouter.allowedMethods());

apiRouter.all("/(.*)", ({ response }) => {
  response.status = 404;
  response.body = new HttpError(404, "Not found");
});

export { apiRouter };
