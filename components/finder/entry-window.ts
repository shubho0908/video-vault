"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

import { entryDock, useEntryDock } from "./entry-dock";
import { genie } from "./genie";
import type { Geom } from "./window-geom";

const raf2 = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

/** Size override, minimize-to-dock and restore for the entry window (mac). */
export function useEntryWindow(frame: RefObject<HTMLDivElement | null>, pos: RefObject<{ x: number; y: number }>, title: string, enabled: boolean) {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const dock = useEntryDock();
  const minimized = useRef(false);
  const busy = useRef(false);
  const [min, setMin] = useState(false);

  const commit = useCallback((g: Geom) => { pos.current = { x: g.x, y: g.y }; setSize({ w: g.w, h: g.h }); }, [pos]);

  const minimize = useCallback(async () => {
    const el = frame.current;
    if (!el || busy.current || minimized.current) return;
    busy.current = true;
    entryDock.show(title);
    setMin(true);
    minimized.current = true;
    await raf2();
    const slot = entryDock.get()?.slot?.getBoundingClientRect();
    if (slot) {
      const snap = el.cloneNode(true) as HTMLElement;
      await genie(el, slot, "in", 620);
      el.style.visibility = "hidden";
      entryDock.setThumb(snap);
    } else el.style.visibility = "hidden";
    busy.current = false;
  }, [frame, title]);

  // dock click -> animate back out of the slot
  const rect = dock?.restoreRect ?? null;
  useEffect(() => {
    const el = frame.current;
    if (!rect || !el || !minimized.current) return;
    busy.current = true;
    setMin(false);
    void genie(el, rect, "out", 560).then(() => {
      el.style.visibility = "";
      minimized.current = false;
      busy.current = false;
      entryDock.clear();
    });
  }, [rect, frame]);

  // leaving the route drops the dock item
  useEffect(() => () => void entryDock.clear(), []);
  useEffect(() => { if (!enabled) entryDock.clear(); }, [enabled]);

  return { size, commit, minimize, min };
}
