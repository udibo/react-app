import { assertEquals } from "@std/assert";
import { describe, it } from "@std/testing/bdd";

import { render } from "../test-utils.tsx";

import { Loading } from "./loading.tsx";

const loadingTests = describe("Loading component");

it(loadingTests, "renders loading message", () => {
  using screen = render(<Loading />);
  assertEquals(screen.getByText("Loading...").textContent, "Loading...");
});
