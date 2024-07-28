import type { Post } from "./models/posts.ts";

export type AppState = {
  posts?: { [id: number]: Post };
};
