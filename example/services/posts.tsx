import { useEffect, useState } from "react";
import {
  ErrorResponse,
  HttpError,
  isErrorResponse,
  useInitialState,
} from "@udibo/react-app";

import type { Post, PostsState } from "../models/posts.ts";

const parseResponse = async (response: Response) => {
  let data;
  try {
    data = await response.json();
  } catch (cause) {
    throw new HttpError(response.status, "Invalid response", { cause });
  }
  if (isErrorResponse(data)) throw ErrorResponse.toError(data);
  if (response.status >= 400) {
    throw new HttpError(response.status, "Invalid response");
  }
  return data;
};

export function getPosts(): { [id: number]: Post } | null {
  const [error, setError] = useState<Error | null>(null);
  if (error) throw error;

  const initialState = useInitialState<PostsState>();
  const [posts, setPosts] = useState<{ [id: number]: Post } | null>(
    initialState.posts ?? null,
  );

  useEffect(() => {
    fetch("/api/blog/posts")
      .then(parseResponse)
      .then((posts: Post[]) => {
        setPosts(posts);
        setError(null);
      })
      .catch((error: unknown) => {
        setPosts(null);
        setError(HttpError.from(error));
      });

    return () => {
      delete initialState.posts;
      setPosts(null);
      setError(null);
    };
  }, []);

  return posts;
}

export function getPost(id: number): Post | null {
  const [error, setError] = useState<Error | null>(null);
  if (error) throw error;

  const initialState = useInitialState<PostsState>();
  const [post, setPost] = useState<Post | null>(
    initialState.posts?.[id] ?? null,
  );

  useEffect(() => {
    fetch(`/api/blog/posts/${id}`)
      .then(parseResponse)
      .then((post: Post) => {
        setPost(post);
        setError(null);
      })
      .catch((error: unknown) => {
        setPost(null);
        setError(HttpError.from(error));
      });

    return () => {
      delete initialState.posts;
      setPost(null);
      setError(null);
    };
  }, []);

  return post;
}
