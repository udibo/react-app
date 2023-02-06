import { HttpError } from "x/udibo_react_app/mod.tsx";

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
