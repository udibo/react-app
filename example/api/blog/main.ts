import { Router } from "$x/oak/mod.ts";
import { postsRouter } from "./posts.ts";

const blogRouter = new Router();
blogRouter.use("/posts", postsRouter.routes(), postsRouter.allowedMethods());

export { blogRouter };
