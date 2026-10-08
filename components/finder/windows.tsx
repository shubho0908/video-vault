"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";

import { EntrySlot } from "./dock-entry";
import { genie } from "./genie";
import { ResizeHandles, ZOOM_STYLE, clampDrag, type Geom } from "./window-geom";
import { CalculatorIcon, FinderFace, NotesIcon, SettingsIcon } from "./icons";

export type AppId = "finder" | "notes" | "calculator" | "settings";

export const APPS: Record<AppId, { name: string; w: number; h: number; icon: (s: number) => ReactNode; resizable: boolean; min?: [number, number] }> = {
  finder: { name: "Finder", w: 980, h: 640, icon: s => <FinderFace size={s} />, resizable: true, min: [520, 340] },
  notes: { name: "Notes", w: 760, h: 500, icon: s => <NotesIcon size={s} />, resizable: true, min: [480, 300] },
  calculator: { name: "Calculator", w: 232, h: 352, icon: s => <CalculatorIcon size={s} />, resizable: false },
  settings: { name: "System Settings", w: 700, h: 480, icon: s => <SettingsIcon size={s} />, resizable: false },
};
export const ORDER: AppId[] = ["finder", "notes", "calculator", "settings"];

type Win = { open: boolean; min: boolean; zoomed: boolean; z: number; x: number; y: number; w?: number; h?: number };
type Api = {
  close(): Promise<void>;
  minimizeTo(rect: DOMRect): Promise<HTMLElement | null>;
  restoreFrom(rect: DOMRect): Promise<void>;
};

const base: Win = { open: false, min: false, zoomed: false, z: 1, x: 0, y: 0 };

export function useWindowManager() {
  const [wins, setWins] = useState<Record<AppId, Win>>({
    finder: base,
    notes: base,
    calculator: base,
    settings: base,
  });
  const [front, setFront] = useState<AppId>("finder");
  const [bounce, setBounce] = useState<AppId | null>(null);
  const [thumbs, setThumbs] = useState<Partial<Record<AppId, HTMLElement>>>({});
  const apis = useRef<Partial<Record<AppId, Api>>>({});
  const slots = useRef<Partial<Record<AppId, HTMLElement | null>>>({});
  const z = useRef(10);
  const patch = useCallback((id: AppId, p: Partial<Win>) => setWins(w => ({ ...w, [id]: { ...w[id], ...p } })), []);

  const focus = useCallback((id: AppId) => (setFront(id), patch(id, { z: ++z.current })), [patch]);

  const restore = useCallback(
    async (id: AppId) => {
      const slot = slots.current[id]?.getBoundingClientRect();
      patch(id, { min: false, z: ++z.current });
      setFront(id);
      setThumbs(t => ({ ...t, [id]: undefined }));
      if (slot) await apis.current[id]?.restoreFrom(slot);
    },
    [patch]
  );

  const launch = useCallback(
    (id: AppId) => {
      const w = wins[id];
      if (w.open && w.min) return void restore(id);
      if (w.open) return focus(id);
      patch(id, { open: true, min: false, z: ++z.current });
      setFront(id);
      setBounce(id);
      setTimeout(() => setBounce(b => (b === id ? null : b)), 1500);
    },
    [wins, restore, focus, patch]
  );

  const close = useCallback(
    async (id: AppId) => {
      if (!wins[id].min) await apis.current[id]?.close();
      patch(id, { open: false, min: false, zoomed: false });
      setThumbs(t => ({ ...t, [id]: undefined }));
      setFront(f => (f === id ? (ORDER.find(o => o !== id && wins[o].open && !wins[o].min) ?? "finder") : f));
    },
    [wins, patch]
  );

  const minimize = useCallback(
    async (id: AppId) => {
      if (wins[id].min || !wins[id].open) return;
      patch(id, { min: true });
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      const slot = slots.current[id]?.getBoundingClientRect();
      if (!slot) return;
      const snap = await apis.current[id]?.minimizeTo(slot);
      if (snap) setThumbs(t => ({ ...t, [id]: snap }));
      setFront(f => (f === id ? (ORDER.find(o => o !== id && wins[o].open && !wins[o].min) ?? "finder") : f));
    },
    [wins, patch]
  );

  const setGeom = useCallback((id: AppId, g: Geom) => patch(id, g), [patch]);

  const zoom = useCallback((id: AppId) => patch(id, { zoomed: !wins[id].zoomed }), [wins, patch]);

  const drag = useCallback(
    (id: AppId, e: React.PointerEvent) => {
      focus(id);
      if ((e.target as HTMLElement).closest("button,input,a,[data-nodrag]") || wins[id].zoomed) return;
      const sx = e.clientX - wins[id].x, sy = e.clientY - wins[id].y;
      const el = e.currentTarget as HTMLElement;
      el.setPointerCapture(e.pointerId);
      const r0 = (el.closest(".fx-window") ?? el).getBoundingClientRect();
      const x0 = wins[id].x, y0 = wins[id].y;
      const mv = (m: PointerEvent) => {
        const [dx, dy] = clampDrag(r0, m.clientX - sx - x0, m.clientY - sy - y0);
        patch(id, { x: x0 + dx, y: y0 + dy });
      };
      const up = () => (el.removeEventListener("pointermove", mv), el.removeEventListener("pointerup", up));
      el.addEventListener("pointermove", mv);
      el.addEventListener("pointerup", up);
    },
    [wins, focus, patch]
  );

  return { wins, front, bounce, thumbs, apis, slots, focus, launch, close, minimize, restore, zoom, drag, setGeom };
}
export type WM = ReturnType<typeof useWindowManager>;

const EASE_IN = "cubic-bezier(.4,0,1,1)";
const EASE_OUT = "cubic-bezier(.2,.9,.3,1)";
const finished = (a: Animation) => a.finished.then(() => undefined, () => undefined);

export function AppWindow({ id, wm, className, children }: { id: AppId; wm: WM; className?: string; children: ReactNode }) {
  const w = wm.wins[id];
  const app = APPS[id];
  const ref = useRef<HTMLDivElement>(null);
  const hidden = useRef(false);
  const order = ORDER.indexOf(id);
  const mounted = useRef(false);
  const [zooming, setZooming] = useState(false);

  useEffect(() => {
    wm.apis.current[id] = {
      async close() {
        const el = ref.current;
        if (el) await finished(el.animate([{ transform: "scale(1)", opacity: 1 }, { transform: "scale(0.94)", opacity: 0 }], { duration: 200, easing: EASE_IN, fill: "forwards" }));
      },
      async minimizeTo(rect) {
        const el = ref.current;
        if (!el) return null;
        const snap = el.cloneNode(true) as HTMLElement;
        snap.dataset.snap = "1";
        await genie(el, rect, "in", 620);
        hidden.current = true;
        el.style.visibility = "hidden";
        return snap;
      },
      async restoreFrom(rect) {
        const el = ref.current;
        if (!el) return;
        hidden.current = false;
        await genie(el, rect, "out", 560);
        el.style.visibility = "";
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

  useEffect(() => {
    if (!mounted.current) return;
    setZooming(true);
    const t = setTimeout(() => setZooming(false), 420);
    return () => clearTimeout(t);
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
      className={`fx-window ${zooming ? "fx-zooming" : ""} ${className ?? ""}`}
      data-app={id}
      data-active={wm.front === id}
      data-min={w.min}
      data-zoomed={w.zoomed}
      style={style}
      onPointerDown={() => wm.focus(id)}
    >
      <div className="fx-traffic" data-nodrag>
        <button className="r" aria-label="Close" onClick={() => wm.close(id)}><svg viewBox="0 0 12 12"><path d="m3.600 3.600 4.800 4.800m0-4.800-4.800 4.800" /></svg></button>
        <button className="y" aria-label="Minimize" onClick={() => wm.minimize(id)}><svg viewBox="0 0 12 12"><path d="M3 6h6" /></svg></button>
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

export function Dock({ wm }: { wm: WM }) {
  // mx: smoothed cursor x, k: magnification strength (0..1). Both ease toward their targets each frame so nothing jumps.
  const [mag, setMag] = useState<{ x: number; k: number } | null>(null);
  const tgt = useRef<{ x: number; on: boolean }>({ x: 0, on: false });
  const cur = useRef({ x: 0, k: 0, v: 0, t: 0 });
  const raf = useRef(0);
  const tick = (now: number) => {
    const c = cur.current, g = tgt.current;
    const dt = Math.min(0.05, c.t ? (now - c.t) / 1000 : 0.016); c.t = now;
    const a = 1 - Math.exp(-dt * 14);
    c.x += (g.x - c.x) * (1 - Math.exp(-dt * 22));
    c.k += ((g.on ? 1 : 0) - c.k) * a;
    const done = !g.on && c.k < 0.003;
    if (done) { c.k = 0; c.t = 0; raf.current = 0; setMag(null); return; }
    setMag({ x: c.x, k: c.k });
    raf.current = requestAnimationFrame(tick);
  };
  const aim = (x: number, on: boolean) => {
    if (on && !tgt.current.on && cur.current.k < 0.003) cur.current.x = x;
    tgt.current = { x, on };
    if (!raf.current) raf.current = requestAnimationFrame(tick);
  };
  useEffect(() => () => cancelAnimationFrame(raf.current), []);
  const [hover, setHover] = useState<string | null>(null);
  const centers = useRef<number[]>([]);
  const row = useRef<HTMLDivElement>(null);
  const minimized = ORDER.filter(id => wm.wins[id].open && wm.wins[id].min);

  const measure = () => {
    centers.current = [...(row.current?.querySelectorAll<HTMLElement>("[data-di]") ?? [])].map(el => {
      const r = el.getBoundingClientRect();
      return r.left + r.width / 2;
    });
  };
  const scale = (i: number) => {
    if (!mag || centers.current[i] === undefined) return 1;
    const t = Math.min(Math.abs(mag.x - centers.current[i]) / REACH, 1);
    return 1 + (MAX - 1) * mag.k * ((1 + Math.cos(Math.PI * t)) / 2);
  };

  let idx = 0;
  const item = (key: string, label: string, node: (s: number) => ReactNode, onClick?: () => void, dot = false, bounce = false, extra?: ReactNode) => {
    const i = idx++;
    const s = BASE * scale(i);
    return (
      <div
        key={key}
        data-di={i}
        className="fx-dock-item"
        style={{ width: s, height: s, transition: "none" }}
        onPointerEnter={() => setHover(key)}
        onPointerLeave={() => setHover(h => (h === key ? null : h))}
      >
        {hover === key && <span className="fx-tip fx-glass">{label}</span>}
        <button aria-label={label} onClick={onClick} className={bounce ? "fx-bounce" : undefined} style={{ width: s, height: s }}>
          {node(s)}
          {extra}
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
        item(id, APPS[id].name, s => APPS[id].icon(s), () => wm.launch(id), id === "finder" || wm.wins[id].open, wm.bounce === id)
      )}
      <span className="fx-dock-sep" />
      {minimized.map(id => (
        <Slot key={`m${id}`} id={id} wm={wm} />
      ))}
      <EntrySlot />
      {item("trash", "Trash", s => <img src="/icons/trash.png" width={s} height={s} alt="" draggable={false} style={{ display: "block" }} />)}
    </div>
  );
}

function Slot({ id, wm }: { id: AppId; wm: WM }) {
  const app = APPS[id];
  const box = useRef<HTMLDivElement>(null);
  const thumb = wm.thumbs[id];
  const tw = Math.round((BASE * app.w) / app.h);
  useEffect(() => {
    const el = box.current;
    if (!el || !thumb) return;
    thumb.removeAttribute("class");
    thumb.className = "fx-window";
    Object.assign(thumb.style, { position: "absolute", left: "0", top: "0", width: `${app.w}px`, height: `${app.h}px`, translate: "none", transform: `scale(${BASE / app.h})`, transformOrigin: "0 0", visibility: "visible", opacity: "1", pointerEvents: "none", margin: "0", animation: "none" });
    el.replaceChildren(thumb);
  }, [thumb, app.w, app.h]);
  return (
    <div className="fx-dock-item" style={{ width: tw, height: BASE }} data-min={id}>
      <div
        ref={el => {
          box.current = el;
          wm.slots.current[id] = el;
        }}
        className="fx-dock-thumb"
        style={{ width: tw, height: BASE, opacity: thumb ? 1 : 0 }}
      />
      <button aria-label={`Restore ${app.name}`} onClick={() => wm.restore(id)} className="fx-dock-thumb-hit">
        <span className="fx-dock-badge">{app.icon(22)}</span>
      </button>
    </div>
  );
}
