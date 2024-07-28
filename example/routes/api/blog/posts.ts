import { HttpError } from "@udibo/react-app";
import { Router } from "@udibo/react-app/server";

import { getPost, getPosts } from "../../../services/posts.ts";
import type { AppState } from "../../../state.ts";

export default new Router<AppState>()
  .get("/", (context) => {
    const { response } = context;
    response.body = getPosts();
  })
  .get("/:id", (context) => {
    const { response, params } = context;
    const id = parseFloat(params.id);
    if (isNaN(id) || Math.floor(id) !== id || id < 0) {
      throw new HttpError(400, "Invalid id");
    }
    const post = getPost(id);
    if (!post) throw new HttpError(404, "Not found");
    response.body = post;
  });
