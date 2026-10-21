"use client";

import { useEffect, useRef } from "react";

import { entryDock, useEntryDock } from "./entry-dock";
import { fitThumb } from "./genie";
import { NotesIcon } from "./icons";

const BASE = 54;
const TW = Math.round((BASE * 1040) / 720);
/** Dock slot for a minimized entry window (same look as the app thumbnails). */
export function EntrySlot() {
  const m = useEntryDock();
  const box = useRef<HTMLDivElement>(null);
  const thumb = m?.thumb;
  useEffect(() => {
    const el = box.current;
    if (!el || !thumb) return;
    fitThumb(thumb, TW, BASE);
    el.replaceChildren(thumb);
  }, [thumb]);
  if (!m) return null;
  return (
    <div className="fx-dock-item" style={{ width: TW, height: BASE }} data-min="entry">
      <div ref={el => { box.current = el; entryDock.setSlot(el); }} className="fx-dock-thumb" style={{ width: TW, height: BASE, opacity: thumb ? 1 : 0 }} />
      <button aria-label={`Restore ${m.title}`} className="fx-dock-thumb-hit" onClick={() => entryDock.requestRestore(box.current!.getBoundingClientRect())}>
        <span className="fx-dock-badge"><NotesIcon size={22} /></span>
      </button>
    </div>
  );
}
