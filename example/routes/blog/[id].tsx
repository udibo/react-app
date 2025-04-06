import { useParams } from "react-router";
import { Helmet } from "@udibo/react-app";
import { z } from "zod";

import { usePost } from "../../services/posts.tsx";

export default function BlogPost() {
  const params = useParams();
  const id = z.string().uuid().parse(params.id);
  const postResponse = usePost(id);
  const { post } = postResponse ?? {};

  return post
    ? (
      <>
        <Helmet>
          <title>{post.title}</title>
          <meta name="description" content={post.content} />
        </Helmet>
        <h2 className="text-lg font-bold pb-2">{post.title}</h2>
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
