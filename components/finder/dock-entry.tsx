"use client";

import { useEffect, useLayoutEffect, useRef } from "react";

import { entryDock, useEntryDock } from "./entry-dock";
import { fitThumb, retargetGenies, settledRect } from "./genie";
import { NotesIcon } from "./icons";

const BASE = 54;
const TW = Math.round((BASE * 1040) / 720);
const DOCK_GAP = 6;
const EASE = "cubic-bezier(.2,.8,.2,1)";
const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

export function EntrySlot() {
  const m = useEntryDock();
  const item = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const thumb = m?.thumb;
  const shown = !!m;
  const leaving = !!m?.leaving;
  useEffect(() => {
    const el = box.current;
    if (!el || !thumb) return;
    fitThumb(thumb, TW, BASE);
    el.replaceChildren(thumb);
  }, [thumb]);
  useEffect(() => {
    if (!thumb) box.current?.replaceChildren();
  }, [thumb]);

  useLayoutEffect(() => {
    const el = item.current;
    if (!shown || !el || !box.current) return;
    entryDock.setSlotRect(settledRect(box.current));
    if (!reduced()) el.animate([{ width: "0px", marginLeft: `-${DOCK_GAP}px` }, { width: `${TW}px`, marginLeft: "0px" }], { duration: 280, easing: EASE });
    retargetGenies();
  }, [shown]);

  useEffect(() => {
    const el = item.current;
    if (!leaving || !el) return;
    for (const a of el.getAnimations()) a.cancel();
    const a = el.animate([{ width: `${TW}px`, marginLeft: "0px" }, { width: "0px", marginLeft: `-${DOCK_GAP}px` }], { duration: reduced() ? 1 : 240, easing: EASE, fill: "forwards" });
    a.finished.then(() => entryDock.get()?.leaving && entryDock.clear(), () => undefined);
    retargetGenies();
    return () => a.cancel();
  }, [leaving]);

  if (!m) return null;
  return (
    <div ref={item} className="fx-dock-item" style={{ width: TW, height: BASE }} data-min="entry">
      <div ref={el => { box.current = el; entryDock.setSlot(el); }} className="fx-dock-thumb" style={{ width: TW, height: BASE, opacity: thumb ? 1 : 0 }} />
      <button
        aria-label={`Restore ${m.title}`}
        className="fx-dock-thumb-hit"
        disabled={leaving}
        onPointerEnter={e => e.pointerType === "mouse" && thumb && entryDock.warm(true)}
        onPointerLeave={() => entryDock.warm(false)}
        onClick={() => entryDock.requestRestore(box.current!.getBoundingClientRect())}
      >
        <span className="fx-dock-badge" style={{ opacity: thumb ? 1 : 0 }}><NotesIcon size={22} /></span>
      </button>
    </div>
  );
}
