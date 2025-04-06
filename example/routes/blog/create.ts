import { Router } from "@udibo/react-app/server";
import { HttpError } from "@udibo/react-app";
import { ZodError } from "zod";
import { eq } from "drizzle-orm";

import { createPost } from "../../services/posts.ts";
import { NewPost, postInsertSchema } from "../../database/schema/posts.ts";
import { db } from "../../database/mod.ts";
import { usersTable } from "../../database/schema/users.ts";

const [adminUser] = await db
  .select({ id: usersTable.id })
  .from(usersTable)
  .where(eq(usersTable.username, "admin"))
  .limit(1);

export default new Router<{
  createPost?: Partial<NewPost>;
}>()
  .get("/", async (context) => {
    const { state } = context;

    state.app.initialState.createPost = {
      authorId: adminUser.id,
    };
    await state.app.render();
  })
  .post("/", async (context) => {
    console.log("create post");
    const { state, request, response } = context;

    try {
      const data = postInsertSchema.parse(await request.body.json());
      state.app.initialState.createPost = data;
      if (!data.authorId) {
        // TODO: Use the current authenticated user
        data.authorId = adminUser.id;
      }
      const { post } = await createPost(data);
      response.status = 201;
      response.redirect(`/blog/${post.id}`);
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
    await state.app.render();
  });
