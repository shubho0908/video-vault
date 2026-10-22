// @vitest-environment jsdom
// Static imports let vi.mock intercept next/navigation before module evaluation.
(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
import { createElement } from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import DashboardLoading from "@/app/dashboard/loading";
import EntryLoading from "@/app/entries/[entryId]/loading";
import { PerformanceLink } from "@/components/journal/performance-link";
import { Welcome } from "@/components/finder/welcome";

const prefetch = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ prefetch }),
  usePathname: () => "/",
}));
vi.mock("@/lib/auth-client", () => ({
  authClient: { signIn: { social: vi.fn() } },
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

  it("renders loading boundaries synchronously inside the Finder shell", () => {
    expect(renderToStaticMarkup(createElement(EntryLoading))).toBe("");
    const markup = renderToStaticMarkup(createElement(DashboardLoading));
    expect(markup).toContain('class="fx fx-desktop"');
  });

  it("remembers a dismissed welcome intro on the next visit", () => {
    const key = "shubhojeets-videos:intro-seen";
    const storage = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    });
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: query.includes("min-width"),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    const first = render(createElement(Welcome));
    act(() => first.container.querySelector<HTMLElement>(".wl-intro")!.click());
    expect(storage.get(key)).toBe("1");
    act(() => first.root.unmount());
    first.container.remove();
    const second = render(createElement(Welcome));
    expect(second.container.querySelector(".wl-intro")).toBeNull();
    act(() => second.root.unmount());
    second.container.remove();
    vi.unstubAllGlobals();
  });
});
