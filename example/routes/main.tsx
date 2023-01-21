import { Suspense } from "$npm/react";
import { Link, Outlet } from "$npm/react-router-dom";
import { Helmet } from "$npm/react-helmet-async";
import { AppErrorBoundary } from "$x/udibo_react_app/error.tsx";

import { Loading } from "../components/loading.tsx";
import { ErrorFallback } from "../components/error.tsx";

const navLinks = [
  { label: "Home", to: "/" },
  { label: "About", to: "/about" },
  { label: "Blog", to: "/blog" },
  { label: "Fake", to: "/fake" },
];

export default () => (
  <>
    <Helmet
      defaultTitle="Example"
      titleTemplate="Example | %s"
      htmlAttributes={{ lang: "en" }}
    >
      <meta charSet="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    </Helmet>
    <ul>
      {navLinks.map((link) => (
        <li key={link.label}>
          <Link to={link.to}>{link.label}</Link>
        </li>
      ))}
    </ul>
    <Suspense fallback={<Loading />}>
      <AppErrorBoundary FallbackComponent={ErrorFallback}>
        <Outlet />
      </AppErrorBoundary>
    </Suspense>
  </>
);
