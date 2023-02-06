import { AppState } from "x/udibo_react_app/server.tsx";
import { Router } from "x/oak/mod.ts";

import { getPosts } from "../../services/posts.ts";

export default new Router<AppState>()
  .get("/", async (context) => {
    const { state } = context;

    state.app.context.posts = getPosts();
    await state.app.render();
  });
