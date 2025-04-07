import { BaseSyntheticEvent, useEffect, useState } from "react";
import { ErrorResponse, HttpError, useInitialState } from "@udibo/react-app";
import {
  NewPost,
  type Post,
  postInsertSchema,
} from "../database/schema/posts.ts";
import {
  SubmitErrorHandler,
  SubmitHandler,
  useForm,
  UseFormProps,
  UseFormReturn,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router";
export interface GetPostsResponse {
  posts: Post[];
}

export async function getPosts(): Promise<GetPostsResponse> {
  const response = await fetch("/api/blog/posts");
  if (!response.ok) {
    throw await ErrorResponse.toError(response);
  }
  return response.json();
}

export function usePosts(): GetPostsResponse | null {
  const [error, setError] = useState<Error | null>(null);
  if (error) throw error;

  const [initialGetPostsResponse, clearInitialGetPostsResponse] =
    useInitialState<GetPostsResponse>(
      "getPosts",
    );
  const [postsResponse, setPostsResponse] = useState<GetPostsResponse | null>(
    initialGetPostsResponse || null,
  );

  useEffect(() => {
    getPosts()
      .then((posts: GetPostsResponse) => {
        setPostsResponse(posts);
        setError(null);
      })
      .catch((error: unknown) => {
        setPostsResponse(null);
        setError(HttpError.from(error));
      });

    return () => {
      clearInitialGetPostsResponse();
      setPostsResponse(null);
      setError(null);
    };
  }, []);

  return postsResponse;
}
export interface GetPostResponse {
  post: Post;
}

export async function getPost(id: string): Promise<GetPostResponse> {
  const response = await fetch(`/api/blog/posts/${id}`);
  if (!response.ok) {
    throw await ErrorResponse.toError(response);
  }
  return response.json();
}

export function usePost(id: string): GetPostResponse | null {
  const [error, setError] = useState<Error | null>(null);
  if (error) throw error;

  const [initialGetPostResponse, clearInitialGetPostResponse] = useInitialState<
    GetPostResponse
  >("getPost");
  const [postResponse, setPostResponse] = useState<GetPostResponse | null>(
    initialGetPostResponse || null,
  );

  useEffect(() => {
    getPost(id)
      .then((post: GetPostResponse) => {
        setPostResponse(post);
        setError(null);
      })
      .catch((error: unknown) => {
        setPostResponse(null);
        setError(HttpError.from(error));
      });

    return () => {
      clearInitialGetPostResponse();
      setPostResponse(null);
      setError(null);
    };
  }, [id]);

  return postResponse;
}

export interface CreatePostResponse {
  post: Post;
}

export async function createPost(
  post: NewPost,
): Promise<CreatePostResponse> {
  const response = await fetch("/api/blog/posts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(post),
  });

  if (!response.ok) {
    throw await ErrorResponse.toError(response);
  }

  return response.json();
}

export type UseCreatePostFormProps = UseFormProps<NewPost>;
export type UseCreatePostFormReturn = UseFormReturn<NewPost> & {
  onSubmit: (e?: React.BaseSyntheticEvent) => Promise<void>;
};
export function useCreatePostForm(
  props?: UseCreatePostFormProps,
): UseCreatePostFormReturn {
  const navigate = useNavigate();

  const [initialDefaultValues, clearInitialDefaultValues] = useInitialState<
    Partial<NewPost>
  >("createPost");
  const defaultValues = {
    ...initialDefaultValues,
    ...props?.defaultValues,
  };

  const { register, handleSubmit: _handleSSubmit, setError, ...form } = useForm<
    NewPost
  >({
    mode: "onBlur",
    resolver: zodResolver(postInsertSchema),
    ...props,
    defaultValues,
  });

  useEffect(() => {
    return () => {
      clearInitialDefaultValues();
    };
  }, []);

  async function onValidDefault(data: NewPost) {
    const { post } = await createPost(data);
    navigate(`/blog/${post.id}`);
  }

  function handleSubmit(
    onValid: SubmitHandler<NewPost>,
    onInvalid?: SubmitErrorHandler<NewPost>,
  ) {
    async function onValidWrapper(data: NewPost, event?: BaseSyntheticEvent) {
      try {
        await onValid(data, event);
      } catch (error) {
        if (error instanceof HttpError) {
          const errorData = error.data as {
            errors?: { path: string; message: string }[];
          };
          if (errorData?.errors) {
            errorData.errors.forEach((error) => {
              setError(error.path as keyof NewPost, {
                type: "server",
                message: error.message,
              });
            });
          }
        }
      }
    }

    return _handleSSubmit(onValidWrapper, onInvalid);
  }

  return {
    register,
    handleSubmit,
    onSubmit: handleSubmit(onValidDefault),
    setError,
    ...form,
  };
}
