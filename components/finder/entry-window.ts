"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

import { entryDock, useEntryDock } from "./entry-dock";
import { coolGenie, nextFrame, takeMinimize, takeRestore, warmGenie } from "./genie";
import type { Geom } from "./window-geom";


export function useEntryWindow(frame: RefObject<HTMLDivElement | null>, pos: RefObject<{ x: number; y: number }>, title: string, enabled: boolean) {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const dock = useEntryDock();
  const minimized = useRef(false);
  const busy = useRef(false);
  const [min, setMin] = useState(false);
  const queued = useRef(false);

  const runRestore = useCallback((slot: DOMRect) => {
    const el = frame.current;
    if (!el) return;
    busy.current = true;
    void takeRestore(el)
      .catch(() => null)
      .then(async g => {
        setMin(false);
        entryDock.setThumb(null);
        try {
          if (g) await g.play(slot, "out", 560);
        } finally {
          el.style.visibility = "";
          minimized.current = false;
          busy.current = false;
          entryDock.leave();
        }
      });
  }, [frame]);

  const commit = useCallback((g: Geom) => { pos.current = { x: g.x, y: g.y }; setSize({ w: g.w, h: g.h }); }, [pos]);

  const minimize = useCallback(async () => {
    const el = frame.current;
    if (!el || busy.current || minimized.current) return;
    busy.current = true;
    const prepared = takeMinimize(el).catch(() => ({ genie: null, thumb: null }));
    entryDock.show(title);
    setMin(true);
    minimized.current = true;
    try {
      const { genie: g, thumb } = await prepared;
      for (let i = 0; i < 3 && !entryDock.get()?.slotRect; i++) await nextFrame();
      const slot = entryDock.get()?.slotRect ?? entryDock.get()?.slot?.getBoundingClientRect();
      const land = () => thumb && entryDock.get()?.thumb !== thumb && entryDock.setThumb(thumb);
      if (g && slot) await g.play(slot, "in", 620, land, () => entryDock.get()?.slot ?? null);
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

  const rect = dock?.restoreRect ?? null;
  useEffect(() => {
    const el = frame.current;
    if (!rect || !el || !minimized.current) return;
    if (busy.current) return void (queued.current = true);
    runRestore(rect);
  }, [rect, frame, runRestore]);

  const warm = useCallback((dir: "in" | "out", on: boolean) => {
    if (on && !busy.current) warmGenie(frame.current, dir);
    else if (!on) coolGenie(frame.current, dir);
  }, [frame]);
  useEffect(() => {
    entryDock.setWarm(warm);
    return () => entryDock.setWarm(null);
  }, [warm]);

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
