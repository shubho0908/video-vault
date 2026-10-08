// @vitest-environment jsdom
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { WallLayer } from "@/components/finder/wall-layer";
import { setWallpaper, WALLPAPERS, WALL_SIZES, type WallKind } from "@/lib/wallpaper";
import { wallpaperBootScript } from "@/lib/wallpaper-boot";

const root = join(__dirname, "..");
const css = readFileSync(join(root, "components/finder/finder.css"), "utf8");

function memoryStorage(seed: Record<string, string> = {}) {
  const mem = new Map(Object.entries(seed));
  return {
    getItem: (k: string) => mem.get(k) ?? null,
    setItem: (k: string, v: string) => void mem.set(k, v),
    removeItem: (k: string) => void mem.delete(k),
    clear: () => mem.clear(),
  };
}

describe("wallpaper manifest", () => {
  for (const kind of ["mac", "ios"] as const) {
    for (const { id, tint } of WALLPAPERS[kind].filter(w => w.id !== "default")) {
      it(`${kind}/${id} has both image sizes and a tint`, () => {
        for (const size of [WALL_SIZES[kind].small, WALL_SIZES[kind].large])
          expect(existsSync(join(root, "public/wp", `${kind}-${id}-${size}.webp`)), `${kind}-${id}-${size}`).toBe(true);
        expect(tint, "tint (python3 scripts/wallpaper-tint.py)").toHaveLength(2);
        for (const c of tint!) expect(c).toMatch(/^#[0-9a-f]{6}$/i);
      });
    }
  }

  it("ids are safe to interpolate into URLs and match the boot script's shape check", () => {
    for (const kind of ["mac", "ios"] as const)
      for (const { id } of WALLPAPERS[kind]) expect(id).toMatch(/^[a-z0-9-]{1,40}$/);
  });

  it("finder.css maps the published variables for the right layout only, with no per-wallpaper rules", () => {
    expect(css).toMatch(/@media \(min-width: 1024px\)[^{]*\{ html\[data-wall-mac\] \.fx \{ --fx-wall: var\(--fx-wall-mac\); \} \}/);
    expect(css).toMatch(/@media not all and \(min-width: 1024px\)[^{]*\{ html\[data-wall-ios\] \.fx \{ --fx-wall: var\(--fx-wall-ios\); \} \}/);
    expect(css).not.toContain("sequoia");
  });

  it("the theme-default preloads the boot script can pick all exist", () => {
    for (const f of ["mac-dark-2880", "mac-light-2880", "mac-dark-2048", "mac-light-2048", "mac-dark-1280", "mac-light-1280", "ios-dark-1290", "ios-light-1290", "ios-dark-645", "ios-light-645"])
      expect(existsSync(join(root, "public/wp", `${f}.avif`)), f).toBe(true);
  });
});

describe("head boot script", () => {
  const PREFIX = "shubhojeets-videos:wallpaper:";
  function run(opts: { store?: Record<string, string>; desktop?: boolean; width?: number; dpr?: number }) {
    vi.stubGlobal("localStorage", memoryStorage(opts.store));
    vi.stubGlobal("matchMedia", () => ({ matches: opts.desktop ?? true }));
    vi.stubGlobal("innerWidth", opts.width ?? 1440);
    vi.stubGlobal("devicePixelRatio", opts.dpr ?? 1);
    new Function(wallpaperBootScript())();
    const el = document.documentElement;
    return {
      attr: (k: WallKind) => el.getAttribute(`data-wall-${k}`),
      css: (k: WallKind) => el.style.getPropertyValue(`--fx-wall-${k}`),
      preload: document.head.querySelector<HTMLLinkElement>('link[rel="preload"]'),
    };
  }
  beforeEach(() => {
    const el = document.documentElement;
    el.removeAttribute("data-wall-mac");
    el.removeAttribute("data-wall-ios");
    el.removeAttribute("style");
    document.head.innerHTML = "";
  });
  afterEach(() => vi.unstubAllGlobals());

  it("publishes the saved choice with its tint and preloads that exact image before React runs", () => {
    const r = run({ store: { [`${PREFIX}mac`]: "sonoma-dark", [`${PREFIX}tint:mac`]: "#40548c,#388746" }, width: 1600 });
    expect(r.attr("mac")).toBe("sonoma-dark");
    expect(r.css("mac")).toBe("url(/wp/mac-sonoma-dark-2048.webp) center / cover no-repeat, linear-gradient(135deg, #40548c, #388746)");
    expect(r.preload!.getAttribute("href")).toBe("/wp/mac-sonoma-dark-2048.webp");
  });

  it("still paints the image when no tint was stored yet (choices saved before tints existed)", () => {
    const r = run({ store: { [`${PREFIX}mac`]: "sequoia-dark" }, width: 1300 });
    expect(r.css("mac")).toBe("url(/wp/mac-sequoia-dark-1280.webp) center / cover no-repeat");
  });

  it("rejects ids and tints with a bad shape, so storage can never inject CSS", () => {
    const r = run({ store: { [`${PREFIX}mac`]: "x);}body{display:none", [`${PREFIX}ios`]: "rose", [`${PREFIX}tint:ios`]: "red;}*{x:y,#000000" }, desktop: false, width: 390, dpr: 3 });
    expect(r.attr("mac")).toBeNull();
    expect(r.css("ios")).toBe("url(/wp/ios-rose-1290.webp) center / cover no-repeat");
  });

  it("falls back to the theme default preload when nothing is saved", () => {
    const r = run({ store: { theme: "light" }, width: 1300 });
    expect(r.attr("mac")).toBeNull();
    expect(r.preload!.getAttribute("href")).toBe("/wp/mac-light-1280.avif");
  });

  it("picks the phone wallpaper on touch devices", () => {
    const r = run({ store: { [`${PREFIX}ios`]: "rose" }, desktop: false, width: 390, dpr: 3 });
    expect(r.preload!.getAttribute("href")).toBe("/wp/ios-rose-1290.webp");
  });

  it("never throws when storage is blocked", () => {
    vi.stubGlobal("localStorage", { getItem: () => { throw new Error("denied"); } });
    vi.stubGlobal("matchMedia", () => ({ matches: true }));
    expect(() => new Function(wallpaperBootScript())()).not.toThrow();
  });
});

describe("WallLayer", () => {
  let host: HTMLDivElement;
  let r: Root;
  const el = document.documentElement;
  beforeEach(() => {
    (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
    vi.useFakeTimers();
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => setTimeout(() => cb(0), 0));
    vi.stubGlobal("Image", class { src = ""; decode() { return Promise.resolve(); } });
    vi.stubGlobal("localStorage", memoryStorage());
    el.removeAttribute("data-wall-mac");
    el.removeAttribute("style");
    host = document.createElement("div");
    document.body.append(host);
    r = createRoot(host);
  });
  afterEach(() => {
    act(() => r.unmount());
    host.remove();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("renders nothing on load when CSS already paints the saved wallpaper", () => {
    el.setAttribute("data-wall-mac", "sonoma-dark");
    act(() => setWallpaper("mac", "sonoma-dark"));
    act(() => r.render(createElement(WallLayer, { kind: "mac" })));
    expect(host.innerHTML).toBe("");
    expect(el.getAttribute("data-wall-mac")).toBe("sonoma-dark");
  });

  it("crossfades a runtime change, then hands the wallpaper to CSS and removes the overlay", async () => {
    act(() => setWallpaper("mac", "default"));
    act(() => r.render(createElement(WallLayer, { kind: "mac" })));
    expect(host.innerHTML).toBe("");

    await act(async () => setWallpaper("mac", "sequoia-light"));
    expect(localStorage.getItem("shubhojeets-videos:wallpaper:tint:mac")).toBe("#6571a3,#ae868a");
    await act(async () => { await vi.advanceTimersByTimeAsync(50); });
    expect(host.querySelector("div")!.getAttribute("style")).toContain("mac-sequoia-light");
    expect(el.getAttribute("data-wall-mac")).toBeNull();

    await act(async () => { await vi.advanceTimersByTimeAsync(600); });
    expect(el.getAttribute("data-wall-mac")).toBe("sequoia-light");
    expect(el.style.getPropertyValue("--fx-wall-mac")).toContain("mac-sequoia-light");
    await act(async () => { await vi.advanceTimersByTimeAsync(50); });
    expect(host.innerHTML).toBe("");
  });

  it("returns to the theme default by fading the old wallpaper out over it", async () => {
    el.setAttribute("data-wall-mac", "sequoia-light");
    act(() => setWallpaper("mac", "sequoia-light"));
    act(() => r.render(createElement(WallLayer, { kind: "mac" })));
    await act(async () => setWallpaper("mac", "default"));
    await act(async () => { await vi.advanceTimersByTimeAsync(50); });
    expect(el.getAttribute("data-wall-mac")).toBeNull();
    expect(el.style.getPropertyValue("--fx-wall-mac")).toBe("");
    expect(host.querySelector("div")!.getAttribute("style")).toContain("mac-sequoia-light");
    await act(async () => { await vi.advanceTimersByTimeAsync(600); });
    expect(host.innerHTML).toBe("");
  });
});
