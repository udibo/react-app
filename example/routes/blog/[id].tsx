import { useParams } from "react-router-dom";
import { Helmet, HttpError } from "@udibo/react-app";

import { getPost } from "../../services/posts.tsx";

export default function BlogPost() {
  const params = useParams();
  const id = Number(params.id);
  if (isNaN(id) || Math.floor(id) !== id || id < 0) {
    throw new HttpError(400, "Invalid id");
  }
  const post = getPost(id);
  return post
    ? (
      <>
        <Helmet>
          <title>{post.title}</title>
          <meta name="description" content={post.content} />
        </Helmet>
        <h2>{post.title}</h2>
        <p>{post.content}</p>
      </>
    )
    : (
      <>
        <Helmet>
          <title>Loading...</title>
        </Helmet>
        <h2>Loading...</h2>
      </>
    );
}
