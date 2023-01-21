import { useParams } from "$npm/react-router-dom";
import { HttpError } from "$x/http_error/mod.ts";
import { Helmet } from "$npm/react-helmet-async";
import { withAppErrorBoundary } from "$x/udibo_react_app/error.tsx";

import { getPost } from "../../services/posts.tsx";
import { ErrorFallback } from "../../components/error.tsx";

export default withAppErrorBoundary(() => {
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
}, {
  boundary: "/blog/[id]",
  FallbackComponent: ErrorFallback,
});
