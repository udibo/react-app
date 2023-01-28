import { HttpError } from "$x/http_error/mod.ts";
import { AppState, errorBoundary } from "$x/udibo_react_app/app_server.tsx";
import { Router } from "$x/oak/mod.ts";

import { getPost } from "../../services/posts.ts";

export default new Router<AppState>()
  .use(errorBoundary("/blog/[id]"))
  .get("/", async (context) => {
    const { state, params } = context;
    const id = Number(params.id);
    if (isNaN(id) || Math.floor(id) !== id || id < 0) {
      throw new HttpError(400, "Invalid id");
    }

    state.app.context.posts = {
      [id]: getPost(id),
    };
    await state.app.render();
  });
