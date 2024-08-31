export interface Post {
  id: number;
  title: string;
  content: string;
}

export interface Posts {
  [id: number]: Post;
}

export type PostsState = {
  posts?: Posts;
};
