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
      handle.removeEventListener("lostpointercapture", up);
      live.current.onCommit({ x: bx + L - r0.left, y: by + T - r0.top, w: R - L, h: B - T });
    };
    handle.addEventListener("pointermove", mv);
    handle.addEventListener("pointerup", up);
    handle.addEventListener("pointercancel", up);
    handle.addEventListener("lostpointercapture", up);
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

/**
 * Move a window by its title bar. The position is written straight to the element's `translate`
 * on every pointermove (no React render per frame) and committed once when the drag ends.
 * Returns false when the press should not start a drag.
 */
export function startWindowDrag(
  e: React.PointerEvent,
  win: HTMLElement | null,
  from: { x: number; y: number },
  commit: (p: { x: number; y: number }) => void
): boolean {
  const handle = e.currentTarget as HTMLElement;
  if (!win || e.button !== 0) return false;
  handle.setPointerCapture(e.pointerId);
  const r0 = win.getBoundingClientRect();
  const sx = e.clientX, sy = e.clientY;
  let x = from.x, y = from.y;
  const mv = (m: PointerEvent) => {
    const [dx, dy] = clampDrag(r0, m.clientX - sx, m.clientY - sy);
    x = from.x + dx;
    y = from.y + dy;
    win.style.translate = `${x}px ${y}px`;
  };
  const up = () => {
    handle.removeEventListener("pointermove", mv);
    handle.removeEventListener("pointerup", up);
    handle.removeEventListener("pointercancel", up);
    handle.removeEventListener("lostpointercapture", up);
    if (x !== from.x || y !== from.y) commit({ x, y });
  };
  handle.addEventListener("pointermove", mv);
  handle.addEventListener("pointerup", up);
  handle.addEventListener("pointercancel", up);
  handle.addEventListener("lostpointercapture", up);
  return true;
}

/** CSS cubic-bezier(x1,y1,x2,y2) as a function of time. */
function bezier(x1: number, y1: number, x2: number, y2: number) {
  const f = (a: number, b: number, t: number) => 3 * a * t * (1 - t) ** 2 + 3 * b * t * t * (1 - t) + t ** 3;
  return (x: number) => {
    let lo = 0, hi = 1, t = x;
    for (let i = 0; i < 24; i++) {
      const v = f(x1, x2, t);
      if (Math.abs(v - x) < 1e-5) break;
      if (v < x) lo = t; else hi = t;
      t = (lo + hi) / 2;
    }
    return f(y1, y2, t);
  };
}
const zoomEase = bezier(0.32, 0.72, 0, 1);
const ZOOM_MS = 420;
const ZOOM_STEPS = 28;
const FLIP_ID = "fx-flip";

/**
 * Zoom (green button) animation, compositor-only. The window is already at its final size; the frame
 * is scaled from the old box to the new one while each child gets the inverse scale, so the content
 * keeps its real size (no squashed text) and is revealed or covered by the growing or shrinking frame.
 * Nothing is laid out or repainted per frame, unlike animating left/top/width/height.
 */
export function flipZoom(el: HTMLElement | null, from: DOMRect | null | undefined) {
  if (!el || !from) return;
  const kids = (Array.from(el.children) as HTMLElement[]).filter(k => !k.classList.contains("fx-rz"));
  for (const n of [el, ...kids]) for (const a of n.getAnimations()) if (a.id === FLIP_ID) a.cancel();
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const to = el.getBoundingClientRect();
  if (!to.width || !to.height || !from.width || !from.height) return;
  const sx0 = from.width / to.width, sy0 = from.height / to.height;
  const dx0 = from.left - to.left, dy0 = from.top - to.top;
  if (Math.abs(sx0 - 1) < 0.005 && Math.abs(sy0 - 1) < 0.005 && Math.abs(dx0) < 0.5 && Math.abs(dy0) < 0.5) return;
  const frame: Keyframe[] = [];
  const inverse: Keyframe[] = [];
  for (let k = 0; k <= ZOOM_STEPS; k++) {
    const t = k / ZOOM_STEPS, p = zoomEase(t);
    const sx = sx0 + (1 - sx0) * p, sy = sy0 + (1 - sy0) * p;
    frame.push({ offset: t, transformOrigin: "0 0", transform: `translate(${dx0 * (1 - p)}px, ${dy0 * (1 - p)}px) scale(${sx}, ${sy})` });
    inverse.push({ offset: t, transform: `scale(${1 / sx}, ${1 / sy})` });
  }
  // measure every child before anything starts moving
  const origins = kids.map(k => {
    const r = k.getBoundingClientRect();
    return `${to.left - r.left}px ${to.top - r.top}px`;
  });
  el.animate(frame, { duration: ZOOM_MS, easing: "linear", id: FLIP_ID });
  kids.forEach((k, i) => k.animate(inverse.map(f => ({ ...f, transformOrigin: origins[i] })), { duration: ZOOM_MS, easing: "linear", id: FLIP_ID }));
}
