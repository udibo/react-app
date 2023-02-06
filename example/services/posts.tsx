import { useContext, useEffect, useState } from "npm/react";
import {
  HttpError,
  HttpErrorOptions,
  isBrowser,
} from "x/udibo_react_app/mod.tsx";

import { AppContext } from "../context.ts";
import { Post } from "../models/posts.ts";

const parseResponse = async (response: Response) => {
  let data;
  try {
    data = await response.json();
  } catch (e) {
    throw new HttpError(response.status, "Invalid response");
  }
  if (response.status !== 200) throw data;
  return data;
};

export function getPosts() {
  const [error, setError] = useState<Error | null>(null);
  if (error) throw error;

  const context = useContext(AppContext);
  const [posts, setPosts] = useState<Post[] | null>(
    Array.isArray(context.posts) ? context.posts : null,
  );
  if (isBrowser()) delete context.posts;

  useEffect(() => {
    if (!posts) {
      fetch("/api/blog/posts")
        .then(parseResponse)
        .then((posts: Post[]) => {
          setPosts(posts);
          setError(null);
        })
        .catch((error: unknown) => {
          setPosts(null);
          const options = error && typeof error === "object"
            ? error as HttpErrorOptions
            : {};
          setError(new HttpError(options));
        });
    }
  }, []);

  return posts;
}

export function getPost(id: number) {
  const [error, setError] = useState<Error | null>(null);
  if (error) throw error;

  const context = useContext(AppContext);
  const [post, setPost] = useState<Post | null>(context.posts?.[id] ?? null);
  if (isBrowser()) delete context.posts;

  useEffect(() => {
    if (!post) {
      fetch(`/api/blog/posts/${id}`)
        .then(parseResponse)
        .then((post: Post) => {
          setPost(post);
          setError(null);
        })
        .catch((error: unknown) => {
          setPost(null);
          const options = error && typeof error === "object"
            ? error as HttpErrorOptions
            : {};
          setError(new HttpError(options));
        });
    }
  }, []);

  return post;
}
