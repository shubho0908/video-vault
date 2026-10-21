"use client";

import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";

import { EntrySlot } from "./dock-entry";
import { coolGenie, fitThumb, nextFrame, retargetGenies, settledRect, takeMinimize, takeRestore, warmGenie, type Genie } from "./genie";
import { ResizeHandles, ZOOM_STYLE, flipZoom, startWindowDrag, type Geom } from "./window-geom";
import { CalculatorIcon, FinderFace, NotesIcon, SettingsIcon } from "./icons";

export type AppId = "finder" | "notes" | "calculator" | "settings";

export const APPS: Record<AppId, { name: string; w: number; h: number; icon: (s: number) => ReactNode; resizable: boolean; min?: [number, number] }> = {
  finder: { name: "Finder", w: 980, h: 640, icon: s => <FinderFace size={s} />, resizable: true, min: [520, 340] },
  notes: { name: "Notes", w: 760, h: 500, icon: s => <NotesIcon size={s} />, resizable: true, min: [480, 300] },
  calculator: { name: "Calculator", w: 232, h: 352, icon: s => <CalculatorIcon size={s} />, resizable: false },
  settings: { name: "System Settings", w: 700, h: 480, icon: s => <SettingsIcon size={s} />, resizable: false },
};
export const ORDER: AppId[] = ["finder", "notes", "calculator", "settings"];

export type Win = { open: boolean; min: boolean; zoomed: boolean; z: number; x: number; y: number; w?: number; h?: number };
export type Wins = Record<AppId, Win>;
type Api = {
  close(): Promise<void>;
  /** Snapshot the window and build the genie copies (starts before the Dock slot exists). */
  prepareMinimize(): Promise<{ genie: Genie | null; thumb: HTMLElement | null }>;
  /** Build the genie copies for the way back while the window is still hidden. */
  prepareRestore(): Promise<Genie | null>;
  /** Remember the current box so the zoom can animate from it. */
  prepareZoom(): void;
  setHidden(hidden: boolean): void;
  /** Pointer is on the minimize button / Dock thumbnail: build the genie ahead of the click (or drop it). */
  warm(dir: "in" | "out", on: boolean): void;
};

const base: Win = { open: false, min: false, zoomed: false, z: 1, x: 0, y: 0 };
/** Window z-indexes stay below the genie overlay (35), the Dock (40) and the menu bar (50). */
const Z_FLOOR = 11;
const Z_CEIL = 30;

/** Bring one window to the front; returns the same object when it already is (React then skips the render). */
export function raise(w: Wins, id: AppId): Wins {
  const top = Math.max(...ORDER.map(a => w[a].z));
  if (w[id].z === top && ORDER.every(a => a === id || w[a].z < top)) return w;
  const next: Wins = { ...w, [id]: { ...w[id], z: top + 1 } };
  if (top + 1 <= Z_CEIL) return next;
  // renumber, keeping the stacking order, so z never climbs over the Dock or the menu bar
  [...ORDER].sort((a, b) => next[a].z - next[b].z).forEach((a, i) => (next[a] = { ...next[a], z: Z_FLOOR + i }));
  return next;
}

export function useWindowManager() {
  const [wins, setWins] = useState<Wins>({
    finder: base,
    notes: base,
    calculator: base,
    settings: base,
  });
  const [front, setFront] = useState<AppId>("finder");
  const [bounce, setBounce] = useState<AppId | null>(null);
  const [thumbs, setThumbs] = useState<Partial<Record<AppId, HTMLElement>>>({});
  /**
   * Dock slots for minimized windows, separate from `min` so a slot can grow in before the genie lands
   * and shrink away after the window is back out (like macOS) instead of popping in and out.
   */
  const [docked, setDocked] = useState<Partial<Record<AppId, "in" | "out">>>({});
  // key order is Dock order: a newly minimized window is appended at the right end, like macOS
  const dock = useCallback((id: AppId, v: "in" | "out" | undefined) =>
    setDocked(d => {
      if (d[id] === v) return d;
      if (v) return { ...d, [id]: v };
      const { [id]: _gone, ...rest } = d;
      void _gone;
      return rest;
    }), []);
  const undock = useCallback((id: AppId) => dock(id, undefined), [dock]);
  /** Final slot box, measured when the slot mounts (before it animates its width). */
  const slotRects = useRef<Partial<Record<AppId, DOMRect>>>({});
  const apis = useRef<Partial<Record<AppId, Api>>>({});
  const slots = useRef<Partial<Record<AppId, HTMLElement | null>>>({});
  // Latest window state for event handlers, so every callback below is created once and stays stable.
  const live = useRef(wins);
  const busy = useRef(new Set<AppId>());
  /** Dock clicks that arrived while that window was still minimizing: restored as soon as it lands. */
  const queued = useRef(new Set<AppId>());
  const bounceTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(bounceTimer.current), []);

  const update = useCallback((fn: (w: Wins) => Wins) => setWins(w => (live.current = fn(w))), []);
  const patch = useCallback((id: AppId, p: Partial<Win>) => update(w => ({ ...w, [id]: { ...w[id], ...p } })), [update]);
  const nextFront = (id: AppId) => ORDER.find(o => o !== id && live.current[o].open && !live.current[o].min) ?? "finder";

  const focus = useCallback((id: AppId) => {
    setFront(id);
    update(w => raise(w, id));
  }, [update]);

  const restore = useCallback(
    async (id: AppId) => {
      if (busy.current.has(id)) {
        // only a minimize in flight is worth waiting for; a click during a restore is a duplicate
        if (live.current[id].min) queued.current.add(id);
        return;
      }
      busy.current.add(id);
      const api = apis.current[id];
      try {
        const slot = slots.current[id]?.getBoundingClientRect();
        // build the copies while the window is still minimized, then swap state and animate in the same frame
        const g = slot && api ? await api.prepareRestore().catch(() => null) : null;
        update(w => raise({ ...w, [id]: { ...w[id], min: false } }, id));
        setFront(id);
        setThumbs(t => ({ ...t, [id]: undefined }));
        if (g && slot) await g.play(slot, "out", 560);
      } finally {
        // never leave the window invisible or locked, whatever happened above
        api?.setHidden(false);
        busy.current.delete(id);
        // the empty slot closes up only once the window is fully out
        if (!live.current[id].min) dock(id, "out");
      }
    },
    [update, dock]
  );

  const launch = useCallback(
    (id: AppId) => {
      const w = live.current[id];
      if (w.open && w.min) return void restore(id);
      if (w.open) return focus(id);
      update(v => raise({ ...v, [id]: { ...v[id], open: true, min: false } }, id));
      setFront(id);
      setBounce(id);
      clearTimeout(bounceTimer.current);
      bounceTimer.current = setTimeout(() => setBounce(b => (b === id ? null : b)), 1500);
    },
    [restore, focus, update]
  );

  const close = useCallback(
    async (id: AppId) => {
      if (busy.current.has(id) || !live.current[id].open) return;
      if (!live.current[id].min) await apis.current[id]?.close();
      patch(id, { open: false, min: false, zoomed: false });
      setThumbs(t => ({ ...t, [id]: undefined }));
      undock(id);
      setFront(f => (f === id ? nextFront(id) : f));
    },
    [patch, undock]
  );

  const minimize = useCallback(
    async (id: AppId) => {
      const w = live.current[id];
      if (w.min || !w.open || busy.current.has(id)) return;
      busy.current.add(id);
      const api = apis.current[id];
      try {
        // snapshot now (before React touches the window) and build while the Dock makes room
        const prepared = (api?.prepareMinimize() ?? Promise.resolve({ genie: null, thumb: null })).catch(() => ({ genie: null, thumb: null }));
        patch(id, { min: true });
        dock(id, "in");
        const { genie, thumb } = await prepared;
        // the click's state update commits right after the event, mounting the slot; wait a frame only if not yet
        for (let i = 0; i < 3 && !slotRects.current[id]; i++) await nextFrame();
        // the slot is still growing: aim at the box it grows into, not its current one
        const slot = slotRects.current[id] ?? slots.current[id]?.getBoundingClientRect();
        const land = () => thumb && setThumbs(t => (t[id] === thumb ? t : { ...t, [id]: thumb }));
        if (genie && slot) await genie.play(slot, "in", 620, land, () => slots.current[id] ?? null);
        else genie?.cancel();
        land();
        setFront(f => (f === id ? nextFront(id) : f));
      } finally {
        api?.setHidden(true);
        busy.current.delete(id);
      }
      if (queued.current.delete(id)) void restore(id);
    },
    [patch, restore, dock]
  );

  const setGeom = useCallback((id: AppId, g: Geom) => patch(id, g), [patch]);

  const zoom = useCallback(
    (id: AppId) => {
      const w = live.current[id];
      if (!w.open || w.min || !APPS[id].resizable) return;
      apis.current[id]?.prepareZoom();
      patch(id, { zoomed: !w.zoomed });
    },
    [patch]
  );

  const drag = useCallback(
    (id: AppId, e: React.PointerEvent) => {
      focus(id);
      const w = live.current[id];
      if ((e.target as HTMLElement).closest("button,input,a,[data-nodrag]") || w.zoomed) return;
      const win = (e.currentTarget as HTMLElement).closest<HTMLElement>(".fx-window");
      startWindowDrag(e, win, { x: w.x, y: w.y }, p => patch(id, p));
    },
    [focus, patch]
  );

  /** Speculative genie build while the pointer rests on a minimize button or Dock thumbnail (never during an animation). */
  const warm = useCallback((id: AppId, dir: "in" | "out", on: boolean) => {
    if (on && busy.current.has(id)) return;
    apis.current[id]?.warm(dir, on);
  }, []);

  return { wins, front, bounce, thumbs, docked, undock, slotRects, apis, slots, focus, warm, launch, close, minimize, restore, zoom, drag, setGeom };
}
export type WM = ReturnType<typeof useWindowManager>;

const EASE_IN = "cubic-bezier(.4,0,1,1)";
const EASE_OUT = "cubic-bezier(.2,.9,.3,1)";
const finished = (a: Animation) => a.finished.then(() => undefined, () => undefined);

export function AppWindow({ id, wm, className, children }: { id: AppId; wm: WM; className?: string; children: ReactNode }) {
  const w = wm.wins[id];
  const app = APPS[id];
  const ref = useRef<HTMLDivElement>(null);
  const order = ORDER.indexOf(id);
  const mounted = useRef(false);
  const zoomFrom = useRef<DOMRect | null>(null);

  useEffect(() => {
    wm.apis.current[id] = {
      async close() {
        const el = ref.current;
        coolGenie(el, "in");
        if (el) await finished(el.animate([{ transform: "scale(1)", opacity: 1 }, { transform: "scale(0.94)", opacity: 0 }], { duration: 200, easing: EASE_IN, fill: "forwards" }));
      },
      async prepareMinimize() {
        return ref.current ? takeMinimize(ref.current) : { genie: null, thumb: null };
      },
      async prepareRestore() {
        return ref.current ? takeRestore(ref.current) : null;
      },
      warm(dir, on) {
        if (on) warmGenie(ref.current, dir);
        else coolGenie(ref.current, dir);
      },
      prepareZoom() {
        zoomFrom.current = ref.current?.getBoundingClientRect() ?? null;
      },
      setHidden(h) {
        if (ref.current) ref.current.style.visibility = h ? "hidden" : "";
      },
    };
  });

  useLayoutEffect(() => {
    if (w.open && ref.current && !mounted.current) {
      mounted.current = true;
      ref.current.animate([{ transform: "scale(0.9)", opacity: 0 }, { transform: "none", opacity: 1 }], { duration: 300, easing: EASE_OUT });
    }
    if (!w.open) mounted.current = false;
  }, [w.open]);

  // zoom: the window is already at its new box; animate from the old one on the compositor
  useLayoutEffect(() => {
    const from = zoomFrom.current;
    zoomFrom.current = null;
    if (from) flipZoom(ref.current, from);
  }, [w.zoomed]);

  if (!w.open) return null;
  const W = `min(${app.w}px, calc(100vw - 80px))`, H = `min(${app.h}px, calc(100vh - 150px))`;
  const style: React.CSSProperties = w.zoomed
    ? { ...ZOOM_STYLE, zIndex: w.z }
    : {
        left: `calc(50% - ${W} / 2 + ${order * 26}px)`,
        top: `calc(50% - ${H} / 2 - 8px + ${order * 22}px)`,
        width: w.w ?? W,
        height: w.h ?? H,
        zIndex: w.z,
        translate: `${w.x}px ${w.y}px`,
      };

  return (
    <div
      ref={ref}
      className={`fx-window ${className ?? ""}`}
      data-app={id}
      data-active={wm.front === id}
      data-min={w.min}
      data-zoomed={w.zoomed}
      style={style}
      onPointerDown={() => wm.focus(id)}
    >
      <div className="fx-traffic" data-nodrag>
        <button className="r" aria-label="Close" onClick={() => wm.close(id)}><svg viewBox="0 0 12 12"><path d="m3.600 3.600 4.800 4.800m0-4.800-4.800 4.800" /></svg></button>
        <button
          className="y"
          aria-label="Minimize"
          onClick={() => wm.minimize(id)}
          onPointerEnter={e => e.pointerType === "mouse" && !w.min && wm.warm(id, "in", true)}
          onPointerLeave={() => wm.warm(id, "in", false)}
        ><svg viewBox="0 0 12 12"><path d="M3 6h6" /></svg></button>
        <button className="g" aria-label="Zoom" disabled={!app.resizable} onClick={() => wm.zoom(id)}><svg viewBox="0 0 12 12"><path d="M3.500 8.500V4.600a1.100 1.100 0 0 1 1.100-1.100h3.900M8.500 3.500v3.900a1.100 1.100 0 0 1-1.100 1.100H3.500" /></svg></button>
      </div>
      {children}
      {app.resizable && !w.zoomed && <ResizeHandles frame={ref} base={() => ({ x: w.x, y: w.y })} min={app.min ?? [320, 240]} onCommit={g => wm.setGeom(id, g)} />}
    </div>
  );
}

const BASE = 54;
const MAX = 1.55;
const REACH = 105;

/**
 * Dock with macOS magnification. The per-frame sizes are written straight to the item elements
 * (no React render per frame); React only renders when windows open, close or minimize.
 */
function DockView({ wm }: { wm: WM }) {
  const tgt = useRef<{ x: number; on: boolean }>({ x: 0, on: false });
  const cur = useRef({ x: 0, k: 0, t: 0 });
  const raf = useRef(0);
  const centers = useRef<number[]>([]);
  const items = useRef<(HTMLDivElement | null)[]>([]);
  const row = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<string | null>(null);
  const minimized = (Object.keys(wm.docked) as AppId[]).filter(id => wm.docked[id]);

  const paint = (x: number, k: number) => {
    items.current.forEach((el, i) => {
      const c = centers.current[i];
      if (!el) return;
      const t = c === undefined ? 1 : Math.min(Math.abs(x - c) / REACH, 1);
      const s = `${BASE * (1 + (MAX - 1) * k * ((1 + Math.cos(Math.PI * t)) / 2))}px`;
      if (el.style.width !== s) (el.style.width = s), (el.style.height = s);
    });
  };
  const tick = (now: number) => {
    const c = cur.current, g = tgt.current;
    const dt = Math.min(0.05, c.t ? (now - c.t) / 1000 : 0.016);
    c.t = now;
    const targetK = g.on ? 1 : 0;
    c.x += (g.x - c.x) * (1 - Math.exp(-dt * 22));
    c.k += (targetK - c.k) * (1 - Math.exp(-dt * 14));
    const done = Math.abs(targetK - c.k) < 0.003 && Math.abs(g.x - c.x) < 0.1;
    if (done) (c.x = g.x), (c.k = targetK), (c.t = 0);
    paint(c.x, c.k);
    raf.current = done ? 0 : requestAnimationFrame(tick);
  };
  const aim = (x: number, on: boolean) => {
    if (on && !tgt.current.on && cur.current.k < 0.003) cur.current.x = x;
    tgt.current = { x, on };
    if (!raf.current) raf.current = requestAnimationFrame(tick);
  };
  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const measure = () => {
    centers.current = items.current.map(el => {
      if (!el) return NaN;
      const r = el.getBoundingClientRect();
      return r.left + r.width / 2;
    });
  };

  let idx = 0;
  const item = (key: string, label: string, node: ReactNode, onClick?: () => void, dot = false, bounce = false) => {
    const i = idx++;
    return (
      <div
        key={key}
        ref={el => void (items.current[i] = el)}
        data-di={i}
        className="fx-dock-item"
        style={{ width: BASE, height: BASE, transition: "none" }}
        onPointerEnter={() => setHover(key)}
        onPointerLeave={() => setHover(h => (h === key ? null : h))}
      >
        {hover === key && <span className="fx-tip fx-glass">{label}</span>}
        <button aria-label={label} onClick={onClick} className={bounce ? "fx-bounce" : undefined}>
          {node}
        </button>
        {dot && <span className="dot" />}
      </div>
    );
  };

  return (
    <div
      className="fx-dock fx-glass"
      ref={row}
      onPointerEnter={e => (measure(), aim(e.clientX, true))}
      onPointerMove={e => aim(e.clientX, true)}
      onPointerLeave={() => (aim(tgt.current.x, false), setHover(null))}
    >
      {ORDER.map(id =>
        item(id, APPS[id].name, APPS[id].icon(BASE), () => wm.launch(id), id === "finder" || wm.wins[id].open, wm.bounce === id)
      )}
      <span className="fx-dock-sep" />
      {minimized.map(id => (
        <Slot key={`m${id}`} id={id} wm={wm} leaving={wm.docked[id] === "out"} />
      ))}
      <EntrySlot />
      {item("trash", "Trash", <img src="/icons/trash.png" width={BASE} height={BASE} alt="" draggable={false} style={{ display: "block" }} />)}
    </div>
  );
}
/** The Dock only depends on window state, bounce and thumbnails; the rest of the desktop re-rendering must not touch it. */
export const Dock = memo(DockView, (a, b) => a.wm.wins === b.wm.wins && a.wm.bounce === b.wm.bounce && a.wm.thumbs === b.wm.thumbs && a.wm.docked === b.wm.docked);

const SLOT_EASE = "cubic-bezier(.2,.8,.2,1)";
/** The Dock's flex gap: a slot animating to zero width also takes its gap with it, so nothing jumps. */
const DOCK_GAP = 6;

function Slot({ id, wm, leaving }: { id: AppId; wm: WM; leaving: boolean }) {
  const app = APPS[id];
  const item = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const thumb = wm.thumbs[id];
  const tw = Math.round((BASE * app.w) / app.h);
  const { undock, slotRects } = wm;
  useEffect(() => {
    const el = box.current;
    if (!el || !thumb) return;
    fitThumb(thumb, tw, BASE);
    el.replaceChildren(thumb);
  }, [thumb, tw]);

  // grow in: measure the final box first (the genie aims there), then open the gap from zero
  useLayoutEffect(() => {
    const el = item.current;
    if (!el || !box.current) return;
    // the final box, even if another slot is still growing or shrinking next to it
    slotRects.current[id] = settledRect(box.current);
    if (!matchMedia("(prefers-reduced-motion: reduce)").matches)
      el.animate([{ width: "0px", marginLeft: `-${DOCK_GAP}px` }, { width: `${tw}px`, marginLeft: "0px" }], { duration: 280, easing: SLOT_EASE });
    // the centred Dock just grew: genies still flying to other slots follow them
    retargetGenies();
    return () => void delete slotRects.current[id];
  }, [id, tw, slotRects]);

  // shrink away once the window is back out, then leave the Dock
  useEffect(() => {
    const el = item.current;
    if (!leaving || !el) return;
    for (const a of el.getAnimations()) a.cancel();
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const a = el.animate([{ width: `${tw}px`, marginLeft: "0px" }, { width: "0px", marginLeft: `-${DOCK_GAP}px` }], { duration: reduce ? 1 : 240, easing: SLOT_EASE, fill: "forwards" });
    a.finished.then(() => undock(id), () => undefined);
    retargetGenies();
    return () => a.cancel();
  }, [leaving, id, tw, undock]);

  return (
    <div ref={item} className="fx-dock-item" style={{ width: tw, height: BASE }} data-min={id}>
      <div
        ref={el => {
          box.current = el;
          wm.slots.current[id] = el;
        }}
        className="fx-dock-thumb"
        style={{ width: tw, height: BASE, opacity: thumb ? 1 : 0 }}
      />
      <button
        aria-label={`Restore ${app.name}`}
        onClick={() => wm.restore(id)}
        onPointerEnter={e => e.pointerType === "mouse" && thumb && wm.warm(id, "out", true)}
        onPointerLeave={() => wm.warm(id, "out", false)}
        className="fx-dock-thumb-hit"
        disabled={leaving}
      >
        <span className="fx-dock-badge" style={{ opacity: thumb ? 1 : 0 }}>{app.icon(22)}</span>
      </button>
    </div>
  );
}
