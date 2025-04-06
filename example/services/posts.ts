import { HttpError } from "@udibo/react-app";
import { db } from "../database/mod.ts";
import {
  type NewPost,
  type Post,
  postsTable,
} from "../database/schema/posts.ts";
import { and, eq, isNull } from "drizzle-orm";
import { GetPostResponse, GetPostsResponse } from "./posts.tsx";

export async function getPosts(): Promise<GetPostsResponse> {
  try {
    const posts = await db
      .select()
      .from(postsTable)
      .where(isNull(postsTable.deletedAt));

    return { posts };
  } catch (cause) {
    if (cause instanceof HttpError) throw cause;
    throw new HttpError(500, "Failed to get posts", {
      cause,
    });
  }
}

export async function getPost(id: string): Promise<GetPostResponse> {
  try {
    const post = await db
      .select()
      .from(postsTable)
      .where(and(
        eq(postsTable.id, id),
        isNull(postsTable.deletedAt),
      ));

    if (!post.length) throw new HttpError(404, "Post not found");
    return { post: post[0] };
  } catch (cause) {
    if (cause instanceof HttpError) throw cause;
    throw new HttpError(500, "Failed to get post", {
      cause,
    });
  }
}

export interface createPostResponse {
  post: Post;
}

export async function createPost(post: NewPost): Promise<createPostResponse> {
  try {
    const [newPost] = await db
      .insert(postsTable)
      .values(post)
      .returning();
    return { post: newPost };
  } catch (cause) {
    if (cause instanceof HttpError) throw cause;
    throw new HttpError(500, "Failed to create post", {
      cause,
    });
  }
}
