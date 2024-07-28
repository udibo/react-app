import { HttpError } from "@udibo/react-app";
import { Router } from "@udibo/react-app/server";

import { getPost } from "../../services/posts.ts";
import type { AppState } from "../../state.ts";

export default new Router<AppState>()
  .get("/", async (context) => {
    const { state, params } = context;
    const id = Number(params.id);
    if (isNaN(id) || Math.floor(id) !== id || id < 0) {
      throw new HttpError(400, "Invalid id");
    }

    state.app.initialState.posts = {
      [id]: getPost(id),
    };
    await state.app.render();
  });
