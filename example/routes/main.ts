import { Router } from "@udibo/react-app/server";

import type { AppState } from "../state.ts";

export default new Router<AppState>()
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
