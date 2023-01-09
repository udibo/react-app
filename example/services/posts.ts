import { HttpError } from "$x/http_error/mod.ts";

import { posts } from "../data/posts.ts";

export function getPosts() {
  return posts;
}

export function getPost(id: number) {
  const post = posts[id];
  if (!post) throw new HttpError(404, "Not found");
  return post;
}
