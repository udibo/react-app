import { middleware } from "$x/udibo_react_app/app_server.tsx";

import { getPosts } from "../../services/posts.ts";

export default [
  middleware("get", async (context) => {
    const { state } = context;

    state.app.context.posts = getPosts();
    await state.app.render();
  }),
];
