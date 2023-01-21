import { Router } from "$x/oak/mod.ts";
import { HttpError, isHttpError } from "$x/udibo_react_app/error.tsx";

import { blogRouter } from "./blog/main.ts";

const apiRouter = new Router()
  .use(async ({ response }, next) => {
    try {
      await next();
    } catch (cause) {
      const error = isHttpError(cause)
        ? HttpError.from(cause)
        : new HttpError(500, { cause });
      console.error("api error", error);

      response.status = error.status;
      response.body = HttpError.json(error);
    }
  });

apiRouter.use("/blog", blogRouter.routes(), blogRouter.allowedMethods());

apiRouter.all("/(.*)", () => {
  throw new HttpError(404, "Not found");
});

export { apiRouter };
