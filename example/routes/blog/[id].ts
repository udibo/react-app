import { HttpError } from "@udibo/react-app";
import { Router } from "@udibo/react-app/server";

import { getPost } from "../../services/posts.ts";
import { GetPostResponse } from "../../services/posts.tsx";
import { z, ZodError } from "zod";

export default new Router<{
  getPost: GetPostResponse;
}>()
  .get("/", async (context) => {
    const { state, params } = context;

    try {
      const id = z.string().uuid().parse(params.id);
      state.app.initialState.getPost = await getPost(id);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new HttpError(400, "Invalid id");
      }
      throw error;
    }
    await state.app.render();
  });
