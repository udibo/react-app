import { Router } from "$x/oak/mod.ts";
import { HttpError } from "$x/http_error/mod.ts";

import { getPost, getPosts } from "../../services/posts.ts";

const postsRouter = new Router();
postsRouter.get("/", (context) => {
  const { response } = context;
  response.body = getPosts();
});
postsRouter.get("/:id", (context) => {
  const { response, params } = context;
  const id = parseFloat(params.id);
  if (isNaN(id) || Math.floor(id) !== id || id < 0) {
    throw new HttpError(400, "Invalid id");
  }
  const post = getPost(id);
  if (!post) throw new HttpError(404, "Not found");
  response.body = post;
});

export { postsRouter };
