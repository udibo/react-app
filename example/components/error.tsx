import { useEffect, useState } from "$npm/react";
import { useLocation } from "$npm/react-router-dom";
import { FallbackProps, isHttpError } from "$x/udibo_react_app/error.tsx";

export function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  const location = useLocation();
  const [initialLocation] = useState(location);
  useEffect(() => {
    if (location !== initialLocation) resetErrorBoundary();
  }, [location]);

  return (
    <div role="alert">
      <p>Something went wrong:</p>
      <pre>{error.message}</pre>
      {isHttpError(error) && error.status !== 404
        ? <button onClick={resetErrorBoundary}>Try again</button>
        : null}
    </div>
  );
}
