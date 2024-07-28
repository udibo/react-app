import { Suspense } from "react";
import { Link, Outlet } from "npm:react-router-dom@6";
import {
  DefaultErrorFallback,
  ErrorBoundary,
  Helmet,
  isBrowser,
  isDevelopment,
} from "@udibo/react-app";
import * as log from "@std/log";

import { Loading } from "../components/loading.tsx";

if (isBrowser()) {
  const level = isDevelopment() ? "DEBUG" : "INFO";
  log.setup({
    handlers: { default: new log.ConsoleHandler(level, { useColors: false }) },
    loggers: { "react-app": { level, handlers: ["default"] } },
  });
}

const navLinks = [
  { label: "Home", to: "/" },
  { label: "About", to: "/about" },
  { label: "Blog", to: "/blog" },
  { label: "Fake", to: "/fake" },
];

export default function Main() {
  return (
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
        <ErrorBoundary FallbackComponent={DefaultErrorFallback}>
          <Outlet />
        </ErrorBoundary>
      </Suspense>
    </>
  );
}
