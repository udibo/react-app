import { Router } from "@udibo/react-app/server";
import * as log from "@std/log";

import type { AppState } from "../state.ts";

export default new Router<AppState>()
  .use(async (context, next) => {
    const { request, response } = context;
    const start = Date.now();
    try {
      await next();
    } finally {
      const responseTime = Date.now() - start;
      response.headers.set("X-Response-Time", `${responseTime}ms`);
      log.info(
        `${request.method} ${request.url.href}`,
        { status: response.status, responseTime },
      );
    }
  });
