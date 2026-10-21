"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

import { entryDock, useEntryDock } from "./entry-dock";
import { prepareGenie, snapshotWindow } from "./genie";
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
    // snapshot first: a cheap static copy (the video becomes its poster, so the Dock never loads a second player)
    const tpl = snapshotWindow(el);
    const thumb = tpl ? (tpl.cloneNode(true) as HTMLElement) : null;
    const prepared = tpl ? prepareGenie(el, tpl) : Promise.resolve(null);
    entryDock.show(title);
    setMin(true);
    minimized.current = true;
    await raf2();
    const g = await prepared;
    const slot = entryDock.get()?.slot?.getBoundingClientRect();
    if (g && slot) await g.play(slot, "in", 620);
    else g?.cancel();
    el.style.visibility = "hidden";
    if (thumb) entryDock.setThumb(thumb);
    busy.current = false;
  }, [frame, title]);

  // dock click -> animate back out of the slot
  const rect = dock?.restoreRect ?? null;
  useEffect(() => {
    const el = frame.current;
    if (!rect || !el || !minimized.current || busy.current) return;
    busy.current = true;
    // build the copies while the window is still hidden, then show and animate in one frame
    void prepareGenie(el).then(async g => {
      setMin(false);
      if (g) await g.play(rect, "out", 560);
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
