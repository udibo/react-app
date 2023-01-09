import { Link } from "$npm/react-router-dom";

import { getPosts } from "../../services/posts.tsx";

export default () => {
  const posts = getPosts();
  return posts
    ? (
      <ul>
        {posts.map((post) => (
          <li key={`${post.id}`}>
            <Link to={`${post.id}`}>{post.title}</Link>
          </li>
        ))}
      </ul>
    )
    : <div>Loading posts...</div>;
};
