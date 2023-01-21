import { Suspense } from "$npm/react";
import { Outlet } from "$npm/react-router-dom";
import { Helmet } from "$npm/react-helmet-async";

import { Loading } from "../../components/loading.tsx";

export default () => (
  <>
    <Helmet defaultTitle="Example | Blog" titleTemplate="Example | Blog | %s">
      <title></title>
    </Helmet>
    <h1>Blog</h1>
    <Suspense fallback={<Loading />}>
      <Outlet />
    </Suspense>
  </>
);
