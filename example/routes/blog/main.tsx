import { Suspense } from "npm/react";
import { Outlet } from "npm/react-router-dom";
import { Helmet } from "npm/react-helmet-async";
import {
  AppErrorBoundary,
  DefaultErrorFallback,
} from "x/udibo_react_app/mod.tsx";

import { Loading } from "../../components/loading.tsx";

export default function Blog() {
  return (
    <>
      <Helmet defaultTitle="Example | Blog" titleTemplate="Example | Blog | %s">
        <title></title>
      </Helmet>
      <h1>Blog</h1>
      <Suspense fallback={<Loading />}>
        <AppErrorBoundary
          FallbackComponent={DefaultErrorFallback}
          boundary="/blog"
        >
          <Outlet />
        </AppErrorBoundary>
      </Suspense>
    </>
  );
}

export const boundary = "/blog";
