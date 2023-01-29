import { Link } from "npm/react-router-dom";
import { Helmet } from "npm/react-helmet-async";

import { getPosts } from "../../services/posts.tsx";

export default function BlogIndex() {
  const posts = getPosts();
  return posts
    ? (
      <>
        <Helmet>
          <meta name="description" content="This is an example blog." />
        </Helmet>
        <ul>
          {posts.map((post) => (
            <li key={`${post.id}`}>
              <Link to={`${post.id}`}>{post.title}</Link>
            </li>
          ))}
        </ul>
      </>
    )
    : <div>Loading posts...</div>;
}
