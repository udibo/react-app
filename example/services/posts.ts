import { HttpError } from "$x/http_error/mod.ts";

import { posts } from "../data/posts.ts";

export function getPosts() {
  return [...posts, {
    id: 2,
    title: "Fake post",
    content: "This post does not exist.",
  }];
}

export function getPost(id: number) {
  const post = posts[id];
  if (!post) throw new HttpError(404, "Not found");
  return post;
}
