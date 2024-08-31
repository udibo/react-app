import { Router } from "@udibo/react-app/server";

import { getPosts } from "../../services/posts.ts";
import type { PostsState } from "../../models/posts.ts";

export default new Router<PostsState>()
  .get("/", async (context) => {
    const { state } = context;

    state.app.initialState.posts = getPosts();
    await state.app.render();
  });
