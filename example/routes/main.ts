import { Router } from "x/oak/mod.ts";

export default new Router()
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
  });
