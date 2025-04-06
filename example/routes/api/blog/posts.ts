import { HttpError } from "@udibo/react-app";
import { Router } from "@udibo/react-app/server";
import { ZodError } from "zod";

import { createPost, getPost, getPosts } from "../../../services/posts.ts";
import { postInsertSchema } from "../../../database/schema/posts.ts";

export default new Router()
  .get("/", async (context) => {
    const { response } = context;
    response.body = await getPosts();
  })
  .get("/:id", async (context) => {
    const { response, params } = context;
    response.body = await getPost(params.id);
  })
  .post("/", async (context) => {
    const { request, response } = context;
    try {
      const data = postInsertSchema.parse(await request.body.json());
      response.body = await createPost(data);
    } catch (cause: unknown) {
      if (cause instanceof ZodError) {
        throw new HttpError(400, "Validation failed", {
          expose: true,
          errors: cause.errors.map((
            err: { path: (string | number)[]; message: string },
          ) => ({
            path: err.path.join("."),
            message: err.message,
          })),
        });
      }
      throw cause;
    }
  });
