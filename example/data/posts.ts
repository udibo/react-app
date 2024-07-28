import type { Post } from "../models/posts.ts";

export const posts: { [id: number]: Post } = {
  0: {
    id: 0,
    title: "My first post",
    content: "This is my first post.",
  },
  1: {
    id: 1,
    title: "My second post",
    content: "This is my second post.",
  },
};
