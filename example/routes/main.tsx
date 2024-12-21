import { Suspense } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { DefaultErrorFallback, ErrorBoundary, Helmet } from "@udibo/react-app";
import "../log.ts";

import { Loading } from "../components/loading.tsx";

const navLinks = [
  { label: "Home", to: "/" },
  { label: "About", to: "/about" },
  { label: "Blog", to: "/blog" },
  { label: "Fake", to: "/fake" },
];

export default function Main() {
  return (
    <div className="min-h-full">
      <Helmet
        defaultTitle="Example"
        titleTemplate="Example | %s"
        htmlAttributes={{ lang: "en" }}
      >
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="stylesheet" href="/build/main.css" />
      </Helmet>
      <nav className="border-b border-gray-200 bg-white">
        <div className="mx-auto px-4">
          <div className="flex h-12 items-center space-x-4">
            {navLinks.map((link) => (
              <NavLink
                key={link.label}
                to={link.to}
                className={({ isActive }) =>
                  "inline-flex items-center text-lg font-medium border-b-2 " +
                  (isActive
                    ? "border-indigo-500 text-gray-900"
                    : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700")}
              >
                {link.label}
              </NavLink>
            ))}
          </div>
        </div>
      </nav>
      <div className="p-5">
        <Suspense fallback={<Loading />}>
          <ErrorBoundary FallbackComponent={DefaultErrorFallback}>
            <Outlet />
          </ErrorBoundary>
        </Suspense>
      </div>
    </div>
  );
}
