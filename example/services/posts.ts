import { HttpError } from "@udibo/react-app";

import { posts } from "../data/posts.ts";
import type { Post } from "../models/posts.ts";

export function getPosts(): { [id: number]: Post } {
  return {
    ...posts,
    2: {
      id: 2,
      title: "Fake post",
      content: "This post does not exist.",
    },
  };
}

export function getPost(id: number) {
  const post = posts[id];
  if (!post) throw new HttpError(404, "Not found");
  return post;
}
