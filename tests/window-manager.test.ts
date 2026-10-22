// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";

import { cloneBand, coolGenie, snapshotWindow, takeMinimize, warmGenie } from "@/components/finder/genie";
import { vi } from "vitest";
import { ORDER, raise, type Win, type Wins } from "@/components/finder/windows";

const win = (z: number, open = true): Win => ({ open, min: false, zoomed: false, z, x: 0, y: 0 });

describe("raise", () => {
  it("returns the same object when the window is already in front (no re-render)", () => {
    const w: Wins = { finder: win(12), notes: win(11), calculator: win(1, false), settings: win(1, false) };
    expect(raise(w, "finder")).toBe(w);
  });

  it("keeps z-indexes under the Dock and menu bar after many focus changes, preserving order", () => {
    let w: Wins = { finder: win(11), notes: win(12), calculator: win(13), settings: win(14) };
    const clicks: (keyof Wins)[] = [];
    for (let i = 0; i < 500; i++) clicks.push(ORDER[(i * 7) % ORDER.length]);
    for (const id of clicks) {
      w = raise(w, id);
      for (const a of ORDER) expect(w[a].z).toBeLessThanOrEqual(30);
      for (const a of ORDER) if (a !== id) expect(w[a].z).toBeLessThan(w[id].z);
    }
  });
});

type Rect = { left: number; top: number; width: number; height: number };
const rects = new Map<Element, Rect>();
const proto = Element.prototype.getBoundingClientRect;
afterEach(() => {
  rects.clear();
  Element.prototype.getBoundingClientRect = proto;
  document.body.replaceChildren();
});

describe("snapshotWindow", () => {
  it("keeps the layout of a scrolled list: clipped rows become empty boxes of the same size, visible rows keep their content", () => {
    Element.prototype.getBoundingClientRect = function () {
      const r = rects.get(this) ?? { left: 0, top: 0, width: 0, height: 0 };
      return { ...r, right: r.left + r.width, bottom: r.top + r.height, x: r.left, y: r.top, toJSON() {} } as DOMRect;
    };
    const el = document.createElement("div");
    const scroll = document.createElement("div");
    const grid = document.createElement("div");
    scroll.append(grid);
    el.append(scroll);
    document.body.append(el);
    rects.set(el, { left: 0, top: 0, width: 400, height: 300 });
    rects.set(scroll, { left: 0, top: 0, width: 400, height: 300 });
    rects.set(grid, { left: 0, top: -500, width: 400, height: 2000 });
    for (let i = 0; i < 20; i++) {
      const row = document.createElement("div");
      row.textContent = `row ${i}`;
      grid.append(row);
      rects.set(row, { left: 0, top: -500 + i * 100, width: 400, height: 100 });
    }
    Object.defineProperty(scroll, "scrollHeight", { value: 2000 });
    Object.defineProperty(scroll, "clientHeight", { value: 300 });
    Object.defineProperty(scroll, "scrollTop", { value: 500 });
    scroll.style.overflowY = "auto";

    const tpl = snapshotWindow(el)!;
    const rows = Array.from(tpl.firstElementChild!.firstElementChild!.children) as HTMLElement[];
    expect(rows).toHaveLength(20);
    expect(rows[0].textContent).toBe("");
    expect(rows[0].style.height).toBe("100px");
    expect(rows[6].textContent).toBe("row 6");
    expect(rows[19].textContent).toBe("");
    expect((tpl.firstElementChild!.firstElementChild as HTMLElement).style.translate).toBe("0px -500px");
    expect(tpl.style.visibility).toBe("inherit");
  });
});

describe("cloneBand", () => {
  it("copies only what crosses the band's strip; everything else keeps its exact box, empty", () => {
    Element.prototype.getBoundingClientRect = function () {
      const r = rects.get(this) ?? { left: 0, top: 0, width: 0, height: 0 };
      return { ...r, right: r.left + r.width, bottom: r.top + r.height, x: r.left, y: r.top, toJSON() {} } as DOMRect;
    };
    const el = document.createElement("div");
    document.body.append(el);
    rects.set(el, { left: 0, top: 0, width: 400, height: 1000 });
    for (let i = 0; i < 10; i++) {
      const row = document.createElement("div");
      row.innerHTML = `<b>row ${i}</b>`;
      el.append(row);
      rects.set(row, { left: 0, top: i * 100, width: 400, height: 100 });
      rects.set(row.firstElementChild!, { left: 0, top: i * 100, width: 50, height: 20 });
    }
    const tpl = snapshotWindow(el)!;
    const band = cloneBand(tpl, 420, 480) as HTMLElement;
    const rows = Array.from(band.children) as HTMLElement[];
    expect(rows).toHaveLength(10);
    expect(rows[4].textContent).toBe("row 4");
    expect(rows[3].textContent).toBe("");
    expect(rows[3].style.height).toBe("100px");
    expect(rows[9].textContent).toBe("");
    expect(tpl.textContent).toContain("row 9");
  });
});

describe("warm genie", () => {
  it("drops a prepared copy when the window changes (typing, DOM edits), so the click never shows stale content", async () => {
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => setTimeout(() => cb(performance.now()), 0));
    Element.prototype.getBoundingClientRect = function () {
      return { left: 0, top: 0, width: 300, height: 200, right: 300, bottom: 200, x: 0, y: 0, toJSON() {} } as DOMRect;
    };
    const host = document.createElement("div");
    const el = document.createElement("div");
    const ta = document.createElement("textarea");
    el.append(ta);
    host.append(el);
    document.body.append(host);

    warmGenie(el, "in");
    const warm = takeMinimize(el);
    expect(takeMinimize(el)).not.toBe(warm);

    warmGenie(el, "in");
    ta.value = "typed after hover";
    ta.dispatchEvent(new Event("input", { bubbles: true }));
    const after = takeMinimize(el);
    const { thumb } = await after;
    expect(thumb?.textContent).toContain("typed after hover");
    coolGenie(el, "in");
    await new Promise(r => setTimeout(r, 50));
    vi.unstubAllGlobals();
  });
});
