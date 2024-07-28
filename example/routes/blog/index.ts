import { Router } from "@udibo/react-app/server";

import { getPosts } from "../../services/posts.ts";
import type { AppState } from "../../state.ts";

export default new Router<AppState>()
  .get("/", async (context) => {
    const { state } = context;

    state.app.initialState.posts = getPosts();
    await state.app.render();
  });
