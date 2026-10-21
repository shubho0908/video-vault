// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";

import { snapshotWindow } from "@/components/finder/genie";
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
      // the window just raised is strictly on top
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
    // scrolled down 500px: rows 0-4 are above the viewport, 5-7 visible, the rest below
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
    // nothing removed, so later rows do not shift up into the space of the clipped ones
    expect(rows).toHaveLength(20);
    expect(rows[0].textContent).toBe("");
    expect(rows[0].style.height).toBe("100px");
    expect(rows[6].textContent).toBe("row 6");
    expect(rows[19].textContent).toBe("");
    // the scroll offset is baked into the content, and the copy inherits visibility from its overlay
    expect((tpl.firstElementChild!.firstElementChild as HTMLElement).style.translate).toBe("0px -500px");
    expect(tpl.style.visibility).toBe("inherit");
  });
});
