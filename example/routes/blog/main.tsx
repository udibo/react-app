import { Suspense } from "react";
import { Outlet } from "react-router-dom";
import { DefaultErrorFallback, ErrorBoundary, Helmet } from "@udibo/react-app";

import { Loading } from "../../components/loading.tsx";

export const boundary = "/blog";

export default function Blog() {
  return (
    <>
      <Helmet defaultTitle="Example | Blog" titleTemplate="Example | Blog | %s">
        <title></title>
      </Helmet>
      <h1>Blog</h1>
      <Suspense fallback={<Loading />}>
        <ErrorBoundary
          FallbackComponent={DefaultErrorFallback}
          boundary={boundary}
        >
          <Outlet />
        </ErrorBoundary>
      </Suspense>
    </>
  );
}
