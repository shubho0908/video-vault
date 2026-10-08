// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it } from "vitest";

import { VideoEmbed } from "@/components/finder/video-embed";

let root: Root;
let container: HTMLDivElement;

beforeEach(() => {
  (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

it("paints a poster without creating the YouTube iframe until play is pressed", () => {
  act(() =>
    root.render(
      createElement(VideoEmbed, { videoId: "dQw4w9WgXcQ", title: "Demo" })
    )
  );
  expect(container.querySelector("iframe")).toBeNull();
  expect(container.querySelector("img")!.getAttribute("src")).toBe(
    "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg"
  );

  act(() => container.querySelector<HTMLButtonElement>("button")!.click());

  const frame = container.querySelector("iframe")!;
  expect(frame.getAttribute("src")).toContain(
    "youtube-nocookie.com/embed/dQw4w9WgXcQ"
  );
  expect(frame.getAttribute("src")).toContain("autoplay=1");
  expect(container.querySelector("button")).toBeNull();
});
