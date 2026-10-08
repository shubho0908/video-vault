"use client";

import { useRef, type CSSProperties, type RefObject } from "react";

/** Shared macOS window geometry: zoom rectangle and edge/corner resizing. */
export const MENU_H = 28;
export const ZOOM_STYLE: CSSProperties = { left: 0, top: MENU_H, width: "100vw", height: "calc(100vh - 112px)", translate: "0px 0px" };

export type Geom = { x: number; y: number; w: number; h: number };
type Dir = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";
const DIRS: Dir[] = ["n", "s", "e", "w", "ne", "nw", "se", "sw"];
const CURSOR: Record<Dir, string> = { n: "ns-resize", s: "ns-resize", e: "ew-resize", w: "ew-resize", ne: "nesw-resize", sw: "nesw-resize", nw: "nwse-resize", se: "nwse-resize" };
const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), Math.max(lo, hi));

/** Eight invisible handles around the window. Moves write styles directly (no React render per pointermove) and commit once on release. */
export function ResizeHandles({ frame, base, min, onCommit }: {
  frame: RefObject<HTMLElement | null>;
  base: () => { x: number; y: number };
  min: [number, number];
  onCommit: (g: Geom) => void;
}) {
  const live = useRef({ base, min, onCommit });
  live.current = { base, min, onCommit };

  const start = (dir: Dir) => (e: React.PointerEvent<HTMLElement>) => {
    const el = frame.current;
    if (!el || e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const handle = e.currentTarget;
    handle.setPointerCapture(e.pointerId);
    const r0 = el.getBoundingClientRect();
    const { x: bx, y: by } = live.current.base();
    const [minW, minH] = live.current.min;
    const vw = innerWidth, vh = innerHeight;
    const sx = e.clientX, sy = e.clientY;
    let L = r0.left, T = r0.top, R = r0.right, B = r0.bottom;
    const mv = (m: PointerEvent) => {
      const dx = m.clientX - sx, dy = m.clientY - sy;
      L = r0.left; T = r0.top; R = r0.right; B = r0.bottom;
      if (dir.includes("w")) L = clamp(r0.left + dx, 0, R - minW);
      if (dir.includes("e")) R = clamp(r0.right + dx, L + minW, vw);
      if (dir.includes("n")) T = clamp(r0.top + dy, MENU_H, B - minH);
      if (dir.includes("s")) B = clamp(r0.bottom + dy, T + minH, vh);
      el.style.width = `${R - L}px`;
      el.style.height = `${B - T}px`;
      el.style.translate = `${bx + L - r0.left}px ${by + T - r0.top}px`;
    };
    const up = () => {
      handle.removeEventListener("pointermove", mv);
      handle.removeEventListener("pointerup", up);
      handle.removeEventListener("pointercancel", up);
      live.current.onCommit({ x: bx + L - r0.left, y: by + T - r0.top, w: R - L, h: B - T });
    };
    handle.addEventListener("pointermove", mv);
    handle.addEventListener("pointerup", up);
    handle.addEventListener("pointercancel", up);
  };

  return (
    <>
      {DIRS.map(d => <i key={d} className={`fx-rz fx-rz-${d}`} data-nodrag data-rz={d} style={{ cursor: CURSOR[d] }} onPointerDown={start(d)} />)}
    </>
  );
}

/** keep a dragged window usable: below the menu bar, above the dock, never fully off screen sideways */
export function clampDrag(r0: DOMRect, dx: number, dy: number): [number, number] {
  const vw = window.innerWidth, vh = window.innerHeight;
  const cl = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), Math.max(lo, hi));
  const ndy = cl(dy, MENU_H - r0.top, vh - 40 - r0.bottom);
  const ndx = cl(dx, 80 - r0.right, vw - 80 - r0.left);
  return [ndx, ndy];
}
