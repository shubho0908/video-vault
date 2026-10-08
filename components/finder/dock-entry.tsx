"use client";

import { useEffect, useRef } from "react";

import { entryDock, useEntryDock } from "./entry-dock";
import { NotesIcon } from "./icons";

const BASE = 54;
/** Dock slot for a minimized entry window (same look as the app thumbnails). */
export function EntrySlot() {
  const m = useEntryDock();
  const box = useRef<HTMLDivElement>(null);
  const thumb = m?.thumb;
  useEffect(() => {
    const el = box.current;
    if (!el || !thumb) return;
    thumb.removeAttribute("class");
    thumb.className = "fx-window";
    Object.assign(thumb.style, { position: "absolute", left: "0", top: "0", width: "1040px", height: "720px", translate: "none", transform: `scale(${BASE / 1040})`, transformOrigin: "0 0", visibility: "visible", pointerEvents: "none" });
    el.replaceChildren(thumb);
  }, [thumb]);
  if (!m) return null;
  return (
    <div className="fx-dock-item" style={{ width: BASE, height: BASE + 6 }} data-min="entry">
      <div ref={el => { box.current = el; entryDock.setSlot(el); }} className="fx-dock-thumb" style={{ width: BASE, height: Math.round((BASE * 720) / 1040), opacity: thumb ? 1 : 0 }} />
      <button aria-label={`Restore ${m.title}`} className="fx-dock-thumb-hit" onClick={() => entryDock.requestRestore(box.current!.getBoundingClientRect())}>
        <span className="fx-dock-badge"><NotesIcon size={22} /></span>
      </button>
    </div>
  );
}
