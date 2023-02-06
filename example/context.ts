import { createAppContext } from "x/udibo_react_app/mod.tsx";
import { Post } from "./models/posts.ts";

export const AppContext = createAppContext<{
  posts?: Post[];
}>();
