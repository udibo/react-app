import "@udibo/react-app/global-jsdom";
import {
  cleanup,
  render as _render,
  type RenderOptions,
} from "@testing-library/react";
export * from "@testing-library/react";

export function render(
  ui: React.ReactElement,
  options?: Omit<RenderOptions, "queries">,
): ReturnType<typeof _render> & Disposable {
  const result = _render(ui, options);
  return {
    ...result,
    [Symbol.dispose]() {
      cleanup();
    },
  };
}
