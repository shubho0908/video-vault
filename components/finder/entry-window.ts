"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

import { entryDock, useEntryDock } from "./entry-dock";
import { nextFrame, prepareGenie, prepareMinimize } from "./genie";
import type { Geom } from "./window-geom";


/** Size override, minimize-to-dock and restore for the entry window (mac). */
export function useEntryWindow(frame: RefObject<HTMLDivElement | null>, pos: RefObject<{ x: number; y: number }>, title: string, enabled: boolean) {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const dock = useEntryDock();
  const minimized = useRef(false);
  const busy = useRef(false);
  const [min, setMin] = useState(false);
  /** A Dock click that arrived while the minimize was still animating: run it as soon as that ends. */
  const queued = useRef(false);

  const runRestore = useCallback((slot: DOMRect) => {
    const el = frame.current;
    if (!el) return;
    busy.current = true;
    // build the copies while the window is still hidden, then show and animate in one frame
    void prepareGenie(el)
      .catch(() => null)
      .then(async g => {
        setMin(false);
        try {
          if (g) await g.play(slot, "out", 560);
        } finally {
          el.style.visibility = "";
          minimized.current = false;
          busy.current = false;
          entryDock.clear();
        }
      });
  }, [frame]);

  const commit = useCallback((g: Geom) => { pos.current = { x: g.x, y: g.y }; setSize({ w: g.w, h: g.h }); }, [pos]);

  const minimize = useCallback(async () => {
    const el = frame.current;
    if (!el || busy.current || minimized.current) return;
    busy.current = true;
    // snapshot first: a cheap static copy (the video becomes its poster, so the Dock never loads a second player)
    const prepared = prepareMinimize(el).catch(() => ({ genie: null, thumb: null }));
    entryDock.show(title);
    setMin(true);
    minimized.current = true;
    try {
      await nextFrame();
      await nextFrame();
      const { genie: g, thumb } = await prepared;
      const slot = entryDock.get()?.slot?.getBoundingClientRect();
      if (g && slot) await g.play(slot, "in", 620);
      else g?.cancel();
      if (thumb) entryDock.setThumb(thumb);
    } finally {
      el.style.visibility = "hidden";
      busy.current = false;
    }
    if (queued.current) {
      queued.current = false;
      const back = entryDock.get()?.slot?.getBoundingClientRect();
      if (back) runRestore(back);
    }
  }, [frame, title, runRestore]);

  // dock click -> animate back out of the slot
  const rect = dock?.restoreRect ?? null;
  useEffect(() => {
    const el = frame.current;
    if (!rect || !el || !minimized.current) return;
    if (busy.current) return void (queued.current = true);
    runRestore(rect);
  }, [rect, frame, runRestore]);

  // leaving the route drops the dock item
  useEffect(() => () => void entryDock.clear(), []);
  useEffect(() => { if (!enabled) entryDock.clear(); }, [enabled]);

  return { size, commit, minimize, min };
}
