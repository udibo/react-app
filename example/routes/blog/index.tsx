import { Link } from "react-router-dom";
import { Helmet } from "@udibo/react-app";

import { getPosts } from "../../services/posts.tsx";

export default function BlogIndex() {
  const posts = getPosts();
  return posts
    ? (
      <>
        <Helmet>
          <meta name="description" content="This is an example blog." />
        </Helmet>
        <ul className="list-disc ml-4">
          {Object.entries(posts).map(([id, post]) => (
            <li key={`${id}`}>
              <Link className="text-blue-700 hover:text-blue-900" to={`${id}`}>
                {post.title}
              </Link>
            </li>
          ))}
        </ul>
      </>
    )
    : <div>Loading posts...</div>;
}
