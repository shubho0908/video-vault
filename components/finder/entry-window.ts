"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

import { entryDock, useEntryDock } from "./entry-dock";
import { coolGenie, nextFrame, takeMinimize, takeRestore, warmGenie } from "./genie";
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
    void takeRestore(el)
      .catch(() => null)
      .then(async g => {
        setMin(false);
        // the thumbnail leaves the Dock as the window genies out of it
        entryDock.setThumb(null);
        try {
          if (g) await g.play(slot, "out", 560);
        } finally {
          el.style.visibility = "";
          minimized.current = false;
          busy.current = false;
          // the now empty slot closes up after the window is out
          entryDock.leave();
        }
      });
  }, [frame]);

  const commit = useCallback((g: Geom) => { pos.current = { x: g.x, y: g.y }; setSize({ w: g.w, h: g.h }); }, [pos]);

  const minimize = useCallback(async () => {
    const el = frame.current;
    if (!el || busy.current || minimized.current) return;
    busy.current = true;
    // snapshot first: a cheap static copy (the video becomes its poster, so the Dock never loads a second player)
    const prepared = takeMinimize(el).catch(() => ({ genie: null, thumb: null }));
    entryDock.show(title);
    setMin(true);
    minimized.current = true;
    try {
      const { genie: g, thumb } = await prepared;
      for (let i = 0; i < 3 && !entryDock.get()?.slotRect; i++) await nextFrame();
      // the slot is still growing: aim at the box it grows into
      const slot = entryDock.get()?.slotRect ?? entryDock.get()?.slot?.getBoundingClientRect();
      const land = () => thumb && entryDock.get()?.thumb !== thumb && entryDock.setThumb(thumb);
      if (g && slot) await g.play(slot, "in", 620, land);
      else g?.cancel();
      land();
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

  /** Pointer on the minimize button / Dock thumbnail: build the genie before the click (or drop it). */
  const warm = useCallback((dir: "in" | "out", on: boolean) => {
    if (on && !busy.current) warmGenie(frame.current, dir);
    else if (!on) coolGenie(frame.current, dir);
  }, [frame]);
  useEffect(() => {
    entryDock.setWarm(warm);
    return () => entryDock.setWarm(null);
  }, [warm]);

  // leaving the route drops the dock item and any prepared copies
  useEffect(() => {
    const el = frame.current;
    return () => {
      entryDock.clear();
      coolGenie(el, "in");
      coolGenie(el, "out");
    };
  }, [frame]);
  useEffect(() => { if (!enabled) entryDock.clear(); }, [enabled]);

  return { size, commit, minimize, min, warm };
}
