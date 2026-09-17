// @vitest-environment jsdom
// Static imports required: vi.mock hoisting must intercept next/navigation before module load.
(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
import { createElement } from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import DashboardLoading from "@/app/dashboard/loading";
import EntryLoading from "@/app/entries/[entryId]/loading";
import { PerformanceLink } from "@/components/journal/performance-link";

const prefetch = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ prefetch }),
  usePathname: () => "/",
}));

function render(element: React.ReactElement) {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  act(() => root.render(element));
  return { container, root };
}

describe("navigation performance boundaries", () => {
  beforeEach(() => {
    prefetch.mockClear();
  });

  it("prefetches card destinations on pointer intent", () => {
    const { container } = render(
      createElement(PerformanceLink, { href: "/dashboard" }, "Open")
    );
    const link = container.querySelector("a");
    expect(link).not.toBeNull();
    expect(prefetch).not.toHaveBeenCalled();
    act(() => {
      link!.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
    });
    expect(prefetch).toHaveBeenCalledWith("/dashboard");
  });

  it("prefetches card destinations on keyboard focus", () => {
    const { container } = render(
      createElement(PerformanceLink, { href: "/entries/abc" }, "Open")
    );
    const link = container.querySelector("a");
    expect(prefetch).not.toHaveBeenCalled();
    act(() => {
      link!.focus();
    });
    expect(prefetch).toHaveBeenCalledWith("/entries/abc");
  });

  it("renders loading boundaries synchronously as skeleton trees", () => {
    for (const Loading of [DashboardLoading, EntryLoading]) {
      const markup = renderToStaticMarkup(createElement(Loading));
      expect(markup).toContain("animate-pulse");
      expect(markup).toContain("<main");
    }
  });
});
